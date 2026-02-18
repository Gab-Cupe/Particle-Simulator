import { useState, useEffect, useRef, type MutableRefObject } from "react";
import "./stylesGui.css";
import type { PData } from "../Particula/Movimiento";
import ParticleEditor from "./ParticleEditor";
import InfoPanel from "./InfoPanel";
import type { ForceDisplayMode } from "../Utils";

interface LiveData {
  pos: [number, number, number];
  vel: [number, number, number];
  t: number;
  trail: [number, number, number][];
  frameCount: number;
}

// Interfaz para la configuración guardada
interface SavedConfig {
  version: string;
  timestamp: string;
  settings: {
    gravity: boolean;
    friction: number;
    deltaT: number;
    path: boolean;
    axes: boolean;
  };
  particulas: PData[];
}

interface GUIProps {
  isVisible: boolean;
  onAdd: (x: number, y: number, z: number) => void;
  onPlay: (val: boolean) => void;
  onReset: () => void;
  onGravity: (val: boolean) => void;
  onTogglePath: (val: boolean) => void;
  onToggleAxes: (val: boolean) => void;
  onFocus: (part: PData) => void;
  onResetCamera: () => void;
  friction: number;
  setFriction: (v: number) => void;
  deltaT: number;
  setDeltaT: (v: number) => void;
  isRunning: boolean;
  gravity: boolean;
  path: boolean;
  axes: boolean;
  showGrid: boolean;
  setShowGrid: (val: boolean) => void;
  showParticles: boolean;
  setShowParticles: (val: boolean) => void;
  particleRadius: number;
  setParticleRadius: (v: number) => void;
  particulas: PData[];
  onUpdatePart: (id: number, data: any) => void;
  onDelete: (id: number) => void;
  onLoadConfig?: (config: SavedConfig) => void;
  forceMode: ForceDisplayMode;
  setForceMode: (mode: ForceDisplayMode) => void;
  showInfo: boolean;
  setShowInfo: (val: boolean) => void;
  physicsRefs: MutableRefObject<Record<number, LiveData>>;
}

