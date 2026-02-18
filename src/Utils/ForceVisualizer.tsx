import { useMemo, type ReactElement } from "react";
import { Vector3, ArrowHelper } from "three";
import { evaluarFormula, type PData, type Force } from "../Particula/Movimiento";

interface LiveData {
  pos: [number, number, number];
  vel: [number, number, number];
  t: number;
  trail: [number, number, number][];
  frameCount: number;
}

// 0 = no mostrar, 1 = resultante, 2 = individuales
export type ForceDisplayMode = 0 | 1 | 2;

interface ForceVisualizerProps {
  p: PData;
  liveData: LiveData;
  forceMode: ForceDisplayMode;
  gravity: boolean;
  friction: number;
}

// Colores para diferentes fuerzas
const COLORS = {
  resultant: 0xffff00,  // Amarillo - fuerza resultante
  gravity: 0x00ff00,    // Verde - gravedad
  friction: 0xff00ff,   // Magenta - rozamiento
  applied: 0x00ffff,    // Cyan - fuerzas aplicadas
};

// Tamaño máximo de las flechas
const MAX_ARROW_LENGTH = 2;
const SCALE_FACTOR = 0.1;

// Función para calcular longitud de flecha con límite
const getArrowLength = (mag: number): number => {
  return Math.min(mag * SCALE_FACTOR, MAX_ARROW_LENGTH);
};

const ForceVisualizer: React.FC<ForceVisualizerProps> = ({
  p,
  liveData,
  forceMode,
  gravity,
  friction,
}) => {
  const origin = useMemo(() => new Vector3(), []);
  origin.set(liveData.pos[1], liveData.pos[2], liveData.pos[0]);

  if (forceMode === 0 || p.isMassless) return null;

  const g_val = gravity ? 9.80665 : 0;
  const m = p.mass || 0.001;

  // Calcular fuerzas aplicadas (definidas por el usuario)
  const appliedForces = p.forces.map((f: Force) => {
    const fx = evaluarFormula(f.vec[0], liveData.t, liveData.pos[0], liveData.pos[1], liveData.pos[2]);
    const fy = evaluarFormula(f.vec[1], liveData.t, liveData.pos[0], liveData.pos[1], liveData.pos[2]);
    const fz = evaluarFormula(f.vec[2], liveData.t, liveData.pos[0], liveData.pos[1], liveData.pos[2]);
    return { id: f.id, fx, fy, fz };
  });

  // Fuerza de gravedad: F = m * g (en dirección -z)
  const gravityForce = { fx: 0, fy: 0, fz: -m * g_val };

  // Calcular fuerza normal: suma de todas las fuerzas que empujan hacia abajo
  // Incluye gravedad y cualquier fuerza aplicada con componente -z
  let normalForce = m * g_val; // Peso
  appliedForces.forEach(f => {
    if (f.fz < 0) {
      normalForce += Math.abs(f.fz); // Fuerzas que empujan hacia abajo aumentan la normal
    }
  });

  // Fuerza de rozamiento - basada en la fuerza normal total
  let frictionForce = { fx: 0, fy: 0, fz: 0 };
  if (liveData.pos[2] <= 0.01 && friction > 0 && normalForce > 0) {
    const vx = liveData.vel[0];
    const vy = liveData.vel[1];
    const vHor = Math.hypot(vx, vy);
    const fricMag = friction * normalForce; // μ * N
    
    if (vHor > 1e-6) {
      // Rozamiento cinético: opuesto a la velocidad
      frictionForce = {
        fx: -fricMag * (vx / vHor),
        fy: -fricMag * (vy / vHor),
        fz: 0,
      };
    } else {
      // Rozamiento estático: opuesto a la suma de fuerzas horizontales aplicadas
      const totalAppliedFx = appliedForces.reduce((sum, f) => sum + f.fx, 0);
      const totalAppliedFy = appliedForces.reduce((sum, f) => sum + f.fy, 0);
      const appliedHorMag = Math.hypot(totalAppliedFx, totalAppliedFy);
      
      if (appliedHorMag > 1e-6) {
        // La fuerza estática contrarresta las fuerzas aplicadas (hasta el límite)
        const staticFricMag = Math.min(fricMag, appliedHorMag);
        frictionForce = {
          fx: -staticFricMag * (totalAppliedFx / appliedHorMag),
          fy: -staticFricMag * (totalAppliedFy / appliedHorMag),
          fz: 0,
        };
      }
    }
  }

  // Calcular fuerza resultante
  const resultant = {
    fx: appliedForces.reduce((sum, f) => sum + f.fx, 0) + gravityForce.fx + frictionForce.fx,
    fy: appliedForces.reduce((sum, f) => sum + f.fy, 0) + gravityForce.fy + frictionForce.fy,
    fz: appliedForces.reduce((sum, f) => sum + f.fz, 0) + gravityForce.fz + frictionForce.fz,
  };

  // Modo 1: Solo fuerza resultante
  if (forceMode === 1) {
    const mag = Math.sqrt(resultant.fx ** 2 + resultant.fy ** 2 + resultant.fz ** 2);
    if (mag < 0.01) return null;

    const arrowLen = getArrowLength(mag);
    const dir = new Vector3(resultant.fy, resultant.fz, resultant.fx).normalize();
    return (
      <primitive
        object={new ArrowHelper(dir, origin.clone(), arrowLen, COLORS.resultant, arrowLen * 0.25, arrowLen * 0.15)}
      />
    );
  }

  // Modo 2: Fuerzas individuales
  const arrows: ReactElement[] = [];

  // Flechas de fuerzas aplicadas
  appliedForces.forEach((f, idx) => {
    const mag = Math.sqrt(f.fx ** 2 + f.fy ** 2 + f.fz ** 2);
    if (mag >= 0.01) {
      const arrowLen = getArrowLength(mag);
      const dir = new Vector3(f.fy, f.fz, f.fx).normalize();
      arrows.push(
        <primitive
          key={`applied-${f.id || idx}`}
          object={new ArrowHelper(dir, origin.clone(), arrowLen, COLORS.applied, arrowLen * 0.25, arrowLen * 0.15)}
        />
      );
    }
  });

  // Flecha de gravedad
  const gravMag = Math.sqrt(gravityForce.fx ** 2 + gravityForce.fy ** 2 + gravityForce.fz ** 2);
  if (gravMag >= 0.01) {
    const arrowLen = getArrowLength(gravMag);
    const gravDir = new Vector3(gravityForce.fy, gravityForce.fz, gravityForce.fx).normalize();
    arrows.push(
      <primitive
        key="gravity"
        object={new ArrowHelper(gravDir, origin.clone(), arrowLen, COLORS.gravity, arrowLen * 0.25, arrowLen * 0.15)}
      />
    );
  }

  // Flecha de rozamiento
  const fricMag = Math.sqrt(frictionForce.fx ** 2 + frictionForce.fy ** 2 + frictionForce.fz ** 2);
  if (fricMag >= 0.01) {
    const arrowLen = getArrowLength(fricMag);
    const fricDir = new Vector3(frictionForce.fy, frictionForce.fz, frictionForce.fx).normalize();
    arrows.push(
      <primitive
        key="friction"
        object={new ArrowHelper(fricDir, origin.clone(), arrowLen, COLORS.friction, arrowLen * 0.25, arrowLen * 0.15)}
      />
    );
  }

  return <group>{arrows}</group>;
};

export default ForceVisualizer;
