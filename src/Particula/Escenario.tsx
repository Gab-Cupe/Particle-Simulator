import { useState, useEffect, useRef, type MutableRefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Mesh, PerspectiveCamera } from "three";
import { OrbitControls } from "@react-three/drei";
import GUI from "../gui/GUI";
import { type PData } from "./Movimiento";
import {
  InfiniteGrid,
  ParticleGroup,
  PhysicsUpdate,
  SmoothCameraFocus,
  type ForceDisplayMode,
  type LiveData,
} from "../Utils";

const PHYSICS_DT = 0.01;

type CameraState = {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
};

const CameraStateSync: React.FC<{
  stateRef: MutableRefObject<CameraState | null>;
}> = ({ stateRef }) => {
  const { camera, controls } = useThree();

  useFrame(() => {
    const target = (controls as any)?.target;
    stateRef.current = {
      position: [camera.position.x, camera.position.y, camera.position.z],
      target: target
        ? [target.x, target.y, target.z]
        : [0, 0, 0],
      fov: camera instanceof PerspectiveCamera ? camera.fov : 75,
    };
  });

  return null;
};

const CameraStateApplier: React.FC<{
  preset: CameraState | null;
  tick: number;
}> = ({ preset, tick }) => {
  const { camera, controls } = useThree();

  useEffect(() => {
    if (!preset) return;
    camera.position.set(...preset.position);
    if (camera instanceof PerspectiveCamera) {
      camera.fov = preset.fov;
    }
    camera.updateProjectionMatrix();
    if ((controls as any)?.target) {
      (controls as any).target.set(...preset.target);
    }
    (controls as any)?.update?.();
  }, [camera, controls, preset, tick]);

  return null;
};

