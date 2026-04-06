import { useCallback, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Mesh } from "three";
import { evaluarFormula, type PData, type ParticleEvent } from "../Particula/Movimiento";
import EventManager, { type ParticleState } from "./EventManager";

export interface LiveData {
  pos: [number, number, number];
  vel: [number, number, number];
  acc: [number, number, number];
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

  const integrateParticle = useCallback(
    (p: PData, state: ParticleState, dt: number): ParticleState => {
      const nt = state.t + dt;
      let posFinal: [number, number, number];
      let velFinal: [number, number, number] = [
        state.vel[0],
        state.vel[1],
        state.vel[2],
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
          posFinal = evalVec(nt, state.pos);
          velFinal = [
            (posFinal[0] - state.pos[0]) / dt,
            (posFinal[1] - state.pos[1]) / dt,
            (posFinal[2] - state.pos[2]) / dt,
          ];
          accNew = [
            (velFinal[0] - state.vel[0]) / dt,
            (velFinal[1] - state.vel[1]) / dt,
            (velFinal[2] - state.vel[2]) / dt,
          ];
        } else if (mode === "velocity") {
          const v1 = evalVec(state.t, state.pos);
          const pos2: [number, number, number] = [
            state.pos[0] + 0.5 * dt * v1[0],
            state.pos[1] + 0.5 * dt * v1[1],
            state.pos[2] + 0.5 * dt * v1[2],
          ];
          const v2 = evalVec(state.t + 0.5 * dt, pos2);

          const pos3: [number, number, number] = [
            state.pos[0] + 0.5 * dt * v2[0],
            state.pos[1] + 0.5 * dt * v2[1],
            state.pos[2] + 0.5 * dt * v2[2],
          ];
          const v3 = evalVec(state.t + 0.5 * dt, pos3);

          const pos4: [number, number, number] = [
            state.pos[0] + dt * v3[0],
            state.pos[1] + dt * v3[1],
            state.pos[2] + dt * v3[2],
          ];
          const v4 = evalVec(state.t + dt, pos4);

          posFinal = [
            state.pos[0] + (dt / 6) * (v1[0] + 2 * v2[0] + 2 * v3[0] + v4[0]),
            state.pos[1] + (dt / 6) * (v1[1] + 2 * v2[1] + 2 * v3[1] + v4[1]),
            state.pos[2] + (dt / 6) * (v1[2] + 2 * v2[2] + 2 * v3[2] + v4[2]),
          ];
          velFinal = evalVec(nt, posFinal);
          accNew = [
            (velFinal[0] - state.vel[0]) / dt,
            (velFinal[1] - state.vel[1]) / dt,
            (velFinal[2] - state.vel[2]) / dt,
          ];
        } else {
          const a1 = evalVec(state.t, state.pos);
          const k1Pos: [number, number, number] = [
            state.vel[0],
            state.vel[1],
            state.vel[2],
          ];
          const k1Vel = a1;

          const pos2: [number, number, number] = [
            state.pos[0] + 0.5 * dt * k1Pos[0],
            state.pos[1] + 0.5 * dt * k1Pos[1],
            state.pos[2] + 0.5 * dt * k1Pos[2],
          ];
          const vel2: [number, number, number] = [
            state.vel[0] + 0.5 * dt * k1Vel[0],
            state.vel[1] + 0.5 * dt * k1Vel[1],
            state.vel[2] + 0.5 * dt * k1Vel[2],
          ];
          const a2 = evalVec(state.t + 0.5 * dt, pos2);
          const k2Pos: [number, number, number] = [vel2[0], vel2[1], vel2[2]];
          const k2Vel = a2;

          const pos3: [number, number, number] = [
            state.pos[0] + 0.5 * dt * k2Pos[0],
            state.pos[1] + 0.5 * dt * k2Pos[1],
            state.pos[2] + 0.5 * dt * k2Pos[2],
          ];
          const vel3: [number, number, number] = [
            state.vel[0] + 0.5 * dt * k2Vel[0],
            state.vel[1] + 0.5 * dt * k2Vel[1],
            state.vel[2] + 0.5 * dt * k2Vel[2],
          ];
          const a3 = evalVec(state.t + 0.5 * dt, pos3);
          const k3Pos: [number, number, number] = [vel3[0], vel3[1], vel3[2]];
          const k3Vel = a3;

          const pos4: [number, number, number] = [
            state.pos[0] + dt * k3Pos[0],
            state.pos[1] + dt * k3Pos[1],
            state.pos[2] + dt * k3Pos[2],
          ];
          const vel4: [number, number, number] = [
            state.vel[0] + dt * k3Vel[0],
            state.vel[1] + dt * k3Vel[1],
            state.vel[2] + dt * k3Vel[2],
          ];
          const a4 = evalVec(state.t + dt, pos4);
          const k4Pos: [number, number, number] = [vel4[0], vel4[1], vel4[2]];
          const k4Vel = a4;

          posFinal = [
            state.pos[0] +
              (dt / 6) * (k1Pos[0] + 2 * k2Pos[0] + 2 * k3Pos[0] + k4Pos[0]),
            state.pos[1] +
              (dt / 6) * (k1Pos[1] + 2 * k2Pos[1] + 2 * k3Pos[1] + k4Pos[1]),
            state.pos[2] +
              (dt / 6) * (k1Pos[2] + 2 * k2Pos[2] + 2 * k3Pos[2] + k4Pos[2]),
          ];

          velFinal = [
            state.vel[0] +
              (dt / 6) * (k1Vel[0] + 2 * k2Vel[0] + 2 * k3Vel[0] + k4Vel[0]),
            state.vel[1] +
              (dt / 6) * (k1Vel[1] + 2 * k2Vel[1] + 2 * k3Vel[1] + k4Vel[1]),
            state.vel[2] +
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

        const k1 = computeAcceleration(state.pos, state.vel, state.t);
        const k1Pos: [number, number, number] = [
          state.vel[0],
          state.vel[1],
          state.vel[2],
        ];
        const k1Vel = k1.acc;

        const pos2: [number, number, number] = [
          state.pos[0] + 0.5 * dt * k1Pos[0],
          state.pos[1] + 0.5 * dt * k1Pos[1],
          state.pos[2] + 0.5 * dt * k1Pos[2],
        ];
        const vel2: [number, number, number] = [
          state.vel[0] + 0.5 * dt * k1Vel[0],
          state.vel[1] + 0.5 * dt * k1Vel[1],
          state.vel[2] + 0.5 * dt * k1Vel[2],
        ];
        const k2 = computeAcceleration(pos2, vel2, state.t + 0.5 * dt);
        const k2Pos: [number, number, number] = [vel2[0], vel2[1], vel2[2]];
        const k2Vel = k2.acc;

        const pos3: [number, number, number] = [
          state.pos[0] + 0.5 * dt * k2Pos[0],
          state.pos[1] + 0.5 * dt * k2Pos[1],
          state.pos[2] + 0.5 * dt * k2Pos[2],
        ];
        const vel3: [number, number, number] = [
          state.vel[0] + 0.5 * dt * k2Vel[0],
          state.vel[1] + 0.5 * dt * k2Vel[1],
          state.vel[2] + 0.5 * dt * k2Vel[2],
        ];
        const k3 = computeAcceleration(pos3, vel3, state.t + 0.5 * dt);
        const k3Pos: [number, number, number] = [vel3[0], vel3[1], vel3[2]];
        const k3Vel = k3.acc;

        const pos4: [number, number, number] = [
          state.pos[0] + dt * k3Pos[0],
          state.pos[1] + dt * k3Pos[1],
          state.pos[2] + dt * k3Pos[2],
        ];
        const vel4: [number, number, number] = [
          state.vel[0] + dt * k3Vel[0],
          state.vel[1] + dt * k3Vel[1],
          state.vel[2] + dt * k3Vel[2],
        ];
        const k4 = computeAcceleration(pos4, vel4, state.t + dt);
        const k4Pos: [number, number, number] = [vel4[0], vel4[1], vel4[2]];
        const k4Vel = k4.acc;

        posFinal = [
          state.pos[0] +
            (dt / 6) * (k1Pos[0] + 2 * k2Pos[0] + 2 * k3Pos[0] + k4Pos[0]),
          state.pos[1] +
            (dt / 6) * (k1Pos[1] + 2 * k2Pos[1] + 2 * k3Pos[1] + k4Pos[1]),
          state.pos[2] +
            (dt / 6) * (k1Pos[2] + 2 * k2Pos[2] + 2 * k3Pos[2] + k4Pos[2]),
        ];

        velFinal = [
          state.vel[0] +
            (dt / 6) * (k1Vel[0] + 2 * k2Vel[0] + 2 * k3Vel[0] + k4Vel[0]),
          state.vel[1] +
            (dt / 6) * (k1Vel[1] + 2 * k2Vel[1] + 2 * k3Vel[1] + k4Vel[1]),
          state.vel[2] +
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

      if (collisibleGround && posFinal[2] <= 0) {
        posFinal[2] = 0;
        if (velFinal[2] < 0) velFinal[2] = 0;
      }

      return {
        pos: posFinal,
        vel: velFinal,
        acc: accNew,
        t: nt,
      };
    },
    [collisibleGround, friction, grav]
  );

  const eventManager = useMemo(
    () => new EventManager(integrateParticle, { tolerance: 1e-6, maxIterations: 10 }),
    [integrateParticle]
  );

  useFrame(() => {
    if (!run) return;
    const scale = Math.max(0, timeScale);
    if (scale === 0) return;

    substepAccumulator.current += scale;
    const steps = Math.floor(substepAccumulator.current);
    if (steps <= 0) return;
    substepAccumulator.current -= steps;

    const triggeredThisFrame = new Set<string>();
    const clampedThisFrame = new Set<number>();

    for (let step = 0; step < steps; step += 1) {
      parts.forEach((p: PData) => {
        if (clampedThisFrame.has(p.id)) return;
        const live = physicsRefs.current[p.id];
        if (!live) return;

        const dt = physicsDt;
        const startState: ParticleState = {
          pos: live.pos,
          vel: live.vel,
          acc: live.acc,
          t: live.t,
        };
        const endState = integrateParticle(p, startState, dt);

        let resolvedState = endState;
        let triggeredEvent: ParticleEvent | null = null;

        if (p.events && p.events.length > 0) {
          p.events.forEach((event) => {
            const eventKey = `${p.id}:${event.id}`;
            if (triggeredThisFrame.has(eventKey)) return;
            const refined = eventManager.findEvent(p, event, startState, endState, dt);
            if (!refined) return;
            if (!triggeredEvent || refined.t < resolvedState.t) {
              triggeredEvent = event;
              resolvedState = refined;
            }
          });
        }

        live.pos = resolvedState.pos;
        live.vel = resolvedState.vel;
        live.acc = resolvedState.acc;
        live.t = resolvedState.t;
        live.frameCount++;

        if (triggeredEvent) {
          const eventData = triggeredEvent as ParticleEvent;
          const eventKey = `${p.id}:${eventData.id}`;
          triggeredThisFrame.add(eventKey);
          clampedThisFrame.add(p.id);
          onEventTriggered(p.id, eventData.id);

          eventData.actions.forEach((action) => {
            switch (action.type) {
              case "pause":
                onPause();
                break;
              case "changeColor":
                if (action.payload) {
                  onUpdateParticle(p.id, { color: action.payload });
                }
                break;
            }
          });
        }

        const TRAIL_EVERY = 8;
        const baseTrailMax = 60;
        const lengthScale = Math.min(8, Math.max(0.5, p.trailLength ?? 1));
        const trailMax = Math.max(2, Math.round(baseTrailMax * lengthScale));
        if (live.frameCount % TRAIL_EVERY === 0) {
          live.trail = [
            ...live.trail,
            [live.pos[1], live.pos[2], live.pos[0]] as [number, number, number],
          ].slice(-trailMax) as [number, number, number][];
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