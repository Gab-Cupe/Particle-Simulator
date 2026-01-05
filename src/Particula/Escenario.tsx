import { useState, useEffect, useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { GridHelper, Vector3, ArrowHelper, Mesh, Group } from "three";
import { OrbitControls, Line } from "@react-three/drei";
import GUI from "../gui/GUI";
import Particula from "./Particula";
import { evaluarFormula, type PData } from "./Movimiento";

const Escenario: React.FC = () => {
  const [showGui, setShowGui] = useState(true);
  const [run, setRun] = useState(false);
  const [grav, setGrav] = useState(true);
  const [path, setPath] = useState(true);
  const [showAxes, setShowAxes] = useState(true);
  const [dT, setDT] = useState(0.01);
  const [parts, setParts] = useState<PData[]>([]);
  const [focusTarget, setFocusTarget] = useState<
    [number, number, number] | null
  >(null);
  const [resetCamTick, setResetCamTick] = useState(0);
  const [friction, setFriction] = useState(0.2);

  const physicsRefs = useRef<
    Record<
      number,
      {
        pos: [number, number, number];
        vel: [number, number, number];
        t: number;
        trail: [number, number, number][];
        frameCount: number;
      }
    >
  >({});
  const meshRefs = useRef<Record<number, Mesh>>({});

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        e.preventDefault();
        setShowGui((s) => !s);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const addParticle = (x: number, y: number, z: number) => {
    const id = Date.now();
    const randomColor = `#${Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, "0")}`;
    const nueva: PData = {
      id,
      p0_fis: [x, y, z],
      v0_fis: [0, 0, 0],
      a0_fis: [0, 0, 0],
      fx: "0",
      fy: "0",
      fz: "0",
      curr_fis: [x, y, z],
      curr_vel: [0, 0, 0],
      t: 0,
      trail_three: [[y, z, x]],
      enSuelo: false,
      color: randomColor,
      mass: 1,
      isMassless: true,
      forces: [],
    };
    physicsRefs.current[id] = {
      pos: [x, y, z],
      vel: [0, 0, 0],
      t: 0,
      trail: [[y, z, x]],
      frameCount: 0,
    };
    setParts([...parts, nueva]);
  };

  const handleReset = () => {
    setRun(false);
    parts.forEach((p) => {
      physicsRefs.current[p.id] = {
        pos: [...p.p0_fis],
        vel: [...p.v0_fis],
        t: 0,
        trail: [[p.p0_fis[1], p.p0_fis[2], p.p0_fis[0]]],
        frameCount: 0,
      };
      if (meshRefs.current[p.id])
        meshRefs.current[p.id].position.set(
          p.p0_fis[1],
          p.p0_fis[2],
          p.p0_fis[0]
        );
    });
    setParts((prev) =>
      prev.map((p) => ({
        ...p,
        t: 0,
        enSuelo: false,
        trail_three: [[p.p0_fis[1], p.p0_fis[2], p.p0_fis[0]]],
      }))
    );
  };

  const updateParticle = (id: number, data: any) => {
    setParts((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const updated = { ...p, ...data, t: 0, enSuelo: false };
          physicsRefs.current[id] = {
            pos: updated.p0_fis,
            vel: updated.v0_fis,
            t: 0,
            trail: [[updated.p0_fis[1], updated.p0_fis[2], updated.p0_fis[0]]],
            frameCount: 0,
          };
          return updated;
        }
        return p;
      })
    );
  };

  // Cargar configuración desde JSON
  const handleLoadConfig = (config: any) => {
    // Aplicar configuración global
    if (config.settings) {
      setGrav(config.settings.gravity ?? true);
      setFriction(config.settings.friction ?? 0.2);
      setDT(config.settings.deltaT ?? 0.01);
      setPath(config.settings.path ?? true);
      setShowAxes(config.settings.axes ?? true);
    }

    // Cargar partículas
    if (config.particulas && Array.isArray(config.particulas)) {
      // Limpiar refs existentes
      Object.keys(physicsRefs.current).forEach((key) => {
        delete physicsRefs.current[Number(key)];
      });
      Object.keys(meshRefs.current).forEach((key) => {
        delete meshRefs.current[Number(key)];
      });

      // Crear nuevas partículas con IDs únicos
      const nuevasParticulas = config.particulas.map((p: any) => {
        const newId = Date.now() + Math.random() * 1000;
        const newPart = {
          ...p,
          id: newId,
          t: 0,
          enSuelo: false,
          trail_three: [[p.p0_fis[1], p.p0_fis[2], p.p0_fis[0]]],
        };
        
        physicsRefs.current[newId] = {
          pos: [p.p0_fis[0], p.p0_fis[1], p.p0_fis[2]] as [number, number, number],
          vel: [p.v0_fis[0], p.v0_fis[1], p.v0_fis[2]] as [number, number, number],
          t: 0,
          trail: [[p.p0_fis[1], p.p0_fis[2], p.p0_fis[0]]],
          frameCount: 0,
        };
        
        return newPart;
      });

      setParts(nuevasParticulas);
    }

    setRun(false);
  };

  return (
    <div style={{ height: "100vh", position: "relative", overflow: "hidden" }}>
      <GUI
        isVisible={showGui}
        isRunning={run}
        onPlay={setRun}
        gravity={grav}
        onGravity={setGrav}
        path={path}
        onTogglePath={setPath}
        axes={showAxes}
        onToggleAxes={setShowAxes}
        onFocus={(part) => {
          const live = physicsRefs.current[part.id];
          if (live) setFocusTarget([live.pos[1], live.pos[2], live.pos[0]]);
        }}
        onResetCamera={() => setResetCamTick((n) => n + 1)}
        friction={friction}
        setFriction={setFriction}
        deltaT={dT}
        setDeltaT={setDT}
        onReset={handleReset}
        onAdd={addParticle}
        particulas={parts}
        onUpdatePart={updateParticle}
        onDelete={(id) => {
          setParts(parts.filter((p) => p.id !== id));
          delete physicsRefs.current[id];
          delete meshRefs.current[id];
        }}
        onLoadConfig={handleLoadConfig}
      />

      <Canvas camera={{ position: [50, 50, 50], far: 10000 }}>
        <color attach="background" args={["#050505"]} />
        <ambientLight intensity={0.5} />
        <pointLight position={[15, 15, 15]} intensity={1.5} />

        <SmoothCameraFocus
          target={focusTarget}
          resetTick={resetCamTick}
          defaultCamPos={[50, 50, 50]}
        />
        <primitive
          object={new GridHelper(2000, 100, 0x444444, 0x222222)}
          position={[0, 0, 0]}
        />

        {showAxes && (
          <group>
            <mesh position={[0, 0, 0]}>
              <cylinderGeometry args={[0.1, 0.1, 2000]} />
              <meshBasicMaterial color="red" />
            </mesh>
            <mesh position={[1000, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <coneGeometry args={[0.4, 1.5, 8]} />
              <meshBasicMaterial color="red" />
            </mesh>
            <mesh position={[-1000, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
              <coneGeometry args={[0.4, 1.5, 8]} />
              <meshBasicMaterial color="red" />
            </mesh>
            <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.1, 0.1, 2000]} />
              <meshBasicMaterial color="green" />
            </mesh>
            <mesh position={[0, 1000, 0]}>
              <coneGeometry args={[0.4, 1.5, 8]} />
              <meshBasicMaterial color="green" />
            </mesh>
            <mesh position={[0, -1000, 0]} rotation={[Math.PI, 0, 0]}>
              <coneGeometry args={[0.4, 1.5, 8]} />
              <meshBasicMaterial color="green" />
            </mesh>
            <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.1, 0.1, 2000]} />
              <meshBasicMaterial color="blue" />
            </mesh>
            <mesh position={[0, 0, 1000]} rotation={[0, 0, Math.PI / 2]}>
              <coneGeometry args={[0.4, 1.5, 8]} />
              <meshBasicMaterial color="blue" />
            </mesh>
            <mesh position={[0, 0, -1000]} rotation={[0, 0, -Math.PI / 2]}>
              <coneGeometry args={[0.4, 1.5, 8]} />
              <meshBasicMaterial color="blue" />
            </mesh>
          </group>
        )}

        <PhysicsUpdate
          parts={parts}
          physicsRefs={physicsRefs}
          meshRefs={meshRefs}
          run={run}
          dT={dT}
          grav={grav}
          friction={friction}
        />

        {parts.map((p) => (
          <ParticleGroup
            key={p.id}
            p={p}
            path={path}
            physicsRefs={physicsRefs}
            meshRefs={meshRefs}
            run={run}
          />
        ))}
        <OrbitControls makeDefault />
      </Canvas>
    </div>
  );
};

