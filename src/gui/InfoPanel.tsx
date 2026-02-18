import React, { useState, useEffect } from "react";
import "./stylesGui.css";
import { evaluarFormula, type PData, type Force } from "../Particula/Movimiento";

interface LiveData {
  pos: [number, number, number];
  vel: [number, number, number];
  t: number;
  trail: [number, number, number][];
  frameCount: number;
}

interface InfoPanelProps {
  particulas: PData[];
  physicsRefs: React.MutableRefObject<Record<number, LiveData>>;
  gravity: boolean;
  friction: number;
  isVisible: boolean;
  isRunning: boolean;
}

const InfoPanel: React.FC<InfoPanelProps> = ({
  particulas,
  physicsRefs,
  gravity,
  friction,
  isVisible,
  isRunning,
}) => {
  // Estado para forzar re-renders en tiempo real
  const [, forceUpdate] = useState(0);

  // Actualizar en tiempo real usando requestAnimationFrame
  useEffect(() => {
    if (!isVisible) return;

    let animationId: number;
    const update = () => {
      forceUpdate((n) => n + 1);
      animationId = requestAnimationFrame(update);
    };

    animationId = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isVisible, isRunning]);

  if (!isVisible) return null;

  const g_val = gravity ? 9.80665 : 0;

  // Obtener el tiempo actual (usamos el mayor t de todas las partículas)
  const currentTime = Object.values(physicsRefs.current).reduce(
    (maxT, live) => Math.max(maxT, live?.t || 0),
    0
  );

  return (
    <div className="info-panel">
      {/* Tiempo en la parte superior */}
      <div className="info-time">
        <span className="time-label">t =</span>
        <span className="time-value">{currentTime.toFixed(3)} s</span>
      </div>

      <hr className="info-divider" />

      {/* Lista de partículas con su información */}
      <div className="info-particles-list">
        {particulas.map((p) => {
          const live = physicsRefs.current[p.id];
          if (!live) return null;

          const m = p.mass || 0.001;

          // Calcular suma de fuerzas aplicadas
          const appliedForces = p.forces.map((f: Force, idx: number) => {
            const fx = evaluarFormula(f.vec[0], live.t, live.pos[0], live.pos[1], live.pos[2]);
            const fy = evaluarFormula(f.vec[1], live.t, live.pos[0], live.pos[1], live.pos[2]);
            const fz = evaluarFormula(f.vec[2], live.t, live.pos[0], live.pos[1], live.pos[2]);
            const mag = Math.sqrt(fx ** 2 + fy ** 2 + fz ** 2);
            return { idx: idx + 1, fx, fy, fz, mag };
          });

          // Suma de fuerzas
          const sumF = appliedForces.reduce(
            (acc, f) => [acc[0] + f.fx, acc[1] + f.fy, acc[2] + f.fz],
            [0, 0, 0]
          );

          // Peso
          const peso = m * g_val;

          // Normal (solo si está en el suelo)
          const enSuelo = live.pos[2] <= 0.01;
          let normal = 0;
          if (enSuelo) {
            const fuerzaNetoZ = sumF[2] - peso;
            normal = Math.abs(Math.min(0, fuerzaNetoZ));
          }

          // Rozamiento
          let friccionMag = 0;
          if (enSuelo && friction > 0 && normal > 0) {
            const friccionMax = friction * normal;
            const vHor = Math.hypot(live.vel[0], live.vel[1]);
            const fuerzaHorizontal = Math.hypot(sumF[0], sumF[1]);

            if (vHor > 1e-9) {
              friccionMag = Math.min(friccionMax, fuerzaHorizontal + m * vHor / 0.01);
            } else if (fuerzaHorizontal > 1e-9) {
              friccionMag = Math.min(friccionMax, fuerzaHorizontal);
            }
          }

          // Velocidad
          const velMag = Math.sqrt(live.vel[0] ** 2 + live.vel[1] ** 2 + live.vel[2] ** 2);

          // Aceleración (a = F/m - g en z)
          const ax = sumF[0] / m;
          const ay = sumF[1] / m;
          const az = sumF[2] / m - g_val;
          const accMag = Math.sqrt(ax ** 2 + ay ** 2 + az ** 2);

          return (
            <div key={p.id} className="info-particle-card">
              <div className="info-particle-header" style={{ borderLeftColor: p.color }}>
                <span className="info-particle-name">P-{p.id.toString().slice(-3)}</span>
                {enSuelo && <span className="info-ground-badge">EN SUELO</span>}
                {p.isMassless && <span className="info-massless-badge">SIN MASA</span>}
              </div>

              <div className="info-particle-body">
                {/* Posición */}
                <div className="info-row">
                  <span className="info-label">Pos:</span>
                  <span className="info-value">
                    ({live.pos[0].toFixed(2)}, {live.pos[1].toFixed(2)}, {live.pos[2].toFixed(2)})
                  </span>
                </div>

                {/* Velocidad */}
                <div className="info-row">
                  <span className="info-label">Vel:</span>
                  <span className="info-value">
                    {velMag.toFixed(2)} m/s
                    <span className="info-subvalue">
                      ({live.vel[0].toFixed(2)}, {live.vel[1].toFixed(2)}, {live.vel[2].toFixed(2)})
                    </span>
                  </span>
                </div>

                {/* Aceleración */}
                {!p.isMassless && (
                  <div className="info-row">
                    <span className="info-label">Acc:</span>
                    <span className="info-value">
                      {accMag.toFixed(2)} m/s²
                      <span className="info-subvalue">
                        ({ax.toFixed(2)}, {ay.toFixed(2)}, {az.toFixed(2)})
                      </span>
                    </span>
                  </div>
                )}

                {/* Masa */}
                {!p.isMassless && (
                  <div className="info-row">
                    <span className="info-label">Masa:</span>
                    <span className="info-value">{p.mass.toFixed(2)} kg</span>
                  </div>
                )}

                {/* Fuerzas */}
                {!p.isMassless && (
                  <div className="info-forces-section">
                    <span className="info-forces-title">Fuerzas:</span>

                    {/* Peso */}
                    {gravity && (
                      <div className="info-force-row info-force-weight">
                        <span className="force-name">W (Peso)</span>
                        <span className="force-value">{peso.toFixed(2)} N</span>
                        <span className="force-components">(0, 0, -{peso.toFixed(2)})</span>
                      </div>
                    )}

                    {/* Fuerzas aplicadas */}
                    {appliedForces.map((f) => (
                      <div key={f.idx} className="info-force-row info-force-applied">
                        <span className="force-name">F{f.idx}</span>
                        <span className="force-value">{f.mag.toFixed(2)} N</span>
                        <span className="force-components">
                          ({f.fx.toFixed(2)}, {f.fy.toFixed(2)}, {f.fz.toFixed(2)})
                        </span>
                      </div>
                    ))}

                    {/* Normal */}
                    {enSuelo && normal > 0 && (
                      <div className="info-force-row info-force-normal">
                        <span className="force-name">N (Normal)</span>
                        <span className="force-value">{normal.toFixed(2)} N</span>
                        <span className="force-components">(0, 0, +{normal.toFixed(2)})</span>
                      </div>
                    )}

                    {/* Rozamiento */}
                    {enSuelo && friccionMag > 0.01 && (
                      <div className="info-force-row info-force-friction">
                        <span className="force-name">f (Rozamiento)</span>
                        <span className="force-value">{friccionMag.toFixed(2)} N</span>
                      </div>
                    )}

                    {appliedForces.length === 0 && !gravity && (
                      <div className="info-no-forces">Sin fuerzas aplicadas</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {particulas.length === 0 && (
          <div className="info-empty">No hay partículas</div>
        )}
      </div>
    </div>
  );
};

export default InfoPanel;
