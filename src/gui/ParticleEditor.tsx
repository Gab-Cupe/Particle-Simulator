import type { PData, Force, ParticleEvent, EventCondition, EventAction } from "../Particula/Movimiento";

interface ParticleEditorProps {
  sel: PData;
  onUpdatePart: (id: number, data: any) => void;
  onClose: () => void;
}

const VARIABLES = ['x', 'y', 'z', 't', 'vx', 'vy', 'vz', 'v'] as const;
const OPERATORS = ['==', '>', '<', '>=', '<=', '!='] as const;
const ACTION_TYPES = ['pause', 'changeColor'] as const;

const ParticleEditor: React.FC<ParticleEditorProps> = ({ sel, onUpdatePart, onClose }) => {
  const addForce = () => {
    const newForce: Force = { id: Date.now(), vec: ["0", "0", "0"] };
    onUpdatePart(sel.id, { forces: [...sel.forces, newForce] });
  };

  const addEvent = () => {
    const newEvent: ParticleEvent = {
      id: Date.now(),
      name: `Event ${(sel.events?.length || 0) + 1}`,
      conditions: [{ variable: 'z', operator: '<=', value: 0 }],
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
    const newCondition: EventCondition = { variable: 'x', operator: '==', value: 0 };
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
        onClick={() => onUpdatePart(sel.id, { isMassless: !sel.isMassless })}
        style={{
          background: sel.isMassless ? "#4ecdc4" : "#ff6b6b",
          color: "#000",
          marginBottom: "15px",
        }}
      >
        {sel.isMassless ? "MODE: KINEMATICS f(t)" : "MODE: DYNAMICS (FORCES)"}
      </button>

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
          <label>Functions f(t)</label>
          <input
            placeholder="fx(t)"
            value={sel.fx}
            onChange={(e) => onUpdatePart(sel.id, { fx: e.target.value })}
          />
          <input
            placeholder="fy(t)"
            value={sel.fy}
            onChange={(e) => onUpdatePart(sel.id, { fy: e.target.value })}
          />
          <input
            placeholder="fz(t)"
            value={sel.fz}
            onChange={(e) => onUpdatePart(sel.id, { fz: e.target.value })}
          />
        </>
      )}

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

      <label>Color</label>
      <input
        type="color"
        value={sel.color}
        onChange={(e) => onUpdatePart(sel.id, { color: e.target.value })}
      />

      <hr style={{ margin: "15px 0", borderColor: "rgba(100,100,150,0.3)" }} />

      {/* SECCIÓN DE EVENTOS */}
      <label style={{ fontSize: "14px", fontWeight: "bold", color: "#ffc107" }}>
        Events ({sel.events?.length || 0})
      </label>
      <div
        style={{
          maxHeight: "250px",
          overflowY: "auto",
          marginBottom: "10px",
        }}
      >
        {(sel.events || []).map((event) => (
          <div
            key={event.id}
            style={{
              background: event.triggered
                ? "rgba(40, 167, 69, 0.2)"
                : "rgba(255,255,255,0.05)",
              padding: "10px",
              borderRadius: "6px",
              marginBottom: "10px",
              border: event.enabled
                ? "1px solid rgba(255,193,7,0.5)"
                : "1px solid rgba(100,100,100,0.3)",
            }}
          >
            {/* Header del evento */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <input
                type="text"
                value={event.name}
                onChange={(e) => updateEvent(event.id, { name: e.target.value })}
                style={{ flex: 1, marginRight: "5px", fontSize: "12px" }}
              />
              <button
                onClick={() => updateEvent(event.id, { enabled: !event.enabled })}
                style={{
                  width: "auto",
                  padding: "2px 6px",
                  fontSize: "10px",
                  background: event.enabled ? "#28a745" : "#666",
                  marginRight: "3px",
                }}
              >
                {event.enabled ? "ON" : "OFF"}
              </button>
              <button
                className="btn-delete"
                style={{ width: "auto", padding: "2px 6px" }}
                onClick={() => deleteEvent(event.id)}
              >
                X
              </button>
            </div>

            {event.triggered && (
              <div style={{ fontSize: "10px", color: "#28a745", marginBottom: "5px" }}>
                ✓ Triggered
              </div>
            )}

            {/* Condiciones */}
            <div style={{ marginBottom: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: "4px" }}>
                <span style={{ fontSize: "11px", color: "#b8d4f0" }}>Conditions:</span>
                <select
                  value={event.conditionLogic}
                  onChange={(e) => updateEvent(event.id, { conditionLogic: e.target.value as 'AND' | 'OR' })}
                  style={{ marginLeft: "8px", fontSize: "10px", padding: "2px" }}
                >
                  <option value="AND">AND</option>
                  <option value="OR">OR</option>
                </select>
              </div>
              {event.conditions.map((cond, ci) => (
                <div key={ci} style={{ display: "flex", gap: "3px", marginBottom: "3px" }}>
                  <select
                    value={cond.variable}
                    onChange={(e) => updateCondition(event.id, ci, { variable: e.target.value as typeof VARIABLES[number] })}
                    style={{ width: "50px", fontSize: "11px", padding: "2px" }}
                  >
                    {VARIABLES.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                  <select
                    value={cond.operator}
                    onChange={(e) => updateCondition(event.id, ci, { operator: e.target.value as typeof OPERATORS[number] })}
                    style={{ width: "45px", fontSize: "11px", padding: "2px" }}
                  >
                    {OPERATORS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <input
                    type="number"
                    value={cond.value}
                    onChange={(e) => updateCondition(event.id, ci, { value: Number(e.target.value) })}
                    style={{ width: "60px", fontSize: "11px", padding: "2px" }}
                  />
                  <button
                    onClick={() => removeCondition(event.id, ci)}
                    style={{ width: "20px", padding: "0", fontSize: "10px", background: "#dc3545" }}
                  >
                    -
                  </button>
                </div>
              ))}
              <button
                onClick={() => addCondition(event.id)}
                style={{ width: "auto", padding: "2px 8px", fontSize: "10px", background: "#17a2b8", marginTop: "3px" }}
              >
                + Condition
              </button>
            </div>

            {/* Acciones */}
            <div>
              <span style={{ fontSize: "11px", color: "#b8d4f0", display: "block", marginBottom: "4px" }}>Actions:</span>
              {event.actions.map((action, ai) => (
                <div key={ai} style={{ display: "flex", gap: "3px", marginBottom: "3px", alignItems: "center" }}>
                  <select
                    value={action.type}
                    onChange={(e) => updateAction(event.id, ai, { type: e.target.value as typeof ACTION_TYPES[number], payload: undefined })}
                    style={{ width: "100px", fontSize: "11px", padding: "2px" }}
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
                      style={{ width: "40px", height: "22px", padding: "0" }}
                    />
                  )}
                  <button
                    onClick={() => removeAction(event.id, ai)}
                    style={{ width: "20px", padding: "0", fontSize: "10px", background: "#dc3545" }}
                  >
                    -
                  </button>
                </div>
              ))}
              <button
                onClick={() => addAction(event.id)}
                style={{ width: "auto", padding: "2px 8px", fontSize: "10px", background: "#17a2b8", marginTop: "3px" }}
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
