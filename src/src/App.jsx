import React, { useState } from 'react';
import { Zap, HelpCircle, Layers, CheckCircle2, AlertTriangle } from 'lucide-react';

/* ---------- Números complejos ---------- */
const parseComplex = (str) => {
  const bad = { r: 0, i: 0, valid: false };
  if (!str) return bad;
  const s = str.trim().toLowerCase().replace(/\s+/g, '')
    .replace(/,/g, '.').replace(/i/g, 'j').replace('°', '');

  // Polar: 25<30 o 25∠30
  const p = s.split(/[<∠]/);
  if (p.length === 2) {
    const mag = parseFloat(p[0]), deg = parseFloat(p[1]);
    if (isNaN(mag) || isNaN(deg)) return bad;
    const rad = (deg * Math.PI) / 180;
    return { r: mag * Math.cos(rad), i: mag * Math.sin(rad), valid: true };
  }

  const num = '(?:\\d+\\.?\\d*|\\.\\d+)';
  const unit = (t) => (t === '' || t === '+' ? 1 : t === '-' ? -1 : parseFloat(t));

  let m = s.match(new RegExp(`^([+-]?${num})([+-]${num}?)j$`)); // a+bj
  if (m) return { r: parseFloat(m[1]), i: unit(m[2]), valid: true };

  m = s.match(new RegExp(`^([+-]?${num}?)j$`));                  // bj
  if (m) return { r: 0, i: unit(m[1]), valid: true };

  m = s.match(new RegExp(`^([+-]?${num})$`));                    // a
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
const DELTA_FIELDS = ['Zrs', 'Zst', 'Ztr'];

const PRESETS = {
  'Carga RL equilibrada': { Zrs: '30+12j', Zst: '30+12j', Ztr: '30+12j' },
  'Carga RC equilibrada': { Zrs: '20-15j', Zst: '20-15j', Ztr: '20-15j' },
  'Carga desequilibrada': { Zrs: '10+5j', Zst: '20+15j', Ztr: '15-10j' },
};

export default function App() {
  const [inputs, setInputs] = useState(PRESETS['Carga RL equilibrada']);

  const parsed = Object.fromEntries(DELTA_FIELDS.map((k) => [k, parseComplex(inputs[k])]));
  const { Zrs, Zst, Ztr } = parsed;

  const isValid = DELTA_FIELDS.every((k) => parsed[k].valid);
  const zSum = add(add(Zrs, Zst), Ztr);
  const sumIsZero = isValid && Math.hypot(zSum.r, zSum.i) < 1e-9;
  const canCalc = isValid && !sumIsZero;

  // Conversión Δ → Y (R-S-T)
  const Zr = divide(multiply(Zrs, Ztr), zSum);
  const Zs = divide(multiply(Zrs, Zst), zSum);
  const Zt = divide(multiply(Zst, Ztr), zSum);

  const phases = [
    { name: 'Zr', title: 'Fase R', color: 'text-red-400', formula: '(Zrs · Ztr) / ZΣ', z: Zr },
    { name: 'Zs', title: 'Fase S', color: 'text-amber-400', formula: '(Zrs · Zst) / ZΣ', z: Zs },
    { name: 'Zt', title: 'Fase T', color: 'text-blue-400', formula: '(Zst · Ztr) / ZΣ', z: Zt },
  ];

  const handleInputChange = (e) => setInputs({ ...inputs, [e.target.name]: e.target.value });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Encabezado */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur px-6 py-4 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-amber-400 to-amber-200 bg-clip-text text-transparent">
              Calculadora Trifásica Delta a Estrella
            </h1>
            <p className="text-xs text-slate-400">
              Conversión de impedancias en secuencia RST (sentido horario)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {Object.entries(PRESETS).map(([label, values]) => (
            <button
              key={label}
              onClick={() => setInputs(values)}
              className="text-xs px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Columna izquierda: esquemas y entradas */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-400" /> Esquema electrotécnico (RST)
              </h2>
              <span className="text-xs bg-amber-400/10 text-amber-400 border border-amber-400/20 px-2 py-1 rounded">
                Formato: R + Xj o |Z| &lt; θ°
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Delta */}
              <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800/80 flex flex-col items-center">
                <span className="text-sm font-semibold text-amber-400 mb-2">Carga en Delta (Δ)</span>

                <svg viewBox="0 0 300 280" className="w-full max-w-[240px] h-auto" role="img" aria-label="Triángulo con impedancias Zrs, Zst y Ztr">
                  <line x1="150" y1="40" x2="250" y2="220" stroke="#f59e0b" strokeWidth="4" />
                  <line x1="250" y1="220" x2="50" y2="220" stroke="#f59e0b" strokeWidth="4" />
                  <line x1="50" y1="220" x2="150" y2="40" stroke="#f59e0b" strokeWidth="4" />

                  <circle cx="150" cy="40" r="8" className="fill-red-500" />
                  <text x="150" y="25" textAnchor="middle" className="fill-red-400 text-sm font-bold">R</text>
                  <circle cx="250" cy="220" r="8" className="fill-amber-500" />
                  <text x="270" y="225" textAnchor="start" className="fill-amber-400 text-sm font-bold">S</text>
                  <circle cx="50" cy="220" r="8" className="fill-blue-500" />
                  <text x="30" y="225" textAnchor="end" className="fill-blue-400 text-sm font-bold">T</text>

                  <text x="215" y="125" className="fill-amber-300 text-xs font-semibold">Zrs</text>
                  <text x="150" y="245" textAnchor="middle" className="fill-amber-300 text-xs font-semibold">Zst</text>
                  <text x="85" y="125" className="fill-amber-300 text-xs font-semibold">Ztr</text>
                </svg>

                <div className="w-full space-y-2 mt-2">
                  {DELTA_FIELDS.map((k) => (
                    <div key={k} className="flex items-center gap-2">
                      <label htmlFor={k} className="text-xs font-bold text-slate-400 w-10">{k}:</label>
                      <input
                        id={k}
                        type="text"
                        name={k}
                        value={inputs[k]}
                        onChange={handleInputChange}
                        placeholder="ej: 30+12j"
                        className={`flex-1 bg-slate-800 border ${parsed[k].valid ? 'border-slate-700 focus:border-amber-400' : 'border-red-500'} rounded px-2.5 py-1 text-sm font-mono text-amber-300 focus:outline-none`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Estrella */}
              <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800/80 flex flex-col items-center">
                <span className="text-sm font-semibold text-emerald-400 mb-2">Equivalente Estrella (Y)</span>

                <svg viewBox="0 0 300 280" className="w-full max-w-[240px] h-auto" role="img" aria-label="Estrella con impedancias Zr, Zs y Zt">
                  <line x1="150" y1="140" x2="150" y2="40" stroke="#10b981" strokeWidth="4" />
                  <line x1="150" y1="140" x2="250" y2="220" stroke="#10b981" strokeWidth="4" />
                  <line x1="150" y1="140" x2="50" y2="220" stroke="#10b981" strokeWidth="4" />

                  <circle cx="150" cy="140" r="6" className="fill-slate-300" />
                  <text x="165" y="145" className="fill-slate-400 text-xs">N</text>

                  <circle cx="150" cy="40" r="8" className="fill-red-500" />
                  <text x="150" y="25" textAnchor="middle" className="fill-red-400 text-sm font-bold">R</text>
                  <circle cx="250" cy="220" r="8" className="fill-amber-500" />
                  <text x="270" y="225" textAnchor="start" className="fill-amber-400 text-sm font-bold">S</text>
                  <circle cx="50" cy="220" r="8" className="fill-blue-500" />
                  <text x="30" y="225" textAnchor="end" className="fill-blue-400 text-sm font-bold">T</text>

                  <text x="165" y="85" className="fill-emerald-300 text-xs font-semibold">Zr</text>
                  <text x="215" y="175" className="fill-emerald-300 text-xs font-semibold">Zs</text>
                  <text x="85" y="175" className="fill-emerald-300 text-xs font-semibold">Zt</text>
                </svg>

                <div className="w-full space-y-2 mt-2">
                  {phases.map((p) => (
                    <div key={p.name} className="bg-slate-900 p-2 rounded border border-slate-800 flex justify-between items-center text-xs">
                      <span className={`font-bold ${p.color}`}>{p.name}:</span>
                      <span className="font-mono text-emerald-300">{canCalc ? formatRect(p.z) : '---'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Columna derecha: resultados */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl flex-1 flex flex-col">
            <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Resultados obtenidos
            </h2>

            {canCalc ? (
              <div className="space-y-4 flex-1 flex flex-col justify-between">
                {phases.map((p) => (
                  <div key={p.name} className="p-4 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-bold ${p.color}`}>Impedancia {p.name} ({p.title})</span>
                      <span className="text-xs text-slate-500">{p.formula}</span>
                    </div>
                    <div className="text-base font-mono text-slate-100 font-semibold">{formatRect(p.z)}</div>
                    <div className="text-xs font-mono text-slate-400">{formatPolar(p.z)}</div>
                  </div>
                ))}

                <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-800 text-xs">
                  <span className="text-slate-400 block mb-1">Suma de la malla Delta (ZΣ = Zrs + Zst + Ztr):</span>
                  <div className="font-mono text-amber-300 font-semibold">{formatRect(zSum)}</div>
                </div>
              </div>
            ) : sumIsZero ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-amber-400">
                <AlertTriangle className="w-10 h-10 mb-2" />
                <p className="text-sm">ZΣ = 0: la suma de las tres impedancias de la delta no puede ser cero. Cambia algún valor.</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500">
                <HelpCircle className="w-10 h-10 mb-2 opacity-50" />
                <p className="text-sm">Ingresa expresiones válidas en todos los campos (ej: 30+12j, -15j o 10&lt;30°)</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
