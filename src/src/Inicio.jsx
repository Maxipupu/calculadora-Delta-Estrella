import React, { useState } from 'react';
import { Triangle, Cable, Zap, CircuitBoard } from 'lucide-react';
import DeltaEstrella from './App.jsx';
import Linea from './Linea.jsx';
import Trifasica from './Trifasica.jsx';
import { Back } from './ui.jsx';

const TOOLS = [
  { id: 'de', name: 'Delta ↔ Estrella', desc: 'Conversión de impedancias', icon: Triangle, color: 'text-amber-400' },
  { id: 'linea', name: 'Línea con cargas', desc: 'Monofásico: Vs, Vc, P, Q, S, FP', icon: Cable, color: 'text-emerald-400' },
  { id: 'tri', name: 'Trifásico', desc: 'Carga delta desbalanceada', icon: Zap, color: 'text-blue-400' },
  { id: 'circ', name: 'Circuitos', desc: 'Nodos, superposición, energía', icon: CircuitBoard, color: 'text-slate-500', soon: true },
];

export default function Inicio() {
  const [tool, setTool] = useState(null);
  const back = () => setTool(null);

  if (tool === 'de') return (<><Back onBack={back} /><DeltaEstrella /></>);
  if (tool === 'linea') return <Linea onBack={back} />;
  if (tool === 'tri') return <Trifasica onBack={back} />;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-md mx-auto px-4 pb-10">
        <h1 className="text-2xl font-bold pt-8">Redes eléctricas</h1>
        <p className="text-sm text-slate-400 mb-6">Elige una herramienta</p>
        <div className="grid grid-cols-2 gap-3">
          {TOOLS.map(({ id, name, desc, icon: Icon, color, soon }) => (
            <button key={id} disabled={soon} onClick={() => setTool(id)}
              className={`text-left bg-slate-900 border border-slate-800 rounded-2xl p-4 min-h-[9rem] flex flex-col ${soon ? 'opacity-50' : 'active:bg-slate-800'}`}>
              <Icon className={`w-8 h-8 ${color}`} />
              <span className="mt-auto font-semibold">{name}</span>
              <span className="text-xs text-slate-400">{soon ? 'Próximamente' : desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
