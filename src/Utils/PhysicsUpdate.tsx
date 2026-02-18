import type { MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Mesh } from "three";
import { evaluarFormula, type PData, type EventCondition, type ParticleEvent } from "../Particula/Movimiento";

export interface LiveData {
  pos: [number, number, number];
  vel: [number, number, number];
  acc: [number, number, number]; // Aceleración del frame anterior (para Velocity Verlet)
  t: number;
  trail: [number, number, number][];
  frameCount: number;
}

interface PhysicsUpdateProps {
  parts: PData[];
  physicsRefs: MutableRefObject<Record<number, LiveData>>;
  meshRefs: MutableRefObject<Record<number, Mesh>>;
  run: boolean;
  dT: number;
  grav: boolean;
  friction: number;
  onPause: () => void;
  onUpdateParticle: (id: number, data: any) => void;
  onEventTriggered: (particleId: number, eventId: number) => void;
}

// Función para evaluar una condición
const evaluateCondition = (
  cond: EventCondition,
  pos: [number, number, number],
  vel: [number, number, number],
  t: number
): boolean => {
  let actualValue: number;
  
  switch (cond.variable) {
    case 'x': actualValue = pos[0]; break;
    case 'y': actualValue = pos[1]; break;
    case 'z': actualValue = pos[2]; break;
    case 't': actualValue = t; break;
    case 'vx': actualValue = vel[0]; break;
    case 'vy': actualValue = vel[1]; break;
    case 'vz': actualValue = vel[2]; break;
    case 'v': actualValue = Math.hypot(vel[0], vel[1], vel[2]); break;
    default: return false;
  }

  // Usar tolerancia para comparaciones de igualdad
  const tolerance = 0.01;
  
  switch (cond.operator) {
    case '==': return Math.abs(actualValue - cond.value) < tolerance;
    case '!=': return Math.abs(actualValue - cond.value) >= tolerance;
    case '>': return actualValue > cond.value;
    case '<': return actualValue < cond.value;
    case '>=': return actualValue >= cond.value;
    case '<=': return actualValue <= cond.value;
    default: return false;
  }
};

// Función para evaluar todas las condiciones de un evento
const evaluateEvent = (
  event: ParticleEvent,
  pos: [number, number, number],
  vel: [number, number, number],
  t: number
): boolean => {
  if (!event.enabled || event.triggered || event.conditions.length === 0) {
    return false;
  }

  const results = event.conditions.map(cond => evaluateCondition(cond, pos, vel, t));

  if (event.conditionLogic === 'AND') {
    return results.every(r => r);
  } else {
    return results.some(r => r);
  }
};

