import { useRef, useState, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Mesh, Group } from "three";
import TrailLine from "./TrailLine";
import Particula from "../Particula/Particula";
import ForceVisualizer, { type ForceDisplayMode } from "./ForceVisualizer";
import ParticleInfo from "./ParticleInfo";
import type { PData } from "../Particula/Movimiento";

interface LiveData {
  pos: [number, number, number];
  vel: [number, number, number];
  t: number;
  trail: [number, number, number][];
  frameCount: number;
}

interface ParticleGroupProps {
  p: PData;
  path: boolean;
  physicsRefs: MutableRefObject<Record<number, LiveData>>;
  meshRefs: MutableRefObject<Record<number, Mesh>>;
  run: boolean;
  forceMode: ForceDisplayMode;
  gravity: boolean;
  friction: number;
  collisibleGround: boolean;
  showInfo: boolean;
  showParticles: boolean;
  particleRadius: number;
}

const ParticleGroup: React.FC<ParticleGroupProps> = ({
  p,
  path,
  physicsRefs,
  meshRefs,
  forceMode,
  gravity,
  friction,
  collisibleGround,
  showInfo,
  showParticles,
  particleRadius,
}) => {
  const groupRef = useRef<Group>(null);
  const [, setTick] = useState(0);

  // El renderizado de este componente ahora es constante
  useFrame(() => {
    setTick((t) => t + 1);
  });

  const liveData = physicsRefs.current[p.id];
  if (!liveData) return null;

  return (
    <group ref={groupRef}>
      <Particula
        ref={(el) => {
          if (el) meshRefs.current[p.id] = el;
        }}
        posicion={[liveData.pos[1], liveData.pos[2], liveData.pos[0]]}
        color={p.color}
        radius={showParticles ? particleRadius : 0.001}
      />

      {path && liveData.trail.length > 1 && (
        <TrailLine points={liveData.trail} color={p.color} />
      )}

      <ForceVisualizer
        p={p}
        liveData={liveData}
        forceMode={forceMode}
        gravity={gravity}
        friction={friction}
        collisibleGround={collisibleGround}
      />

      <ParticleInfo
        p={p}
        liveData={liveData}
        showInfo={showInfo}
        gravity={gravity}
        friction={friction}
      />
    </group>
  );
};

export default ParticleGroup;
