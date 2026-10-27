/** Motor de expresiones científicas sin eval ni ejecución de código arbitrario. */
const FUNCTIONS = new Set(['sin', 'cos', 'tan', 'log', 'ln', 'sqrt', 'abs']);
const normalize = (source) => String(source).replace(/,/g, '.').replace(/[−–]/g, '-').replace(/×/g, '*').replace(/[÷]/g, '/').replace(/√/g, 'sqrt').replace(/π/g, 'pi').replace(/\bAns\b/gi, 'ans');

export function tokenizar(source) {
  const input = normalize(source);
  if (input.length > 240) throw new Error('La expresión es demasiado larga.');
  const tokens = [];
  let i = 0;
  while (i < input.length) {
    if (/\s/.test(input[i])) { i++; continue; }
    const match = input.slice(i).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i);
    if (match) {
      const n = Number(match[0]);
      if (!Number.isFinite(n)) throw new Error('Número fuera de rango.');
      tokens.push({ type: 'number', value: n });
      i += match[0].length;
      continue;
    }
    const word = input.slice(i).match(/^[a-z]+/i);
    if (word) {
      const name = word[0].toLowerCase();
      if (!FUNCTIONS.has(name) && !['pi', 'e', 'ans'].includes(name)) throw new Error(`Operación desconocida: ${word[0]}`);
      tokens.push({ type: FUNCTIONS.has(name) ? 'function' : 'constant', value: name });
      i += word[0].length;
      continue;
    }
    if ('+-*/^()%!'.includes(input[i])) { tokens.push({ type: input[i], value: input[i] }); i++; continue; }
    throw new Error(`Símbolo no válido: ${input[i]}`);
  }
  // Admite 2π, 2(3+4) y 2sin(30), no código arbitrario.
  const expanded = [];
  for (const curr of tokens) {
    const prev = expanded.at(-1);
    if (prev && ['number', 'constant', ')', '!', '%'].includes(prev.type) &&
        ['constant', 'function', '('].includes(curr.type)) {
      expanded.push({ type: '*', value: '*' });
    }
    expanded.push(curr);
  }
  return expanded;
}

export function calcularExpresion(source, { angulos = 'DEG', ans = 0 } = {}) {
  const tokens = tokenizar(source);
  if (!tokens.length) throw new Error('Escribe una operación.');
  let pos = 0;
  const peek = () => tokens[pos]?.type;
  const pop = (type) => {
    if (peek() !== type) throw new Error('Revisa los operadores y paréntesis.');
    pos++;
  };
  const finite = (n) => {
    if (!Number.isFinite(n)) throw new Error('El resultado no es un número real válido.');
    return n;
  };
  const suma = () => {
    let v = producto();
    while (peek() === '+' || peek() === '-') {
      const op = tokens[pos++].type;
      v = finite(op === '+' ? v + producto() : v - producto());
    }
    return v;
  };
  const producto = () => {
    let v = unario();
    while (peek() === '*' || peek() === '/') {
      const op = tokens[pos++].type;
      const b = unario();
      if (op === '/' && b === 0) throw new Error('No se puede dividir por cero.');
      v = finite(op === '*' ? v * b : v / b);
    }
    return v;
  };
  const unario = () => {
    if (peek() === '+') { pos++; return unario(); }
    if (peek() === '-') { pos++; return finite(-unario()); }
    return potencia();
  };
  const potencia = () => {
    const base = postfijo();
    if (peek() === '^') {
      pos++;
      return finite(Math.pow(base, unario())); // potencia asociativa por la derecha
    }
    return base;
  };
  const postfijo = () => {
    let v = atomo();
    while (peek() === '!' || peek() === '%') {
      const op = tokens[pos++].type;
      if (op === '%') v /= 100;
      else {
        if (!Number.isInteger(v) || v < 0 || v > 170) throw new Error('n! admite enteros de 0 a 170.');
        let total = 1;
        for (let i = 2; i <= v; i++) total *= i;
        v = total;
      }
      v = finite(v);
    }
    return v;
  };
  const atomo = () => {
    if (peek() === 'number') return tokens[pos++].value;
    if (peek() === 'constant') {
      const name = tokens[pos++].value;
      return name === 'pi' ? Math.PI : name === 'e' ? Math.E : ans;
    }
    if (peek() === '(') {
      pos++;
      const v = suma();
      pop(')');
      return v;
    }
    if (peek() === 'function') {
      const fn = tokens[pos++].value;
      pop('(');
      const v = suma();
      pop(')');
      const rad = angulos === 'DEG' ? v * Math.PI / 180 : v;
      const res = {
        sin: () => Math.sin(rad), cos: () => Math.cos(rad),
        tan: () => { if (Math.abs(Math.cos(rad)) < 1e-12) throw new Error('Tangente indefinida para este ángulo.'); return Math.tan(rad); },
        log: () => Math.log10(v), ln: () => Math.log(v),
        sqrt: () => Math.sqrt(v), abs: () => Math.abs(v),
      }[fn]();
      return finite(res);
    }
    throw new Error('Expresión incompleta.');
  };
  const result = finite(suma());
  if (pos !== tokens.length) throw new Error('Revisa los paréntesis o la expresión.');
  return Math.abs(result) < 1e-12 ? 0 : result;
}

export function formatearResultado(n) {
  if (!Number.isFinite(n)) return 'Error';
  if (n === 0) return '0';
  const abs = Math.abs(n);
  if (abs >= 1e12 || abs < 1e-8) return Number(n.toPrecision(9)).toExponential(6).replace('e+', 'e+');
  return String(Number(n.toPrecision(11)));
}