const ParticleGroup = ({ p, path, physicsRefs, meshRefs}: any) => {
  const groupRef = useRef<Group>(null);
  const [, setTick] = useState(0);

  // El renderizado de este componente ahora es constante :D chao 5.3gb de consumo de ram
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
      />

      {path && liveData.trail.length > 1 && (
        <Line
          points={liveData.trail}
          color={p.color}
          lineWidth={1.5}
          transparent
          opacity={0.6}
        />
      )}

      {!p.isMassless &&
        p.forces.map((f: any) => (
          <ForceArrow key={f.id} f={f} liveData={liveData} />
        ))}
    </group>
  );
};

// Sub-componente para la flecha de fuerza
const ForceArrow = ({ f, liveData }: any) => {
  const fx = evaluarFormula(
    f.vec[0],
    liveData.t,
    liveData.pos[0],
    liveData.pos[1],
    liveData.pos[2]
  );
  const fy = evaluarFormula(
    f.vec[1],
    liveData.t,
    liveData.pos[0],
    liveData.pos[1],
    liveData.pos[2]
  );
  const fz = evaluarFormula(
    f.vec[2],
    liveData.t,
    liveData.pos[0],
    liveData.pos[1],
    liveData.pos[2]
  );

  const mag = Math.sqrt(fx ** 2 + fy ** 2 + fz ** 2);
  const dir = useMemo(() => new Vector3(), []);
  const origin = useMemo(() => new Vector3(), []);

  if (mag < 0.01) return null;

  dir.set(fy, fz, fx).normalize();
  origin.set(liveData.pos[1], liveData.pos[2], liveData.pos[0]);

  return (
    <primitive
      object={new ArrowHelper(dir, origin, mag * 0.2, 0xffff00)}
      onUpdate={(self: any) => self.setDirection(dir)}
    />
  );
};

