// src/physics/Movimiento.ts

const formulaCache: Record<string, Function> = {};

// Extraemos todas las funciones y constantes de Math para inyectarlas
const mathKeys = Object.getOwnPropertyNames(Math);
const mathValues = mathKeys.map((key) => (Math as any)[key]);
const mathFunctions = new Set(
  mathKeys
    .filter((key) => typeof (Math as any)[key] === "function")
    .map((key) => key.toLowerCase())
);
const allowedVariables = new Set(["t", "x", "y", "z"]);
const identifierAliases: Record<string, string> = {
  pi: "PI",
  e: "E",
  ln: "log",
};

type FormulaToken = {
  type: "number" | "identifier" | "operator" | "paren" | "comma";
  value: string;
  index: number;
};

export interface FormulaError {
  message: string;
  index: number;
}

const isDigit = (char: string) => char >= "0" && char <= "9";
const isAlpha = (char: string) => /[a-zA-Z_]/.test(char);

const tokenizeFormula = (source: string): { tokens: FormulaToken[]; error?: FormulaError } => {
  const tokens: FormulaToken[] = [];
  let i = 0;

  while (i < source.length) {
    const char = source[i];

    if (char === " " || char === "\t" || char === "\n") {
      i += 1;
      continue;
    }

    if (isDigit(char) || (char === "." && isDigit(source[i + 1] ?? ""))) {
      const start = i;
      let num = char;
      i += 1;

      while (i < source.length && (isDigit(source[i]) || source[i] === ".")) {
        num += source[i];
        i += 1;
      }

      if ((source[i] === "e" || source[i] === "E") && isDigit(source[i + 1] ?? "")) {
        num += source[i];
        i += 1;
        if (source[i] === "+" || source[i] === "-") {
          num += source[i];
          i += 1;
        }
        while (i < source.length && isDigit(source[i])) {
          num += source[i];
          i += 1;
        }
      }

      tokens.push({ type: "number", value: num, index: start });
      continue;
    }

    if (isAlpha(char)) {
      const start = i;
      let id = char;
      i += 1;
      while (i < source.length && /[a-zA-Z0-9_]/.test(source[i])) {
        id += source[i];
        i += 1;
      }
      tokens.push({ type: "identifier", value: id, index: start });
      continue;
    }

    if (char === "+" || char === "-" || char === "*" || char === "/" || char === "^") {
      tokens.push({ type: "operator", value: char, index: i });
      i += 1;
      continue;
    }

    if (char === "(" || char === ")") {
      tokens.push({ type: "paren", value: char, index: i });
      i += 1;
      continue;
    }

    if (char === ",") {
      tokens.push({ type: "comma", value: char, index: i });
      i += 1;
      continue;
    }

    return {
      tokens: [],
      error: { message: `Caracter invalido: ${char}`, index: i },
    };
  }

  return { tokens };
};

const normalizeFormula = (formula: string): { normalized: string; error?: FormulaError } => {
  const source = formula.trim();
  if (!source) return { normalized: "" };

  const { tokens, error } = tokenizeFormula(source);
  if (error) return { normalized: "", error };

  const normalizedTokens: FormulaToken[] = [];
  const parenStack: number[] = [];

  for (const token of tokens) {
    if (token.type === "identifier") {
      const lower = token.value.toLowerCase();
      const alias = identifierAliases[lower];
      if (alias) {
        normalizedTokens.push({ ...token, value: alias });
        continue;
      }
      if (allowedVariables.has(lower)) {
        normalizedTokens.push({ ...token, value: lower });
        continue;
      }
      if (mathFunctions.has(lower)) {
        normalizedTokens.push({ ...token, value: lower });
        continue;
      }
      if (lower === "pi" || lower === "e") {
        normalizedTokens.push({ ...token, value: lower === "pi" ? "PI" : "E" });
        continue;
      }
      return {
        normalized: "",
        error: { message: `Identificador desconocido: ${token.value}`, index: token.index },
      };
    }

    if (token.type === "paren") {
      if (token.value === "(") {
        parenStack.push(token.index);
      } else if (!parenStack.length) {
        return {
          normalized: "",
          error: { message: "Parentesis de cierre sin abrir", index: token.index },
        };
      } else {
        parenStack.pop();
      }
    }

    normalizedTokens.push(token);
  }

  if (parenStack.length) {
    return {
      normalized: "",
      error: { message: "Parentesis sin cerrar", index: parenStack[parenStack.length - 1] },
    };
  }

  const shouldInsertMult = (prev: FormulaToken, next: FormulaToken) => {
    if (!prev || !next) return false;
    if (prev.type === "operator" || prev.value === "(" || prev.value === ",") return false;
    if (next.type === "operator" || next.value === ")" || next.value === ",") return false;
    if (prev.type === "identifier" && mathFunctions.has(prev.value) && next.value === "(") return false;
    return true;
  };

  const output: string[] = [];
  for (let i = 0; i < normalizedTokens.length; i += 1) {
    const token = normalizedTokens[i];
    const prev = normalizedTokens[i - 1];
    if (prev && shouldInsertMult(prev, token)) {
      output.push("*");
    }
    output.push(token.value);
  }

  const normalized = output.join("").replace(/\^/g, "**");
  return { normalized };
};

export const getFormulaError = (formula: string): FormulaError | null => {
  if (!formula || formula.trim() === "") return null;
  const parsed = normalizeFormula(formula);
  if (parsed.error) return parsed.error;
  try {
    new Function("t", "x", "y", "z", ...mathKeys, `return (${parsed.normalized});`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Formula invalida";
    return { message, index: -1 };
  }
  return null;
};

export const evaluarFormula = (
  formula: string,
  t: number,
  x: number = 0,
  y: number = 0,
  z: number = 0
): number => {
  try {
    if (!formula || formula.trim() === "" || formula === "0") return 0;
    const parsed = normalizeFormula(formula);
    if (parsed.error || !parsed.normalized) return 0;
    const cacheKey = parsed.normalized;
    let fn = formulaCache[cacheKey];

    if (!fn) {
      // Creamos la función inyectando t, x, y, z Y todas las funciones de Math
      fn = new Function(
        "t", "x", "y", "z", ...mathKeys,
        `return (function() { 
          try { 
            return ${cacheKey}; 
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
  triggerMode?: 'once' | 'multi';
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
  kinematicMode?: 'position' | 'velocity' | 'acceleration';
  trailWidth?: number;
  trailLength?: number;
  forces: Force[];
  events: ParticleEvent[];
}