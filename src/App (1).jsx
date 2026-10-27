import React, { useState } from 'react';
import { Zap, AlertTriangle, HelpCircle, Delete } from 'lucide-react';

/* ---------- Números complejos ---------- */
const parseComplex = (str) => {
  const bad = { r: 0, i: 0, valid: false };
  if (!str) return bad;
  const s = str.trim().toLowerCase().replace(/\s+/g, '')
    .replace(/,/g, '.').replace(/i/g, 'j').replace('°', '');

  const p = s.split(/[<∠]/);
  if (p.length === 2) {
    const mag = parseFloat(p[0]), deg = parseFloat(p[1]);
    if (isNaN(mag) || isNaN(deg)) return bad;
    const rad = (deg * Math.PI) / 180;
    return { r: mag * Math.cos(rad), i: mag * Math.sin(rad), valid: true };
  }

  const num = '(?:\\d+\\.?\\d*|\\.\\d+)';
  const unit = (t) => (t === '' || t === '+' ? 1 : t === '-' ? -1 : parseFloat(t));

  let m = s.match(new RegExp(`^([+-]?${num})([+-]${num}?)j$`));
  if (m) return { r: parseFloat(m[1]), i: unit(m[2]), valid: true };
  m = s.match(new RegExp(`^([+-]?${num}?)j$`));
  if (m) return { r: 0, i: unit(m[1]), valid: true };
  m = s.match(new RegExp(`^([+-]?${num})$`));
  if (m) return { r: parseFloat(m[1]), i: 0, valid: true };
  return bad;
};

const add = (a, b) => ({ r: a.r + b.r, i: a.i + b.i });
const multiply = (a, b) => ({ r: a.r * b.r - a.i * b.i, i: a.r * b.i + a.i * b.r });
const divide = (a, b) => {
  const d = b.r * b.r + b.i * b.i;
  if (d === 0) return { r: 0, i: 0 };
  return { r: (a.r * b.r + a.i * b.i) / d, i: (a.i * b.r - a.r * b.i) / d };
};

const fix = (v) => (Math.abs(v) < 0.005 ? 0 : v).toFixed(2);
const formatRect = (z) => {
  if (Math.abs(z.i) < 0.005) return `${fix(z.r)} Ω`;
  if (Math.abs(z.r) < 0.005) return `${z.i < 0 ? '-' : ''}${fix(Math.abs(z.i))}j Ω`;
  return `${fix(z.r)} ${z.i < 0 ? '-' : '+'} ${fix(Math.abs(z.i))}j Ω`;
};
const formatPolar = (z) => {
  const mag = Math.hypot(z.r, z.i);
  const deg = (Math.atan2(z.i, z.r) * 180) / Math.PI;
  return `${fix(mag)} ∠ ${fix(deg)}° Ω`;
};

/* ---------- Configuración ---------- */
const FIELDS = ['Zrs', 'Zst', 'Ztr'];
const KEYS = ['+', '-', 'j', '∠', '.'];
const PRESETS = {
  'RL equilibrada': { Zrs: '30+12j', Zst: '30+12j', Ztr: '30+12j' },
  'RC equilibrada': { Zrs: '20-15j', Zst: '20-15j', Ztr: '20-15j' },
  'Desequilibrada': { Zrs: '10+5j', Zst: '20+15j', Ztr: '15-10j' },
};

const Node = ({ x, y, color, label, dx = 0, dy = 0 }) => (
  <g>
    <circle cx={x} cy={y} r="9" fill={color} />
    <text x={x + dx} y={y + dy} fontSize="24" fontWeight="700" textAnchor="middle" fill={color}>{label}</text>
  </g>
);