const Escenario: React.FC = () => {
  const [showGui, setShowGui] = useState(true);
  const [run, setRun] = useState(false);
  const [grav, setGrav] = useState(true);
  const [path, setPath] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showParticles, setShowParticles] = useState(false);
  const [particleRadius, setParticleRadius] = useState(0.15);
  const [timeScale, setTimeScale] = useState(1);
  const [parts, setParts] = useState<PData[]>([]);
  const [focusTarget, setFocusTarget] = useState<
    [number, number, number] | null
  >(null);
  const [resetCamTick, setResetCamTick] = useState(0);
  const [viewPreset, setViewPreset] = useState<{
    pos: [number, number, number];
    target: [number, number, number];
  } | null>(null);
  const [viewTick, setViewTick] = useState(0);
  const [cameraPreset, setCameraPreset] = useState<CameraState | null>(null);
  const [cameraPresetTick, setCameraPresetTick] = useState(0);
  const [friction, setFriction] = useState(0.2);
  const [forceMode, setForceMode] = useState<ForceDisplayMode>(1);
  const [showInfo, setShowInfo] = useState(false);
  const [collisibleGround, setCollisibleGround] = useState(true);

  const physicsRefs = useRef<Record<number, LiveData>>({});
  const meshRefs = useRef<Record<number, Mesh>>({});
  const cameraStateRef = useRef<CameraState | null>(null);

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
      kinematicMode: "position",
      trailWidth: 1,
      trailLength: 1,
      forces: [],
      events: [],
    };
    physicsRefs.current[id] = {
      pos: [x, y, z],
      vel: [0, 0, 0],
      acc: [0, 0, 0], // Aceleración inicial
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
        acc: [0, 0, 0], // Aceleración inicial
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
        color: p.color,
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
          const updateKeys = Object.keys(data ?? {});
          const resetExemptKeys = new Set(["events", "trailWidth", "trailLength"]);
          const shouldReset = updateKeys.some((key) => !resetExemptKeys.has(key));

          if (!shouldReset) {
            return { ...p, ...data };
          }

          const updated = { ...p, ...data, t: 0, enSuelo: false };
          physicsRefs.current[id] = {
            pos: updated.p0_fis,
            vel: updated.v0_fis,
            acc: [0, 0, 0], // Aceleración inicial
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
      const loadedScale =
        config.settings.timeScale ??
        (typeof config.settings.deltaT === "number"
          ? config.settings.deltaT / PHYSICS_DT
          : 1);
      const clampedScale = Math.min(4, Math.max(0.1, loadedScale));
      setTimeScale(clampedScale);
      setPath(config.settings.path ?? true);
      setCollisibleGround(config.settings.collisibleGround ?? true);
      setShowGrid(config.settings.showGrid ?? true);
      setShowParticles(config.settings.showParticles ?? false);
      const loadedRadius = config.settings.particleRadius ?? 0.15;
      setParticleRadius(Math.min(3, Math.max(0.1, loadedRadius)));
      const loadedForceMode = config.settings.forceMode;
      setForceMode(loadedForceMode === 0 || loadedForceMode === 1 || loadedForceMode === 2 ? loadedForceMode : 1);
      setShowInfo(config.settings.showInfo ?? false);
      if (config.settings.camera) {
        const cam = config.settings.camera;
        if (cam.position && cam.target && typeof cam.fov === "number") {
          setCameraPreset({
            position: [cam.position[0], cam.position[1], cam.position[2]],
            target: [cam.target[0], cam.target[1], cam.target[2]],
            fov: cam.fov,
          });
          setCameraPresetTick((tick) => tick + 1);
        }
      }
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
          kinematicMode: p.kinematicMode ?? "position",
          trailWidth: p.trailWidth ?? 1,
          trailLength: p.trailLength ?? 1,
        };
        
        physicsRefs.current[newId] = {
          pos: [p.p0_fis[0], p.p0_fis[1], p.p0_fis[2]] as [number, number, number],
          vel: [p.v0_fis[0], p.v0_fis[1], p.v0_fis[2]] as [number, number, number],
          acc: [0, 0, 0], // Aceleración inicial
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

  const handleViewPreset = (
    preset: "iso" | "+x" | "+y" | "+z" | "-x" | "-y" | "-z"
  ) => {
    const target: [number, number, number] = [0, 0, 0];
    const distance = 60;
    const height = 20;
    let pos: [number, number, number];

    switch (preset) {
      case "iso":
        pos = [distance, distance * 0.8, distance];
        break;
      case "+x":
        pos = [distance, height, 0];
        break;
      case "-x":
        pos = [-distance, height, 0];
        break;
      case "+y":
        pos = [0, distance, 0];
        break;
      case "-y":
        pos = [0, -distance, 0];
        break;
      case "+z":
        pos = [0, height, distance];
        break;
      case "-z":
        pos = [0, height, -distance];
        break;
      default:
        pos = [distance, distance * 0.8, distance];
        break;
    }

    setFocusTarget(null);
    setViewPreset({ pos, target });
    setViewTick((tick) => tick + 1);
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
        onViewPreset={handleViewPreset}
        getCameraState={() => cameraStateRef.current}
        friction={friction}
        setFriction={setFriction}
        timeScale={timeScale}
        setTimeScale={setTimeScale}
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
        collisibleGround={collisibleGround}
        setCollisibleGround={setCollisibleGround}
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
          viewPos={viewPreset?.pos ?? null}
          viewTarget={viewPreset?.target ?? null}
          viewTick={viewTick}
        />
        <CameraStateApplier preset={cameraPreset} tick={cameraPresetTick} />
        <CameraStateSync stateRef={cameraStateRef} />
        <InfiniteGrid showGrid={showGrid} />

        <PhysicsUpdate
          parts={parts}
          physicsRefs={physicsRefs}
          meshRefs={meshRefs}
          run={run}
          physicsDt={PHYSICS_DT}
          timeScale={timeScale}
          grav={grav}
          friction={friction}
          collisibleGround={collisibleGround}
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
            collisibleGround={collisibleGround}
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
