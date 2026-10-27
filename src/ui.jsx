import React from 'react';
import { ArrowLeft } from 'lucide-react';

export const Page = ({ title, onBack, children }) => (
  <div className="electric-home min-h-screen text-slate-100 font-sans pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
    <div className="max-w-md mx-auto px-4 pb-10">
      <div className="flex items-center gap-2 py-3">
        <button onClick={onBack} aria-label="Volver al inicio" className="p-2 -ml-2 rounded-full active:bg-slate-800">
          <ArrowLeft className="w-6 h-6" />
        </button>
        {title && <h1 className="text-lg font-bold">{title}</h1>}
      </div>
      {children}
    </div>
  </div>
);

export const Back = ({ onBack }) => (
  <div className="electric-home text-slate-100 pt-[env(safe-area-inset-top)]">
    <button onClick={onBack} className="flex items-center gap-2 px-4 py-3 text-sm active:bg-slate-900">
      <ArrowLeft className="w-5 h-5" /> Inicio
    </button>
  </div>
);

export const Card = ({ title, children }) => (
  <section className="mt-4 bg-slate-900 border border-slate-800 rounded-2xl p-4">
    {title && <h2 className="text-base font-semibold mb-3">{title}</h2>}
    {children}
  </section>
);

export const Field = ({ label, value, onChange, placeholder, bad }) => (
  <label className="flex items-center gap-3 mb-3 last:mb-0">
    <span className="w-14 shrink-0 text-sm font-bold text-slate-300">{label}</span>
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoCapitalize="off" autoCorrect="off" spellCheck={false}
      className={`flex-1 min-w-0 bg-slate-800 border-2 ${bad ? 'border-red-500' : 'border-slate-700 focus:border-amber-400'} rounded-xl px-3 py-2.5 text-lg font-mono text-amber-300 focus:outline-none`}
    />
  </label>
);

export const Seg = ({ value, onChange, options }) => (
  <div className="flex gap-2 mb-3">
    {options.map(([v, label]) => (
      <button key={v} onClick={() => onChange(v)}
        className={`flex-1 py-2.5 rounded-xl text-sm ${value === v ? 'bg-amber-500 text-slate-950 font-semibold' : 'bg-slate-800 text-slate-200 active:bg-slate-700'}`}>
        {label}
      </button>
    ))}
  </div>
);

export const Res = ({ label, value, sub, color = 'text-emerald-300' }) => (
  <div className="py-2 border-b border-slate-800 last:border-0">
    <div className="text-xs text-slate-400">{label}</div>
    <div className={`text-lg font-mono font-semibold break-words ${color}`}>{value}</div>
    {sub && <div className="text-sm font-mono text-slate-400 break-words">{sub}</div>}
  </div>
);

export const Note = ({ children, warn }) => (
  <p className={`mt-3 text-xs ${warn ? 'text-amber-400' : 'text-slate-500'}`}>{children}</p>
);