const PhysicsUpdate: React.FC<PhysicsUpdateProps> = ({
  parts,
  physicsRefs,
  meshRefs,
  run,
  dT,
  grav,
  friction,
  onPause,
  onUpdateParticle,
  onEventTriggered,
}) => {
  useFrame(() => {
    if (!run) return;
    parts.forEach((p: PData) => {
      const live = physicsRefs.current[p.id];
      if (!live) return;
      const nt = live.t + dT;
      const g_val = grav ? 9.80665 : 0;
      let posFinal: [number, number, number];
      let velFinal: [number, number, number] = [
        live.vel[0],
        live.vel[1],
        live.vel[2],
      ];
      let accNew: [number, number, number] = [0, 0, 0];

      if (p.isMassless) {
        const nx =
          p.p0_fis[0] +
          evaluarFormula(p.fx, nt, live.pos[0], live.pos[1], live.pos[2]) +
          p.v0_fis[0] * nt;
        const ny =
          p.p0_fis[1] +
          evaluarFormula(p.fy, nt, live.pos[0], live.pos[1], live.pos[2]) +
          p.v0_fis[1] * nt;
        const nz =
          p.p0_fis[2] +
          evaluarFormula(p.fz, nt, live.pos[0], live.pos[1], live.pos[2]) +
          p.v0_fis[2] * nt -
          0.5 * g_val * Math.pow(nt, 2);
        posFinal = [nx, ny, nz];
        // Para partículas sin masa, la aceleración se deriva de la trayectoria
        accNew = [0, 0, -g_val];
      } else {
        // ==============================
        // VELOCITY VERLET - PASO 1:
        // Actualización de Posición usando aceleración del frame anterior
        // r(t+dt) = r(t) + v(t)*dt + 0.5*a(t)*dt²
        // ==============================
        const accOld = live.acc; // Aceleración del frame anterior
        
        posFinal = [
          live.pos[0] + live.vel[0] * dT + 0.5 * accOld[0] * dT * dT,
          live.pos[1] + live.vel[1] * dT + 0.5 * accOld[1] * dT * dT,
          live.pos[2] + live.vel[2] * dT + 0.5 * accOld[2] * dT * dT,
        ];

        // ==============================
        // VELOCITY VERLET - PASO 2:
        // Cálculo de Nueva Aceleración en la nueva posición
        // a(t+dt) = F(r(t+dt)) / m
        // ==============================
        
        // Calcular suma de todas las fuerzas aplicadas en la NUEVA posición
        const sumF = p.forces.reduce(
          (acc, f) => {
            const fx = evaluarFormula(
              f.vec[0],
              nt, // tiempo nuevo
              posFinal[0], // posición nueva
              posFinal[1],
              posFinal[2]
            );
            const fy = evaluarFormula(
              f.vec[1],
              nt,
              posFinal[0],
              posFinal[1],
              posFinal[2]
            );
            const fz = evaluarFormula(
              f.vec[2],
              nt,
              posFinal[0],
              posFinal[1],
              posFinal[2]
            );
            return [acc[0] + fx, acc[1] + fy, acc[2] + fz];
          },
          [0, 0, 0]
        );

        const m = p.mass || 0.001;
        const peso = m * g_val; // Fuerza de gravedad (peso)

        // ===== CÁLCULO DE NORMAL Y ROZAMIENTO =====
        // La normal solo existe si el objeto está en el suelo (z = 0)
        const enSuelo = posFinal[2] <= 0;
        
        let normal = 0;
        let friccionX = 0;
        let friccionY = 0;

        if (enSuelo) {
          // Corregir posición al suelo
          posFinal[2] = 0;
          
          // Normal = |min(0, ΣFz - peso)|
          // Si ΣFz - peso < 0 → hay fuerza presionando contra el suelo → hay normal
          // Si ΣFz - peso >= 0 → el objeto está siendo elevado → no hay normal
          const fuerzaNetoZ = sumF[2] - peso;
          normal = Math.abs(Math.min(0, fuerzaNetoZ));

          if (normal > 0 && friction > 0) {
            // Fuerza de rozamiento máxima = μ * Normal
            const friccionMax = friction * normal;

            // Calcular la magnitud de las fuerzas aplicadas en el plano XY
            const fuerzaHorizontal = Math.hypot(sumF[0], sumF[1]);

            // Velocidad horizontal para determinar la dirección del rozamiento
            // Usamos la velocidad actual ya que aún no hemos calculado la nueva
            const vx = live.vel[0];
            const vy = live.vel[1];
            const vHor = Math.hypot(vx, vy);

            if (vHor > 1e-9) {
              // El objeto está en movimiento: rozamiento cinético
              // La fricción se opone a la velocidad
              const dirX = vx / vHor; // Dirección unitaria de la velocidad en X
              const dirY = vy / vHor; // Dirección unitaria de la velocidad en Y

              // Si la fuerza de rozamiento máxima es mayor que la fuerza aplicada
              // en la dirección del movimiento, el rozamiento iguala la fuerza
              // (el objeto desacelera hasta detenerse)
              // Si es menor, usamos el rozamiento máximo
              const friccionAplicada = Math.min(friccionMax, fuerzaHorizontal + m * vHor / dT);
              
              // Descomponer la fricción en X e Y (opuesta a la velocidad)
              friccionX = -dirX * friccionAplicada;
              friccionY = -dirY * friccionAplicada;
            } else if (fuerzaHorizontal > 1e-9) {
              // El objeto está en reposo pero hay fuerzas aplicadas: rozamiento estático
              // El rozamiento se opone a la fuerza aplicada
              const dirFx = sumF[0] / fuerzaHorizontal;
              const dirFy = sumF[1] / fuerzaHorizontal;

              // Si el rozamiento máximo es mayor que la fuerza aplicada,
              // el rozamiento cancela completamente la fuerza (no hay movimiento)
              // Si es menor, se usa el rozamiento máximo
              const friccionAplicada = Math.min(friccionMax, fuerzaHorizontal);

              friccionX = -dirFx * friccionAplicada;
              friccionY = -dirFy * friccionAplicada;
            }
          }
        }

        // Fuerza resultante = Fuerzas aplicadas + Rozamiento
        const fuerzaResultanteX = sumF[0] + friccionX;
        const fuerzaResultanteY = sumF[1] + friccionY;
        const fuerzaResultanteZ = sumF[2];

        // Nueva aceleración a(t+dt)
        accNew = [
          fuerzaResultanteX / m,
          fuerzaResultanteY / m,
          fuerzaResultanteZ / m - g_val,
        ];

        // Si está en el suelo y hay normal, la aceleración en z no puede ser negativa
        if (enSuelo && normal > 0) {
          accNew[2] = Math.max(0, accNew[2]);
        }

        // ==============================
        // VELOCITY VERLET - PASO 3:
        // Actualización de Velocidad usando promedio de aceleraciones
        // v(t+dt) = v(t) + 0.5*(a(t) + a(t+dt))*dt
        // ==============================
        velFinal = [
          live.vel[0] + 0.5 * (accOld[0] + accNew[0]) * dT,
          live.vel[1] + 0.5 * (accOld[1] + accNew[1]) * dT,
          live.vel[2] + 0.5 * (accOld[2] + accNew[2]) * dT,
        ];

        // Si está en el suelo y la velocidad es muy pequeña, detener completamente
        if (enSuelo && normal > 0) {
          const vHorFinal = Math.hypot(velFinal[0], velFinal[1]);
          const fuerzaHorizontalNeta = Math.hypot(fuerzaResultanteX, fuerzaResultanteY);
          
          // Si la velocidad resultante es muy pequeña y la fuerza de rozamiento
          // puede cancelar la fuerza aplicada, detener el objeto
          if (vHorFinal < 1e-6 && fuerzaHorizontalNeta < 1e-6) {
            velFinal[0] = 0;
            velFinal[1] = 0;
          }
          
          // La velocidad en z no puede ser negativa si está en el suelo
          if (velFinal[2] < 0) {
            velFinal[2] = 0;
          }
        }
      }

      // Restricción del suelo (para partículas sin masa y casos límite)
      if (posFinal[2] <= 0) {
        posFinal[2] = 0;
        if (velFinal[2] < 0) velFinal[2] = 0;
      }

      // Actualizar el estado de la partícula
      live.pos = posFinal;
      live.vel = velFinal;
      live.acc = accNew; // Guardar aceleración para el siguiente frame
      live.t = nt;
      live.frameCount++;

      // ===== EVALUACIÓN DE EVENTOS =====
      if (p.events && p.events.length > 0) {
        p.events.forEach((event) => {
          if (evaluateEvent(event, posFinal, velFinal, nt)) {
            // Marcar evento como disparado
            onEventTriggered(p.id, event.id);
            
            // Ejecutar acciones
            event.actions.forEach((action) => {
              switch (action.type) {
                case 'pause':
                  onPause();
                  break;
                case 'changeColor':
                  if (action.payload) {
                    onUpdateParticle(p.id, { color: action.payload });
                  }
                  break;
              }
            });
          }
        });
      }

      if (live.frameCount % 5 === 0) {
        live.trail = [
          ...live.trail,
          [posFinal[1], posFinal[2], posFinal[0]] as [number, number, number],
        ].slice(-200) as [number, number, number][];
      }
      if (meshRefs.current[p.id]) {
        meshRefs.current[p.id].position.set(
          posFinal[1],
          posFinal[2],
          posFinal[0]
        );
      }
    });
  });
  return null;
};

export default PhysicsUpdate;