const GUI: React.FC<GUIProps> = (p) => {
  const [selId, setSelId] = useState<number | null>(null);
  const [nX, setNX] = useState(10);
  const [nY, setNY] = useState(10);
  const [nZ, setNZ] = useState(10);
  
  // Estados para secciones colapsables
  const [openSections, setOpenSections] = useState({
    controls: true,
    environment: true,
    addParticle: false,
    particles: true,
    config: true,
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sel = p.particulas.find((part) => part.id === selId);

  useEffect(() => {
    if (selId !== null) p.onPlay(false);
  }, [selId]);

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Guardar configuración
  const handleSaveConfig = () => {
    const config: SavedConfig = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      settings: {
        gravity: p.gravity,
        friction: p.friction,
        deltaT: p.deltaT,
        path: p.path,
        axes: p.axes,
      },
      particulas: p.particulas,
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `physics-config-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Cargar configuración
  const handleLoadConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const config: SavedConfig = JSON.parse(event.target?.result as string);
        if (p.onLoadConfig) {
          p.onLoadConfig(config);
        }
      } catch (err) {
        alert("Error loading configuration file");
      }
    };
    reader.readAsText(file);
    // Reset input para permitir cargar el mismo archivo
    e.target.value = "";
  };

  // Cargar ejemplo desde default.json
  const handleLoadExample = async () => {
    try {
      const response = await fetch('/default.json');
      const config: SavedConfig = await response.json();
      if (p.onLoadConfig) {
        p.onLoadConfig(config);
      }
    } catch (err) {
      alert("Error loading example");
    }
  };

  if (!p.isVisible) return null;

  return (
    <div className="gui-wrapper">
      <div className="panel-derecho">
        <h3>SIMULATOR</h3>
        
        {/* Botones Guardar/Cargar */}
        <div className="config-buttons">
          <button className="btn-save" onClick={handleSaveConfig}>
            SAVE
          </button>
          <button className="btn-load" onClick={() => fileInputRef.current?.click()}>
            LOAD
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleLoadConfig}
            className="hidden-input"
          />
        </div>
        <button className="btn-example" onClick={handleLoadExample}>
          VIEW EXAMPLE
        </button>

        {/* Section: Controls */}
        <div className="section">
          <div className="section-header" onClick={() => toggleSection('controls')}>
            <h4>Controls</h4>
            <span className={`toggle-icon ${openSections.controls ? 'open' : ''}`}>▼</span>
          </div>
          {openSections.controls && (
            <div className="section-content">
              <div className="button-grid">
                <button
                  className={p.isRunning ? "btn-pause" : "btn-play"}
                  onClick={() => p.onPlay(!p.isRunning)}
                >
                  {p.isRunning ? "PAUSE" : "START"}
                </button>
                <button onClick={p.onReset} style={{ background: "#666" }}>
                  RESET
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Section: Environment */}
        <div className="section">
          <div className="section-header" onClick={() => toggleSection('environment')}>
            <h4>Environment</h4>
            <span className={`toggle-icon ${openSections.environment ? 'open' : ''}`}>▼</span>
          </div>
          {openSections.environment && (
            <div className="section-content">
              <div className="button-grid">
                <button onClick={() => p.onGravity(!p.gravity)}>
                  Gravity: {p.gravity ? "ON" : "OFF"}
                </button>
                <button onClick={() => p.onTogglePath(!p.path)}>
                  Trail: {p.path ? "ON" : "OFF"}
                </button>
                <button onClick={() => p.onToggleAxes(!p.axes)}>
                  Axes: {p.axes ? "ON" : "OFF"}
                </button>
                <button onClick={() => p.setShowGrid(!p.showGrid)}>
                  Grid: {p.showGrid ? "ON" : "OFF"}
                </button>
                <button onClick={() => p.setShowParticles(!p.showParticles)}>
                  Particles: {p.showParticles ? "ON" : "OFF"}
                </button>
                <button onClick={p.onResetCamera} style={{ background: "#555" }}>
                  Reset Camera
                </button>
              </div>
              {p.showParticles && (
                <>
                  <label>Particle Size: {p.particleRadius.toFixed(2)}</label>
                  <input
                    type="range"
                    min="0.1"
                    max="3"
                    step="0.1"
                    value={p.particleRadius}
                    onChange={(e) => p.setParticleRadius(Number(e.target.value))}
                  />
                </>
              )}
              <hr />
              <label>Forces Display</label>
              <button
                onClick={() => p.setForceMode(((p.forceMode + 1) % 3) as 0 | 1 | 2)}
                style={{
                  background: p.forceMode === 0 ? "#666" : p.forceMode === 1 ? "#ff6b6b" : "#4ecdc4",
                  color: "#fff",
                  marginBottom: "10px",
                }}
              >
                {p.forceMode === 0 ? "Forces: OFF" : p.forceMode === 1 ? "Forces: RESULTANT" : "Forces: INDIVIDUAL"}
              </button>
              <button
                onClick={() => p.setShowInfo(!p.showInfo)}
                style={{
                  background: p.showInfo ? "#ffc107" : "#666",
                  color: p.showInfo ? "#000" : "#fff",
                  marginBottom: "10px",
                }}
              >
                {p.showInfo ? "Info: ON" : "Info: OFF"}
              </button>
              <hr />
              <label>Ground Friction: {p.friction.toFixed(2)}</label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.01"
                value={p.friction}
                onChange={(e) => p.setFriction(Number(e.target.value))}
              />
              <label>Delta T: {p.deltaT}</label>
              <input
                type="range"
                min="0.001"
                max="0.1"
                step="0.001"
                value={p.deltaT}
                onChange={(e) => p.setDeltaT(Number(e.target.value))}
              />
            </div>
          )}
        </div>

        {/* Section: New Particle */}
        <div className="section">
          <div className="section-header" onClick={() => toggleSection('addParticle')}>
            <h4>New Particle</h4>
            <span className={`toggle-icon ${openSections.addParticle ? 'open' : ''}`}>▼</span>
          </div>
          {openSections.addParticle && (
            <div className="section-content">
              <div style={{ display: "flex", gap: 4 }}>
                <input
                  type="number"
                  placeholder="X"
                  value={nX}
                  onChange={(e) => setNX(Number(e.target.value))}
                />
                <input
                  type="number"
                  placeholder="Y"
                  value={nY}
                  onChange={(e) => setNY(Number(e.target.value))}
                />
                <input
                  type="number"
                  placeholder="Z"
                  value={nZ}
                  onChange={(e) => setNZ(Number(e.target.value))}
                />
              </div>
              <button className="btn-play" onClick={() => p.onAdd(nX, nY, nZ)}>
                + ADD PARTICLE
              </button>
            </div>
          )}
        </div>

        {/* Section: Particle List */}
        <div className="section">
          <div className="section-header" onClick={() => toggleSection('particles')}>
            <h4>Particles ({p.particulas.length})</h4>
            <span className={`toggle-icon ${openSections.particles ? 'open' : ''}`}>▼</span>
          </div>
          {openSections.particles && (
            <div className="section-content">
              <div className="lista-particulas">
                {p.particulas.map((part) => (
                  <div
                    key={part.id}
                    className="particle-item"
                    onClick={(e) => {
                      if (e.shiftKey) {
                        p.onResetCamera();
                        return;
                      }
                      setSelId(part.id);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      p.onFocus(part);
                    }}
                    style={{ color: selId === part.id ? "#fff" : part.color }}
                  >
                    <span>
                      P-{part.id.toString().slice(-3)}{" "}
                      {part.enSuelo ? "(Ground)" : ""}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        p.onDelete(part.id);
                        if (selId === part.id) setSelId(null);
                      }}
                      className="btn-delete"
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {sel && (
        <ParticleEditor
          sel={sel}
          onUpdatePart={p.onUpdatePart}
          onClose={() => setSelId(null)}
        />
      )}

      {/* Panel de información a la izquierda */}
      <InfoPanel
        particulas={p.particulas}
        physicsRefs={p.physicsRefs}
        gravity={p.gravity}
        friction={p.friction}
        isVisible={p.showInfo}
        isRunning={p.isRunning}
      />
    </div>
  );
};

export default GUI;
