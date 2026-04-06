import { evaluarFormula, getFormulaError, type PData, type Force, type ParticleEvent, type EventCondition, type EventAction } from "../Particula/Movimiento";

interface ParticleEditorProps {
  sel: PData;
  onUpdatePart: (id: number, data: any) => void;
  onClose: () => void;
}

const VARIABLES = ['x', 'y', 'z', 't', 'vx', 'vy', 'vz', 'v'] as const;
const OPERATORS = ['>', '<', '>=', '<='] as const;
const ACTION_TYPES = ['pause', 'changeColor'] as const;
const TRIGGER_MODES = ['once', 'multi'] as const;
const MULTI_TRIGGER_OPERATORS = new Set(['>', '<', '>=', '<=']);

const ParticleEditor: React.FC<ParticleEditorProps> = ({ sel, onUpdatePart, onClose }) => {
  const kinematicMode = sel.kinematicMode ?? "position";
  const showInitialPosition = !sel.isMassless || kinematicMode !== "position";
  const showInitialVelocity = !sel.isMassless || kinematicMode === "acceleration";
  const trailWidth = sel.trailWidth ?? 1;
  const trailLength = sel.trailLength ?? 1;

  const getR0FromFormula = (
    fx: string,
    fy: string,
    fz: string
  ): [number, number, number] => [
    evaluarFormula(fx, 0),
    evaluarFormula(fy, 0),
    evaluarFormula(fz, 0),
  ];

  const setKinematicMode = (mode: "position" | "velocity" | "acceleration") => {
    const updates: Record<string, unknown> = { kinematicMode: mode };
    if (mode === "position") {
      updates.p0_fis = getR0FromFormula(sel.fx, sel.fy, sel.fz);
    }
    onUpdatePart(sel.id, updates);
  };

  const updateKinematicFormula = (
    axis: "x" | "y" | "z",
    value: string
  ) => {
    const nextFx = axis === "x" ? value : sel.fx;
    const nextFy = axis === "y" ? value : sel.fy;
    const nextFz = axis === "z" ? value : sel.fz;
    const updates: Record<string, unknown> = {
      fx: nextFx,
      fy: nextFy,
      fz: nextFz,
    };

    if (sel.isMassless && kinematicMode === "position") {
      updates.p0_fis = getR0FromFormula(nextFx, nextFy, nextFz);
    }

    onUpdatePart(sel.id, updates);
  };

  const renderFormulaError = (formula: string) => {
    const error = getFormulaError(formula);
    if (!error) return null;
    const indexInfo = error.index >= 0 ? ` (pos ${error.index + 1})` : "";
    return (
      <div className="formula-error">
        Error: {error.message}{indexInfo}
      </div>
    );
  };
  const addForce = () => {
    const newForce: Force = { id: Date.now(), vec: ["0", "0", "0"] };
    onUpdatePart(sel.id, { forces: [...sel.forces, newForce] });
  };

  const addEvent = () => {
    const newEvent: ParticleEvent = {
      id: Date.now(),
      name: `Event ${(sel.events?.length || 0) + 1}`,
      conditions: [{ variable: 'z', operator: '<=', value: 0, triggerMode: 'once' }],
      conditionLogic: 'AND',
      actions: [{ type: 'pause' }],
      triggered: false,
      enabled: true,
    };
    onUpdatePart(sel.id, { events: [...(sel.events || []), newEvent] });
  };

  const updateEvent = (eventId: number, updates: Partial<ParticleEvent>) => {
    const newEvents = (sel.events || []).map(e =>
      e.id === eventId ? { ...e, ...updates } : e
    );
    onUpdatePart(sel.id, { events: newEvents });
  };

  const addCondition = (eventId: number) => {
    const event = sel.events?.find(e => e.id === eventId);
    if (!event) return;
    const newCondition: EventCondition = { variable: 'x', operator: '>=', value: 0, triggerMode: 'once' };
    updateEvent(eventId, { conditions: [...event.conditions, newCondition] });
  };

  const updateCondition = (eventId: number, condIndex: number, updates: Partial<EventCondition>) => {
    const event = sel.events?.find(e => e.id === eventId);
    if (!event) return;
    const newConditions = event.conditions.map((c, i) =>
      i === condIndex ? { ...c, ...updates } : c
    );
    updateEvent(eventId, { conditions: newConditions });
  };

  const removeCondition = (eventId: number, condIndex: number) => {
    const event = sel.events?.find(e => e.id === eventId);
    if (!event) return;
    updateEvent(eventId, { conditions: event.conditions.filter((_, i) => i !== condIndex) });
  };

  const addAction = (eventId: number) => {
    const event = sel.events?.find(e => e.id === eventId);
    if (!event) return;
    const newAction: EventAction = { type: 'pause' };
    updateEvent(eventId, { actions: [...event.actions, newAction] });
  };

  const updateAction = (eventId: number, actionIndex: number, updates: Partial<EventAction>) => {
    const event = sel.events?.find(e => e.id === eventId);
    if (!event) return;
    const newActions = event.actions.map((a, i) =>
      i === actionIndex ? { ...a, ...updates } : a
    );
    updateEvent(eventId, { actions: newActions });
  };

  const removeAction = (eventId: number, actionIndex: number) => {
    const event = sel.events?.find(e => e.id === eventId);
    if (!event) return;
    updateEvent(eventId, { actions: event.actions.filter((_, i) => i !== actionIndex) });
  };

  const deleteEvent = (eventId: number) => {
    onUpdatePart(sel.id, { events: (sel.events || []).filter(e => e.id !== eventId) });
  };

  return (
    <div className="panel-izquierdo">
      <h3>PHYSICS EDITOR</h3>
      <label>Calculation Mode</label>
      <button
        onClick={() => {
          if (sel.isMassless) {
            onUpdatePart(sel.id, { isMassless: false });
            return;
          }
          const updates: Record<string, unknown> = {
            isMassless: true,
            kinematicMode,
          };
          if (kinematicMode === "position") {
            updates.p0_fis = getR0FromFormula(sel.fx, sel.fy, sel.fz);
          }
          onUpdatePart(sel.id, updates);
        }}
        style={{
          background: sel.isMassless ? "#4ecdc4" : "#ff6b6b",
          color: "#000",
          marginBottom: "15px",
        }}
      >
        {sel.isMassless ? "MODE: KINEMATICS f(t)" : "MODE: DYNAMICS (FORCES)"}
      </button>

      {sel.isMassless && (
        <>
          <label>Kinematics Mode</label>
          <div className="button-grid" style={{ marginBottom: "10px" }}>
            <button
              onClick={() => setKinematicMode("position")}
              style={{
                background: kinematicMode === "position" ? "#4ecdc4" : "#666",
              }}
            >
              Position r(t)
            </button>
            <button
              onClick={() => setKinematicMode("velocity")}
              style={{
                background: kinematicMode === "velocity" ? "#4ecdc4" : "#666",
              }}
            >
              Velocity v(t)
            </button>
            <button
              onClick={() => setKinematicMode("acceleration")}
              style={{
                background: kinematicMode === "acceleration" ? "#4ecdc4" : "#666",
              }}
            >
              Acceleration a(t)
            </button>
          </div>
        </>
      )}

      {showInitialPosition && (
        <>
          <label>Initial Position (X, Y, Z)</label>
          <div style={{ display: "flex", gap: 2 }}>
            <input
              type="number"
              value={sel.p0_fis[0]}
              onChange={(e) =>
                onUpdatePart(sel.id, {
                  p0_fis: [Number(e.target.value), sel.p0_fis[1], sel.p0_fis[2]],
                })
              }
            />
            <input
              type="number"
              value={sel.p0_fis[1]}
              onChange={(e) =>
                onUpdatePart(sel.id, {
                  p0_fis: [sel.p0_fis[0], Number(e.target.value), sel.p0_fis[2]],
                })
              }
            />
            <input
              type="number"
              value={sel.p0_fis[2]}
              onChange={(e) =>
                onUpdatePart(sel.id, {
                  p0_fis: [sel.p0_fis[0], sel.p0_fis[1], Number(e.target.value)],
                })
              }
            />
          </div>
        </>
      )}

      {!sel.isMassless ? (
        <>
          <label>Mass (kg)</label>
          <input
            type="number"
            value={sel.mass}
            onChange={(e) => onUpdatePart(sel.id, { mass: Number(e.target.value) })}
          />
          <label>Forces F(t, x, y, z) (N)</label>
          <div
            style={{
              maxHeight: "180px",
              overflowY: "auto",
              marginBottom: "10px",
            }}
          >
            {sel.forces.map((f, i) => (
              <div
                key={f.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  background: "rgba(255,255,255,0.05)",
                  padding: "5px",
                  borderRadius: "4px",
                  marginBottom: "8px",
                }}
              >
                <div style={{ display: "flex", gap: "2px" }}>
                  <div className="formula-input">
                    <input
                      type="text"
                      value={f.vec[0]}
                      onChange={(e) => {
                        const nf = [...sel.forces];
                        nf[i].vec[0] = e.target.value;
                        onUpdatePart(sel.id, { forces: nf });
                      }}
                      placeholder="Fx"
                    />
                    {renderFormulaError(f.vec[0])}
                  </div>
                  <div className="formula-input">
                    <input
                      type="text"
                      value={f.vec[1]}
                      onChange={(e) => {
                        const nf = [...sel.forces];
                        nf[i].vec[1] = e.target.value;
                        onUpdatePart(sel.id, { forces: nf });
                      }}
                      placeholder="Fy"
                    />
                    {renderFormulaError(f.vec[1])}
                  </div>
                  <div className="formula-input">
                    <input
                      type="text"
                      value={f.vec[2]}
                      onChange={(e) => {
                        const nf = [...sel.forces];
                        nf[i].vec[2] = e.target.value;
                        onUpdatePart(sel.id, { forces: nf });
                      }}
                      placeholder="Fz"
                    />
                    {renderFormulaError(f.vec[2])}
                  </div>
                  <button
                    className="btn-delete"
                    style={{ width: "30px" }}
                    onClick={() =>
                      onUpdatePart(sel.id, {
                        forces: sel.forces.filter((x) => x.id !== f.id),
                      })
                    }
                  >
                    X
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={addForce}
            style={{ background: "#28a745", color: "#fff" }}
          >
            + ADD FORCE
          </button>
        </>
      ) : (
        <>
          <label>
            {kinematicMode === "position"
              ? "Position r(t)"
              : kinematicMode === "velocity"
                ? "Velocity v(t)"
                : "Acceleration a(t)"}
          </label>
          <div className="formula-input">
            <input
              placeholder="fx(t)"
              value={sel.fx}
              onChange={(e) => updateKinematicFormula("x", e.target.value)}
            />
            {renderFormulaError(sel.fx)}
          </div>
          <div className="formula-input">
            <input
              placeholder="fy(t)"
              value={sel.fy}
              onChange={(e) => updateKinematicFormula("y", e.target.value)}
            />
            {renderFormulaError(sel.fy)}
          </div>
          <div className="formula-input">
            <input
              placeholder="fz(t)"
              value={sel.fz}
              onChange={(e) => updateKinematicFormula("z", e.target.value)}
            />
            {renderFormulaError(sel.fz)}
          </div>
        </>
      )}

      {showInitialVelocity && (
        <>
          <label>Initial Velocity (v0)</label>
          <div style={{ display: "flex", gap: 2 }}>
            <input
              type="number"
              value={sel.v0_fis[0]}
              onChange={(e) =>
                onUpdatePart(sel.id, {
                  v0_fis: [Number(e.target.value), sel.v0_fis[1], sel.v0_fis[2]],
                })
              }
            />
            <input
              type="number"
              value={sel.v0_fis[1]}
              onChange={(e) =>
                onUpdatePart(sel.id, {
                  v0_fis: [sel.v0_fis[0], Number(e.target.value), sel.v0_fis[2]],
                })
              }
            />
            <input
              type="number"
              value={sel.v0_fis[2]}
              onChange={(e) =>
                onUpdatePart(sel.id, {
                  v0_fis: [sel.v0_fis[0], sel.v0_fis[1], Number(e.target.value)],
                })
              }
            />
          </div>
        </>
      )}

      <label>Color</label>
      <input
        type="color"
        value={sel.color}
        onChange={(e) => onUpdatePart(sel.id, { color: e.target.value })}
      />

      <label>Trail Width: {trailWidth.toFixed(1)}</label>
      <input
        type="range"
        min="0.5"
        max="4"
        step="0.1"
        value={trailWidth}
        onChange={(e) => onUpdatePart(sel.id, { trailWidth: Number(e.target.value) })}
      />

      <label>Trail Length: {trailLength.toFixed(1)}</label>
      <input
        type="range"
        min="0.5"
        max="8"
        step="0.1"
        value={trailLength}
        onChange={(e) => onUpdatePart(sel.id, { trailLength: Number(e.target.value) })}
      />

      <hr style={{ margin: "15px 0", borderColor: "rgba(100,100,150,0.3)" }} />

      {/* SECCIÓN DE EVENTOS */}
      <label style={{ fontSize: "14px", fontWeight: "bold", color: "#ffc107" }}>
        Events ({sel.events?.length || 0})
      </label>
      <div
        className="event-list"
      >
        {(sel.events || []).map((event) => (
          <div
            key={event.id}
            className={`event-card ${event.enabled ? "event-card-on" : "event-card-off"} ${event.triggered ? "event-card-triggered" : ""}`}
          >
            {/* Header del evento */}
            <div className="event-header">
              <input
                type="text"
                value={event.name}
                onChange={(e) => updateEvent(event.id, { name: e.target.value })}
                className="event-title"
              />
              <div className="event-header-actions">
                <button
                  onClick={() => updateEvent(event.id, { enabled: !event.enabled })}
                  className={`event-toggle ${event.enabled ? "event-toggle-on" : "event-toggle-off"}`}
                >
                  {event.enabled ? "ON" : "OFF"}
                </button>
                <button
                  className="event-delete"
                  onClick={() => deleteEvent(event.id)}
                >
                  X
                </button>
              </div>
            </div>

            {event.triggered && (
              <div className="event-status">
                ✓ Triggered
              </div>
            )}

            {/* Condiciones */}
            <div className="event-section">
              <div className="event-section-header">
                <span>Conditions</span>
                <select
                  value={event.conditionLogic}
                  onChange={(e) => updateEvent(event.id, { conditionLogic: e.target.value as 'AND' | 'OR' })}
                  className="event-logic"
                >
                  <option value="AND">AND</option>
                  <option value="OR">OR</option>
                </select>
              </div>
              {event.conditions.map((cond, ci) => (
                <div key={ci} className="event-row">
                  <select
                    value={cond.variable}
                    onChange={(e) => updateCondition(event.id, ci, { variable: e.target.value as typeof VARIABLES[number] })}
                    className="event-select"
                  >
                    {VARIABLES.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                  <select
                    value={cond.operator}
                    onChange={(e) => {
                      const op = e.target.value as typeof OPERATORS[number];
                      const next: Partial<EventCondition> = { operator: op };
                      if (MULTI_TRIGGER_OPERATORS.has(op) && !cond.triggerMode) {
                        next.triggerMode = "once";
                      }
                      updateCondition(event.id, ci, next);
                    }}
                    className="event-select"
                  >
                    {OPERATORS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <input
                    type="number"
                    value={cond.value}
                    onChange={(e) => updateCondition(event.id, ci, { value: Number(e.target.value) })}
                    className="event-input"
                  />
                  {MULTI_TRIGGER_OPERATORS.has(cond.operator) && (
                    <select
                      value={cond.triggerMode ?? "once"}
                      onChange={(e) =>
                        updateCondition(event.id, ci, {
                          triggerMode: e.target.value as typeof TRIGGER_MODES[number],
                        })
                      }
                      className="event-select"
                    >
                      {TRIGGER_MODES.map((mode) => (
                        <option key={mode} value={mode}>
                          {mode === "once" ? "Once" : "Multi"}
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    onClick={() => removeCondition(event.id, ci)}
                    className="event-remove"
                  >
                    -
                  </button>
                </div>
              ))}
              <button
                onClick={() => addCondition(event.id)}
                className="event-add"
              >
                + Condition
              </button>
            </div>

            {/* Acciones */}
            <div className="event-section">
              <span className="event-section-title">Actions</span>
              {event.actions.map((action, ai) => (
                <div key={ai} className="event-row">
                  <select
                    value={action.type}
                    onChange={(e) => updateAction(event.id, ai, { type: e.target.value as typeof ACTION_TYPES[number], payload: undefined })}
                    className="event-select"
                  >
                    {ACTION_TYPES.map(t => (
                      <option key={t} value={t}>
                        {t === 'pause' ? '⏸ Pause' : '🎨 Color'}
                      </option>
                    ))}
                  </select>
                  {action.type === 'changeColor' && (
                    <input
                      type="color"
                      value={action.payload || "#ff0000"}
                      onChange={(e) => updateAction(event.id, ai, { payload: e.target.value })}
                      className="event-color"
                    />
                  )}
                  <button
                    onClick={() => removeAction(event.id, ai)}
                    className="event-remove"
                  >
                    -
                  </button>
                </div>
              ))}
              <button
                onClick={() => addAction(event.id)}
                className="event-add"
              >
                + Action
              </button>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={addEvent}
        style={{ background: "#ffc107", color: "#000" }}
      >
        + ADD EVENT
      </button>

      <button
        onClick={onClose}
        style={{ marginTop: 10, background: "#007bff", color: "white" }}
      >
        CLOSE
      </button>
    </div>
  );
};

export default ParticleEditor;
