import { useState, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { GridHelper, Mesh } from "three";
import { OrbitControls } from "@react-three/drei";
import GUI from "../gui/GUI";
import { type PData } from "./Movimiento";
import {
  Axes,
  ParticleGroup,
  PhysicsUpdate,
  SmoothCameraFocus,
  type ForceDisplayMode,
  type LiveData,
} from "../Utils";

const Escenario: React.FC = () => {
  const [showGui, setShowGui] = useState(true);
  const [run, setRun] = useState(false);
  const [grav, setGrav] = useState(true);
  const [path, setPath] = useState(true);
  const [showAxes, setShowAxes] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showParticles, setShowParticles] = useState(false);
  const [particleRadius, setParticleRadius] = useState(0.15);
  const [dT, setDT] = useState(0.001);
  const [parts, setParts] = useState<PData[]>([]);
  const [focusTarget, setFocusTarget] = useState<
    [number, number, number] | null
  >(null);
  const [resetCamTick, setResetCamTick] = useState(0);
  const [friction, setFriction] = useState(0.2);
  const [forceMode, setForceMode] = useState<ForceDisplayMode>(1);
  const [showInfo, setShowInfo] = useState(false);

  const physicsRefs = useRef<Record<number, LiveData>>({});
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
      events: [],
    };
    physicsRefs.current[id] = {
      pos: [x, y, z],
      vel: [0, 0, 0],
      acc: [0, 0, 0], // Aceleración inicial para Velocity Verlet
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
        acc: [0, 0, 0], // Aceleración inicial para Velocity Verlet
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
        // Resetear eventos triggered
        events: p.events?.map(e => ({ ...e, triggered: false })) || [],
      }))
    );
  };

  // Marcar un evento como triggered
  const handleEventTriggered = (particleId: number, eventId: number) => {
    setParts((prev) =>
      prev.map((p) => {
        if (p.id === particleId) {
          return {
            ...p,
            events: p.events.map((e) =>
              e.id === eventId ? { ...e, triggered: true } : e
            ),
          };
        }
        return p;
      })
    );
  };

  // Actualizar partícula sin resetear posición (para eventos)
  const updateParticleFromEvent = (id: number, data: any) => {
    setParts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...data } : p))
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
            acc: [0, 0, 0], // Aceleración inicial para Velocity Verlet
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
          acc: [0, 0, 0], // Aceleración inicial para Velocity Verlet
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
        showGrid={showGrid}
        setShowGrid={setShowGrid}
        showParticles={showParticles}
        setShowParticles={setShowParticles}
        particleRadius={particleRadius}
        setParticleRadius={setParticleRadius}
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
        forceMode={forceMode}
        setForceMode={setForceMode}
        showInfo={showInfo}
        setShowInfo={setShowInfo}
        physicsRefs={physicsRefs}
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
        {showGrid && (
          <primitive
            object={new GridHelper(2000, 100, 0x444444, 0x222222)}
            position={[0, 0, 0]}
          />
        )}

        {showAxes && <Axes />}

        <PhysicsUpdate
          parts={parts}
          physicsRefs={physicsRefs}
          meshRefs={meshRefs}
          run={run}
          dT={dT}
          grav={grav}
          friction={friction}
          onPause={() => setRun(false)}
          onUpdateParticle={updateParticleFromEvent}
          onEventTriggered={handleEventTriggered}
        />

        {parts.map((p) => (
          <ParticleGroup
            key={p.id}
            p={p}
            path={path}
            physicsRefs={physicsRefs}
            meshRefs={meshRefs}
            run={run}
            forceMode={forceMode}
            gravity={grav}
            friction={friction}
            showInfo={showInfo}
            showParticles={showParticles}
            particleRadius={particleRadius}
          />
        ))}
        <OrbitControls makeDefault />
      </Canvas>
    </div>
  );
};

export default Escenario;