export default function App() {
  const [inputs, setInputs] = useState(PRESETS['RL equilibrada']);
  const [active, setActive] = useState('Zrs');

  const parsed = Object.fromEntries(FIELDS.map((k) => [k, parseComplex(inputs[k])]));
  const { Zrs, Zst, Ztr } = parsed;
  const isValid = FIELDS.every((k) => parsed[k].valid);
  const zSum = add(add(Zrs, Zst), Ztr);
  const sumIsZero = isValid && Math.hypot(zSum.r, zSum.i) < 1e-9;
  const canCalc = isValid && !sumIsZero;

  const phases = [
    { name: 'Zr', title: 'Fase R', color: 'text-red-400', formula: 'Zrs · Ztr / ZΣ', z: divide(multiply(Zrs, Ztr), zSum) },
    { name: 'Zs', title: 'Fase S', color: 'text-amber-400', formula: 'Zrs · Zst / ZΣ', z: divide(multiply(Zrs, Zst), zSum) },
    { name: 'Zt', title: 'Fase T', color: 'text-blue-400', formula: 'Zst · Ztr / ZΣ', z: divide(multiply(Zst, Ztr), zSum) },
  ];

  const setField = (k, v) => setInputs((p) => ({ ...p, [k]: v }));
  const append = (ch) => setInputs((p) => ({ ...p, [active]: p[active] + ch }));
  const backspace = () => setInputs((p) => ({ ...p, [active]: p[active].slice(0, -1) }));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-md mx-auto px-4 pb-10">
        {/* Encabezado */}
        <header className="flex items-center gap-3 py-4">
          <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">Delta → Estrella</h1>
            <p className="text-xs text-slate-400">Conversión de impedancias trifásicas</p>
          </div>
        </header>

        {/* Presets */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
          {Object.entries(PRESETS).map(([label, values]) => (
            <button
              key={label}
              onClick={() => setInputs(values)}
              className="shrink-0 text-sm px-4 py-2 rounded-full bg-slate-800 active:bg-slate-700 text-slate-200"
            >
              {label}
            </button>
          ))}
        </div>

        {/* Diagramas */}
        <section className="mt-3 grid grid-cols-2 gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
            <p className="text-center text-sm font-semibold text-amber-400 mb-1">Delta (Δ)</p>
            <svg viewBox="0 0 300 270" className="w-full h-auto" role="img" aria-label="Triángulo con Zrs, Zst y Ztr">
              <polygon points="150,45 250,215 50,215" fill="none" stroke="#f59e0b" strokeWidth="6" strokeLinejoin="round" />
              <Node x={150} y={45} color="#f87171" label="R" dy={-16} />
              <Node x={250} y={215} color="#fbbf24" label="S" dx={20} dy={26} />
              <Node x={50} y={215} color="#60a5fa" label="T" dx={-20} dy={26} />
              <text x="228" y="118" fontSize="22" fill="#fcd34d">Zrs</text>
              <text x="150" y="250" fontSize="22" fill="#fcd34d" textAnchor="middle">Zst</text>
              <text x="72" y="118" fontSize="22" fill="#fcd34d" textAnchor="end">Ztr</text>
            </svg>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
            <p className="text-center text-sm font-semibold text-emerald-400 mb-1">Estrella (Y)</p>
            <svg viewBox="0 0 300 270" className="w-full h-auto" role="img" aria-label="Estrella con Zr, Zs y Zt">
              <g stroke="#10b981" strokeWidth="6" strokeLinecap="round">
                <line x1="150" y1="135" x2="150" y2="45" />
                <line x1="150" y1="135" x2="250" y2="215" />
                <line x1="150" y1="135" x2="50" y2="215" />
              </g>
              <circle cx="150" cy="135" r="7" fill="#cbd5e1" />
              <Node x={150} y={45} color="#f87171" label="R" dy={-16} />
              <Node x={250} y={215} color="#fbbf24" label="S" dx={20} dy={26} />
              <Node x={50} y={215} color="#60a5fa" label="T" dx={-20} dy={26} />
              <text x="164" y="95" fontSize="22" fill="#6ee7b7">Zr</text>
              <text x="212" y="168" fontSize="22" fill="#6ee7b7">Zs</text>
              <text x="88" y="168" fontSize="22" fill="#6ee7b7" textAnchor="end">Zt</text>
            </svg>
          </div>
        </section>

        {/* Entrada */}
        <section className="mt-4 bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <h2 className="text-base font-semibold mb-3">Impedancias de la delta</h2>
          <div className="space-y-3">
            {FIELDS.map((k) => (
              <div key={k} className="flex items-center gap-3">
                <label htmlFor={k} className="w-11 text-sm font-bold text-slate-300">{k}</label>
                <input
                  id={k}
                  type="text"
                  inputMode="text"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  value={inputs[k]}
                  onFocus={() => setActive(k)}
                  onChange={(e) => setField(k, e.target.value)}
                  placeholder="ej: 30+12j"
                  className={`flex-1 min-w-0 bg-slate-800 border-2 ${
                    parsed[k].valid
                      ? active === k ? 'border-amber-400' : 'border-slate-700'
                      : 'border-red-500'
                  } rounded-xl px-3 py-3 text-lg font-mono text-amber-300 focus:outline-none`}
                />
              </div>
            ))}
          </div>

          {/* Teclas rápidas */}
          <div className="mt-4 grid grid-cols-6 gap-2">
            {KEYS.map((ch) => (
              <button
                key={ch}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => append(ch)}
                className="py-3 rounded-xl bg-slate-800 active:bg-slate-700 text-lg font-mono text-slate-100"
              >
                {ch}
              </button>
            ))}
            <button
              onPointerDown={(e) => e.preventDefault()}
              onClick={backspace}
              aria-label="Borrar"
              className="py-3 rounded-xl bg-slate-800 active:bg-slate-700 flex items-center justify-center text-slate-100"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Escribe R + Xj (ej: 30+12j) o módulo ∠ ángulo (ej: 25∠30). Las teclas se agregan al campo seleccionado.
          </p>
        </section>

        {/* Resultados */}
        <section className="mt-4">
          <h2 className="text-base font-semibold mb-3">Equivalente en estrella</h2>

          {canCalc ? (
            <div className="space-y-3">
              {phases.map((p) => (
                <div key={p.name} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                  <div className="flex items-baseline justify-between">
                    <span className={`font-bold ${p.color}`}>{p.name} · {p.title}</span>
                    <span className="text-xs text-slate-500">{p.formula}</span>
                  </div>
                  <div className="mt-1 text-2xl font-mono font-semibold text-emerald-300 break-words">{formatRect(p.z)}</div>
                  <div className="text-sm font-mono text-slate-400">{formatPolar(p.z)}</div>
                </div>
              ))}
              <div className="rounded-2xl bg-slate-800/50 border border-slate-800 p-3 text-sm">
                <span className="text-slate-400">ZΣ = Zrs + Zst + Ztr = </span>
                <span className="font-mono text-amber-300">{formatRect(zSum)}</span>
              </div>
            </div>
          ) : sumIsZero ? (
            <div className="rounded-2xl bg-slate-900 border border-amber-500/30 p-6 text-center text-amber-400">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">ZΣ = 0: la suma de las tres impedancias no puede ser cero.</p>
            </div>
          ) : (
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 text-center text-slate-500">
              <HelpCircle className="w-8 h-8 mx-auto mb-2 opacity-60" />
              <p className="text-sm">Revisa los campos marcados en rojo (ej: 30+12j, -15j o 10∠30).</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