const PhysicsUpdate = ({
  parts,
  physicsRefs,
  meshRefs,
  run,
  dT,
  grav,
  friction,
}: any) => {
  useFrame(() => {
    if (!run) return;
    parts.forEach((p: PData) => {
      const live = physicsRefs.current[p.id];
      if (!live) return;
      const nt = live.t + dT;
      const g_val = grav ? 9.80665 : 0;
      let posFinal: [number, number, number];
      let velFinal: [number, number, number] = [live.vel[0], live.vel[1], live.vel[2]];

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
      } else {
        const sumF = p.forces.reduce(
          (acc, f) => {
            const fx = evaluarFormula(
              f.vec[0],
              live.t,
              live.pos[0],
              live.pos[1],
              live.pos[2]
            );
            const fy = evaluarFormula(
              f.vec[1],
              live.t,
              live.pos[0],
              live.pos[1],
              live.pos[2]
            );
            const fz = evaluarFormula(
              f.vec[2],
              live.t,
              live.pos[0],
              live.pos[1],
              live.pos[2]
            );
            return [acc[0] + fx, acc[1] + fy, acc[2] + fz];
          },
          [0, 0, 0]
        );
        const m = p.mass || 0.001;
        const ax = sumF[0] / m;
        const ay = sumF[1] / m;
        const az = sumF[2] / m - g_val;
        velFinal = [
          live.vel[0] + ax * dT,
          live.vel[1] + ay * dT,
          live.vel[2] + az * dT,
        ];
        posFinal = [
          live.pos[0] + velFinal[0] * dT,
          live.pos[1] + velFinal[1] * dT,
          live.pos[2] + velFinal[2] * dT,
        ];
      }

      if (posFinal[2] <= 0) {
        posFinal[2] = 0;
        if (velFinal[2] < 0) velFinal[2] = 0;
        const vHor = Math.hypot(velFinal[0], velFinal[1]);
        if (vHor > 1e-6) {
          const fricDecel = Math.max(0, friction) * g_val;
          const newVHor = Math.max(0, vHor - fricDecel * dT);
          const scale = newVHor / vHor;
          velFinal[0] *= scale;
          velFinal[1] *= scale;
        }
      }
      live.pos = posFinal;
      live.vel = velFinal;
      live.t = nt;
      live.frameCount++;
      if (live.frameCount % 5 === 0) {
        live.trail = [
          ...live.trail,
          [posFinal[1], posFinal[2], posFinal[0]],
        ].slice(-200);
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

const SmoothCameraFocus = ({ target, resetTick, defaultCamPos }: any) => {
  const animRef = useRef<any>(null);
  const pendingFocusRef = useRef(false);
  const pendingResetRef = useRef(false);
  const launchAnim = (state: any, opts: any) => {
    const cam = state.camera;
    const controls = (state.controls as any) || null;
    const currTarget = controls?.target || new Vector3();
    const currPos = cam.position.clone();
    const startPos = currPos.clone();
    const startTarget = currTarget.clone();
    let endTarget, endPos;
    if (opts.type === "reset") {
      endTarget = new Vector3(0, 0, 0);
      endPos = new Vector3(...defaultCamPos);
    } else {
      endTarget = new Vector3(...opts.target);
      const offset = currPos.clone().sub(currTarget);
      const dir =
        offset.length() > 0.0001
          ? offset.clone().normalize()
          : new Vector3(0, 1, 0);
      endPos = endTarget.clone().add(dir.multiplyScalar(12));
    }
    animRef.current = {
      startPos,
      startTarget,
      endPos,
      endTarget,
      startTime: performance.now(),
      duration: 450,
    };
  };
  useEffect(() => {
    pendingFocusRef.current = !!target;
    animRef.current = null;
  }, [target]);
  const resetTickRef = useRef(resetTick);
  useEffect(() => {
    if (resetTick === resetTickRef.current) return;
    resetTickRef.current = resetTick;
    pendingResetRef.current = true;
    animRef.current = null;
  }, [resetTick]);
  useFrame((state) => {
    if (target && pendingFocusRef.current && !animRef.current) {
      launchAnim(state, { type: "focus", target });
      pendingFocusRef.current = false;
    }
    if (
      pendingResetRef.current &&
      resetTickRef.current === resetTick &&
      !target &&
      !animRef.current
    ) {
      if (resetTick > 0) {
        launchAnim(state, { type: "reset" });
        pendingResetRef.current = false;
      }
    }
    const anim = animRef.current;
    if (!anim) return;
    const now = performance.now();
    const t = Math.min(1, (now - anim.startTime) / anim.duration);
    state.camera.position.lerpVectors(anim.startPos, anim.endPos, t);
    const newTarget = anim.startTarget.clone().lerp(anim.endTarget, t);
    if ((state.controls as any)?.target)
      (state.controls as any).target.copy(newTarget);
    (state.controls as any)?.update?.();
    if (t >= 1) animRef.current = null;
  });
  return null;
};

export default Escenario;
