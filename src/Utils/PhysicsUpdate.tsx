import { useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Mesh } from "three";
import { evaluarFormula, type PData, type EventCondition, type ParticleEvent } from "../Particula/Movimiento";

export interface LiveData {
  pos: [number, number, number];
  vel: [number, number, number];
  acc: [number, number, number]; // Aceleración del frame actual
  t: number;
  trail: [number, number, number][];
  frameCount: number;
}

interface PhysicsUpdateProps {
  parts: PData[];
  physicsRefs: MutableRefObject<Record<number, LiveData>>;
  meshRefs: MutableRefObject<Record<number, Mesh>>;
  run: boolean;
  physicsDt: number;
  timeScale: number;
  grav: boolean;
  friction: number;
  collisibleGround: boolean;
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
  physicsDt,
  timeScale,
  grav,
  friction,
  collisibleGround,
  onPause,
  onUpdateParticle,
  onEventTriggered,
}) => {
  const substepAccumulator = useRef(0);

  useFrame(() => {
    if (!run) return;
    const scale = Math.max(0, timeScale);
    if (scale === 0) return;

    substepAccumulator.current += scale;
    const steps = Math.floor(substepAccumulator.current);
    if (steps <= 0) return;
    substepAccumulator.current -= steps;

    const triggeredThisFrame = new Set<string>();

    for (let step = 0; step < steps; step++) {
      parts.forEach((p: PData) => {
        const live = physicsRefs.current[p.id];
        if (!live) return;
        const dt = physicsDt;
        const nt = live.t + dt;
        let posFinal: [number, number, number];
        let velFinal: [number, number, number] = [
          live.vel[0],
          live.vel[1],
          live.vel[2],
        ];
        let accNew: [number, number, number] = [0, 0, 0];

        if (p.isMassless) {
          const mode = p.kinematicMode ?? "position";
          const evalVec = (
            t: number,
            pos: [number, number, number]
          ): [number, number, number] => [
            evaluarFormula(p.fx, t, pos[0], pos[1], pos[2]),
            evaluarFormula(p.fy, t, pos[0], pos[1], pos[2]),
            evaluarFormula(p.fz, t, pos[0], pos[1], pos[2]),
          ];

          if (mode === "position") {
            posFinal = evalVec(nt, live.pos);
            velFinal = [
              (posFinal[0] - live.pos[0]) / dt,
              (posFinal[1] - live.pos[1]) / dt,
              (posFinal[2] - live.pos[2]) / dt,
            ];
            accNew = [
              (velFinal[0] - live.vel[0]) / dt,
              (velFinal[1] - live.vel[1]) / dt,
              (velFinal[2] - live.vel[2]) / dt,
            ];
          } else if (mode === "velocity") {
            const v1 = evalVec(live.t, live.pos);
            const pos2: [number, number, number] = [
              live.pos[0] + 0.5 * dt * v1[0],
              live.pos[1] + 0.5 * dt * v1[1],
              live.pos[2] + 0.5 * dt * v1[2],
            ];
            const v2 = evalVec(live.t + 0.5 * dt, pos2);

            const pos3: [number, number, number] = [
              live.pos[0] + 0.5 * dt * v2[0],
              live.pos[1] + 0.5 * dt * v2[1],
              live.pos[2] + 0.5 * dt * v2[2],
            ];
            const v3 = evalVec(live.t + 0.5 * dt, pos3);

            const pos4: [number, number, number] = [
              live.pos[0] + dt * v3[0],
              live.pos[1] + dt * v3[1],
              live.pos[2] + dt * v3[2],
            ];
            const v4 = evalVec(live.t + dt, pos4);

            posFinal = [
              live.pos[0] + (dt / 6) * (v1[0] + 2 * v2[0] + 2 * v3[0] + v4[0]),
              live.pos[1] + (dt / 6) * (v1[1] + 2 * v2[1] + 2 * v3[1] + v4[1]),
              live.pos[2] + (dt / 6) * (v1[2] + 2 * v2[2] + 2 * v3[2] + v4[2]),
            ];
            velFinal = evalVec(nt, posFinal);
            accNew = [
              (velFinal[0] - live.vel[0]) / dt,
              (velFinal[1] - live.vel[1]) / dt,
              (velFinal[2] - live.vel[2]) / dt,
            ];
          } else {
            const a1 = evalVec(live.t, live.pos);
            const k1Pos: [number, number, number] = [
              live.vel[0],
              live.vel[1],
              live.vel[2],
            ];
            const k1Vel = a1;

            const pos2: [number, number, number] = [
              live.pos[0] + 0.5 * dt * k1Pos[0],
              live.pos[1] + 0.5 * dt * k1Pos[1],
              live.pos[2] + 0.5 * dt * k1Pos[2],
            ];
            const vel2: [number, number, number] = [
              live.vel[0] + 0.5 * dt * k1Vel[0],
              live.vel[1] + 0.5 * dt * k1Vel[1],
              live.vel[2] + 0.5 * dt * k1Vel[2],
            ];
            const a2 = evalVec(live.t + 0.5 * dt, pos2);
            const k2Pos: [number, number, number] = [vel2[0], vel2[1], vel2[2]];
            const k2Vel = a2;

            const pos3: [number, number, number] = [
              live.pos[0] + 0.5 * dt * k2Pos[0],
              live.pos[1] + 0.5 * dt * k2Pos[1],
              live.pos[2] + 0.5 * dt * k2Pos[2],
            ];
            const vel3: [number, number, number] = [
              live.vel[0] + 0.5 * dt * k2Vel[0],
              live.vel[1] + 0.5 * dt * k2Vel[1],
              live.vel[2] + 0.5 * dt * k2Vel[2],
            ];
            const a3 = evalVec(live.t + 0.5 * dt, pos3);
            const k3Pos: [number, number, number] = [vel3[0], vel3[1], vel3[2]];
            const k3Vel = a3;

            const pos4: [number, number, number] = [
              live.pos[0] + dt * k3Pos[0],
              live.pos[1] + dt * k3Pos[1],
              live.pos[2] + dt * k3Pos[2],
            ];
            const vel4: [number, number, number] = [
              live.vel[0] + dt * k3Vel[0],
              live.vel[1] + dt * k3Vel[1],
              live.vel[2] + dt * k3Vel[2],
            ];
            const a4 = evalVec(live.t + dt, pos4);
            const k4Pos: [number, number, number] = [vel4[0], vel4[1], vel4[2]];
            const k4Vel = a4;

            posFinal = [
              live.pos[0] +
                (dt / 6) * (k1Pos[0] + 2 * k2Pos[0] + 2 * k3Pos[0] + k4Pos[0]),
              live.pos[1] +
                (dt / 6) * (k1Pos[1] + 2 * k2Pos[1] + 2 * k3Pos[1] + k4Pos[1]),
              live.pos[2] +
                (dt / 6) * (k1Pos[2] + 2 * k2Pos[2] + 2 * k3Pos[2] + k4Pos[2]),
            ];

            velFinal = [
              live.vel[0] +
                (dt / 6) * (k1Vel[0] + 2 * k2Vel[0] + 2 * k3Vel[0] + k4Vel[0]),
              live.vel[1] +
                (dt / 6) * (k1Vel[1] + 2 * k2Vel[1] + 2 * k3Vel[1] + k4Vel[1]),
              live.vel[2] +
                (dt / 6) * (k1Vel[2] + 2 * k2Vel[2] + 2 * k3Vel[2] + k4Vel[2]),
            ];
            accNew = evalVec(nt, posFinal);
          }
        } else {
          const g_val = grav ? 9.80665 : 0;
          const m = p.mass || 0.001;
          const peso = m * g_val;

          const computeSumF = (
            pos: [number, number, number],
            t: number
          ): [number, number, number] => {
            return p.forces.reduce(
              (acc, f) => {
                const fx = evaluarFormula(f.vec[0], t, pos[0], pos[1], pos[2]);
                const fy = evaluarFormula(f.vec[1], t, pos[0], pos[1], pos[2]);
                const fz = evaluarFormula(f.vec[2], t, pos[0], pos[1], pos[2]);
                return [acc[0] + fx, acc[1] + fy, acc[2] + fz];
              },
              [0, 0, 0]
            );
          };

          const computeAcceleration = (
            pos: [number, number, number],
            vel: [number, number, number],
            t: number
          ) => {
            const sumF = computeSumF(pos, t);
            const enSuelo = collisibleGround && pos[2] <= 0;
            let normal = 0;
            let friccionX = 0;
            let friccionY = 0;

            if (enSuelo) {
              const fuerzaNetoZ = sumF[2] - peso;
              normal = Math.abs(Math.min(0, fuerzaNetoZ));

              if (normal > 0 && friction > 0) {
                const friccionMax = friction * normal;
                const fuerzaHorizontal = Math.hypot(sumF[0], sumF[1]);
                const vHor = Math.hypot(vel[0], vel[1]);

                if (vHor > 1e-9) {
                  const dirX = vel[0] / vHor;
                  const dirY = vel[1] / vHor;
                  const friccionAplicada = Math.min(
                    friccionMax,
                    fuerzaHorizontal + (m * vHor) / dt
                  );
                  friccionX = -dirX * friccionAplicada;
                  friccionY = -dirY * friccionAplicada;
                } else if (fuerzaHorizontal > 1e-9) {
                  const dirFx = sumF[0] / fuerzaHorizontal;
                  const dirFy = sumF[1] / fuerzaHorizontal;
                  const friccionAplicada = Math.min(friccionMax, fuerzaHorizontal);
                  friccionX = -dirFx * friccionAplicada;
                  friccionY = -dirFy * friccionAplicada;
                }
              }
            }

            const fuerzaResultanteX = sumF[0] + friccionX;
            const fuerzaResultanteY = sumF[1] + friccionY;
            const fuerzaResultanteZ = sumF[2];

            const acc: [number, number, number] = [
              fuerzaResultanteX / m,
              fuerzaResultanteY / m,
              fuerzaResultanteZ / m - g_val,
            ];

            if (enSuelo && normal > 0) {
              acc[2] = Math.max(0, acc[2]);
            }

            return {
              acc,
              sumF,
              normal,
              friccionX,
              friccionY,
              enSuelo,
            };
          };

          const k1 = computeAcceleration(live.pos, live.vel, live.t);
          const k1Pos: [number, number, number] = [
            live.vel[0],
            live.vel[1],
            live.vel[2],
          ];
          const k1Vel = k1.acc;

          const pos2: [number, number, number] = [
            live.pos[0] + 0.5 * dt * k1Pos[0],
            live.pos[1] + 0.5 * dt * k1Pos[1],
            live.pos[2] + 0.5 * dt * k1Pos[2],
          ];
          const vel2: [number, number, number] = [
            live.vel[0] + 0.5 * dt * k1Vel[0],
            live.vel[1] + 0.5 * dt * k1Vel[1],
            live.vel[2] + 0.5 * dt * k1Vel[2],
          ];
          const k2 = computeAcceleration(pos2, vel2, live.t + 0.5 * dt);
          const k2Pos: [number, number, number] = [vel2[0], vel2[1], vel2[2]];
          const k2Vel = k2.acc;

          const pos3: [number, number, number] = [
            live.pos[0] + 0.5 * dt * k2Pos[0],
            live.pos[1] + 0.5 * dt * k2Pos[1],
            live.pos[2] + 0.5 * dt * k2Pos[2],
          ];
          const vel3: [number, number, number] = [
            live.vel[0] + 0.5 * dt * k2Vel[0],
            live.vel[1] + 0.5 * dt * k2Vel[1],
            live.vel[2] + 0.5 * dt * k2Vel[2],
          ];
          const k3 = computeAcceleration(pos3, vel3, live.t + 0.5 * dt);
          const k3Pos: [number, number, number] = [vel3[0], vel3[1], vel3[2]];
          const k3Vel = k3.acc;

          const pos4: [number, number, number] = [
            live.pos[0] + dt * k3Pos[0],
            live.pos[1] + dt * k3Pos[1],
            live.pos[2] + dt * k3Pos[2],
          ];
          const vel4: [number, number, number] = [
            live.vel[0] + dt * k3Vel[0],
            live.vel[1] + dt * k3Vel[1],
            live.vel[2] + dt * k3Vel[2],
          ];
          const k4 = computeAcceleration(pos4, vel4, live.t + dt);
          const k4Pos: [number, number, number] = [vel4[0], vel4[1], vel4[2]];
          const k4Vel = k4.acc;

          posFinal = [
            live.pos[0] +
              (dt / 6) * (k1Pos[0] + 2 * k2Pos[0] + 2 * k3Pos[0] + k4Pos[0]),
            live.pos[1] +
              (dt / 6) * (k1Pos[1] + 2 * k2Pos[1] + 2 * k3Pos[1] + k4Pos[1]),
            live.pos[2] +
              (dt / 6) * (k1Pos[2] + 2 * k2Pos[2] + 2 * k3Pos[2] + k4Pos[2]),
          ];

          velFinal = [
            live.vel[0] +
              (dt / 6) * (k1Vel[0] + 2 * k2Vel[0] + 2 * k3Vel[0] + k4Vel[0]),
            live.vel[1] +
              (dt / 6) * (k1Vel[1] + 2 * k2Vel[1] + 2 * k3Vel[1] + k4Vel[1]),
            live.vel[2] +
              (dt / 6) * (k1Vel[2] + 2 * k2Vel[2] + 2 * k3Vel[2] + k4Vel[2]),
          ];

          const finalForces = computeAcceleration(posFinal, velFinal, nt);
          accNew = finalForces.acc;

          if (finalForces.enSuelo && finalForces.normal > 0) {
            const vHorFinal = Math.hypot(velFinal[0], velFinal[1]);
            const fuerzaHorizontalNeta = Math.hypot(
              finalForces.sumF[0] + finalForces.friccionX,
              finalForces.sumF[1] + finalForces.friccionY
            );

            if (vHorFinal < 1e-6 && fuerzaHorizontalNeta < 1e-6) {
              velFinal[0] = 0;
              velFinal[1] = 0;
            }

            if (velFinal[2] < 0) {
              velFinal[2] = 0;
            }
          }
        }

        // Restricción del suelo (para partículas sin masa y casos límite)
        if (collisibleGround && posFinal[2] <= 0) {
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
            const eventKey = `${p.id}:${event.id}`;
            if (triggeredThisFrame.has(eventKey)) return;
            if (evaluateEvent(event, posFinal, velFinal, nt)) {
              triggeredThisFrame.add(eventKey);
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

        const TRAIL_EVERY = 8;
        const TRAIL_MAX = 60;
        if (live.frameCount % TRAIL_EVERY === 0) {
          live.trail = [
            ...live.trail,
            [posFinal[1], posFinal[2], posFinal[0]] as [number, number, number],
          ].slice(-TRAIL_MAX) as [number, number, number][];
        }
      });
    }

    parts.forEach((p: PData) => {
      const live = physicsRefs.current[p.id];
      if (!live) return;
      if (meshRefs.current[p.id]) {
        meshRefs.current[p.id].position.set(
          live.pos[1],
          live.pos[2],
          live.pos[0]
        );
      }
    });
  });
  return null;
};

export default PhysicsUpdate;
