import type { PData, EventCondition, ParticleEvent } from "../Particula/Movimiento";

export interface ParticleState {
  pos: [number, number, number];
  vel: [number, number, number];
  acc: [number, number, number];
  t: number;
}

export interface EventConfig {
  id: number;
  conditions: EventCondition[];
  conditionLogic: "AND" | "OR";
  enabled: boolean;
  triggered: boolean;
}

interface EventManagerOptions {
  tolerance?: number;
  maxIterations?: number;
}

type IntegratorFn = (p: PData, state: ParticleState, dt: number) => ParticleState;

class EventManager {
  private tolerance: number;
  private maxIterations: number;
  private integrator: IntegratorFn;

  constructor(integrator: IntegratorFn, options: EventManagerOptions = {}) {
    this.integrator = integrator;
    this.tolerance = options.tolerance ?? 1e-6;
    this.maxIterations = options.maxIterations ?? 10;
  }

  private isRangeOperator(op: EventCondition["operator"]) {
    return op === ">" || op === "<" || op === ">=" || op === "<=";
  }

  private allowsMulti(event: EventConfig) {
    if (!event.conditions.length) return false;
    return event.conditions.some(
      (cond) => this.isRangeOperator(cond.operator) && cond.triggerMode === "multi"
    );
  }

  private getVariableValue(state: ParticleState, variable: EventCondition["variable"]) {
    switch (variable) {
      case "x":
        return state.pos[0];
      case "y":
        return state.pos[1];
      case "z":
        return state.pos[2];
      case "t":
        return state.t;
      case "vx":
        return state.vel[0];
      case "vy":
        return state.vel[1];
      case "vz":
        return state.vel[2];
      case "v":
        return Math.hypot(state.vel[0], state.vel[1], state.vel[2]);
      default:
        return 0;
    }
  }

  private evaluateCondition(state: ParticleState, cond: EventCondition) {
    const actualValue = this.getVariableValue(state, cond.variable);
    const delta = actualValue - cond.value;

    switch (cond.operator) {
      case "==":
        return Math.abs(delta) <= this.tolerance;
      case "!=":
        return Math.abs(delta) > this.tolerance;
      case ">":
        return actualValue > cond.value;
      case "<":
        return actualValue < cond.value;
      case ">=":
        return actualValue >= cond.value - this.tolerance;
      case "<=":
        return actualValue <= cond.value + this.tolerance;
      default:
        return false;
    }
  }

  private evaluateEvent(state: ParticleState, event: EventConfig) {
    if (!event.enabled || event.conditions.length === 0) return false;
    const results = event.conditions.map((cond) => this.evaluateCondition(state, cond));
    return event.conditionLogic === "AND" ? results.every(Boolean) : results.some(Boolean);
  }

  private conditionCrossed(start: ParticleState, end: ParticleState, cond: EventCondition) {
    if (cond.operator === "!=") return false;
    const g0 = this.getVariableValue(start, cond.variable) - cond.value;
    const g1 = this.getVariableValue(end, cond.variable) - cond.value;
    if (Math.abs(g0) <= this.tolerance || Math.abs(g1) <= this.tolerance) return true;
    return g0 * g1 <= 0;
  }

  private eventCrossed(start: ParticleState, end: ParticleState, event: EventConfig) {
    if (!event.enabled || event.conditions.length === 0) return false;
    const endSatisfied = this.evaluateEvent(end, event);
    if (!endSatisfied) return false;
    return event.conditions.some((cond) => this.conditionCrossed(start, end, cond));
  }

  private refineEvent(
    p: PData,
    event: EventConfig,
    startState: ParticleState,
    endState: ParticleState,
    dt: number
  ) {
    if (this.evaluateEvent(startState, event)) return startState;

    let lo = 0;
    let hi = dt;
    let hiState = endState;

    for (let i = 0; i < this.maxIterations; i += 1) {
      const mid = 0.5 * (lo + hi);
      const midState = this.integrator(p, startState, mid);
      if (this.evaluateEvent(midState, event)) {
        hi = mid;
        hiState = midState;
      } else {
        lo = mid;
      }
    }

    if (!this.evaluateEvent(hiState, event)) return null;
    return hiState;
  }

  public findEvent(
    p: PData,
    event: ParticleEvent,
    startState: ParticleState,
    endState: ParticleState,
    dt: number
  ) {
    if (!event.enabled) return null;
    if (event.triggered && !this.allowsMulti(event)) return null;

    if (this.evaluateEvent(startState, event)) {
      return startState;
    }

    const crossed = this.eventCrossed(startState, endState, event);
    const endSatisfied = this.evaluateEvent(endState, event);

    if (!crossed && !endSatisfied) return null;

    return this.refineEvent(p, event, startState, endState, dt);
  }
}

export default EventManager;
