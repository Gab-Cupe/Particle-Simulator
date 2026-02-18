// src/physics/Movimiento.ts

const formulaCache: Record<string, Function> = {};

// Extraemos todas las funciones y constantes de Math para inyectarlas
const mathKeys = Object.getOwnPropertyNames(Math);
const mathValues = mathKeys.map(key => (Math as any)[key]);

export const evaluarFormula = (
  formula: string,
  t: number,
  x: number = 0,
  y: number = 0,
  z: number = 0
): number => {
  try {
    if (!formula || formula.trim() === "" || formula === "0") return 0;

    const cacheKey = formula.toLowerCase().trim();
    let fn = formulaCache[cacheKey];

    if (!fn) {
      // Reemplazamos ^ por ** para potencias y manejamos variaciones comunes
      const cleanedFormula = cacheKey.replace(/\^/g, "**");
      
      // Creamos la función inyectando t, x, y, z Y todas las funciones de Math
      fn = new Function(
        "t", "x", "y", "z", ...mathKeys,
        `return (function() { 
          try { 
            return ${cleanedFormula}; 
          } catch(e) { return 0; } 
        })()`
      );
      formulaCache[cacheKey] = fn;
    }

    // Ejecutamos pasando las variables y los valores de Math
    const resultado = fn(t, x, y, z, ...mathValues);

    return typeof resultado === "number" && !isNaN(resultado) ? resultado : 0;
  } catch (e) {
    return 0;
  }
};

export interface Force {
  id: number;
  vec: [string, string, string];
}

// Sistema de eventos para partículas
export interface EventCondition {
  variable: 'x' | 'y' | 'z' | 't' | 'vx' | 'vy' | 'vz' | 'v';
  operator: '==' | '>' | '<' | '>=' | '<=' | '!=';
  value: number;
}

export interface EventAction {
  type: 'pause' | 'changeColor';
  payload?: string; // Para changeColor es el nuevo color
}

export interface ParticleEvent {
  id: number;
  name: string;
  conditions: EventCondition[];
  conditionLogic: 'AND' | 'OR';
  actions: EventAction[];
  triggered: boolean; // Para evitar que se dispare múltiples veces
  enabled: boolean;
}

export interface PData {
  id: number;
  p0_fis: [number, number, number];
  v0_fis: [number, number, number];
  a0_fis: [number, number, number];
  fx: string;
  fy: string;
  fz: string;
  curr_fis: [number, number, number];
  curr_vel: [number, number, number];
  t: number;
  trail_three: [number, number, number][];
  enSuelo: boolean;
  color: string;
  mass: number;
  isMassless: boolean;
  forces: Force[];
  events: ParticleEvent[];
}