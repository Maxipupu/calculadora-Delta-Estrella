import React, { useState } from 'react';
import { ArrowLeft, Calculator, RotateCcw, Delete, History } from 'lucide-react';
import { calcularExpresion, formatearResultado } from './calcCientifica.js';

const BUTTONS = [
  ['DEG', 'angle'], ['(', 'func'], [')', 'func'], ['AC', 'clear'], ['⌫', 'delete'],
  ['sin', 'func'], ['cos', 'func'], ['tan', 'func'], ['π', 'func'], ['^', 'func'],
  ['log', 'func'], ['ln', 'func'], ['√', 'func'], ['x²', 'func'], ['÷', 'op'],
  ['7', 'digit'], ['8', 'digit'], ['9', 'digit'], ['Ans', 'func'], ['×', 'op'],
  ['4', 'digit'], ['5', 'digit'], ['6', 'digit'], ['!', 'func'], ['−', 'op'],
  ['1', 'digit'], ['2', 'digit'], ['3', 'digit'], ['%', 'func'], ['+', 'op'],
  ['±', 'func'], ['0', 'digit'], ['.', 'digit'], ['e', 'func'], ['=', 'equal'],
];

export default function Cientifica({ onBack }) {
  const [expression, setExpression] = useState('');
  const [angulos, setAngulos] = useState('DEG');
  const [ans, setAns] = useState(0);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const [justSolved, setJustSolved] = useState(false);
  let preview = null;
  if (expression) {
    try { preview = formatearResultado(calcularExpresion(expression, { angulos, ans })); } catch { /* expresión parcial */ }
  }

  const write = (value) => {
    setError('');
    if (value === 'AC') { setExpression(''); setJustSolved(false); return; }
    if (value === '⌫') { setExpression(p => p.slice(0, -1)); setJustSolved(false); return; }
    if (value === 'DEG' || value === 'RAD') { setAngulos(p => p === 'DEG' ? 'RAD' : 'DEG'); return; }
    if (value === '=') {
      try {
        const res = calcularExpresion(expression, { angulos, ans });
        const formatted = formatearResultado(res);
        setAns(res);
        setHistory(h => [{ expression, result: formatted }, ...h].slice(0, 6));
        setExpression(formatted);
        setJustSolved(true);
      } catch (e) { setError(e.message); }
      return;
    }
    const symbol = ({ sin: 'sin(', cos: 'cos(', tan: 'tan(', log: 'log(', ln: 'ln(', '√': '√(', 'x²': '^2', '±': '±' })[value] || value;
    setExpression(p => {
      if (value === '±') return p ? `−(${p})` : '−';
      const fresh = justSolved && /^[0-9.πe]|^(sin|cos|tan|log|ln|√|Ans|\()/.test(value);
      return (fresh ? '' : p) + symbol;
    });
    setJustSolved(false);
  };

  return (
    <main className="electric-home electric-scientific min-h-screen text-slate-100 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="electric-shell mx-auto px-4 pb-12">
        <header className="electric-calc-header">
          <button type="button" className="electric-calc-back" aria-label="Volver al inicio" onClick={onBack}><ArrowLeft size={22}/></button>
          <span className="electric-calc-head-icon"><Calculator size={20}/></span>
          <div><p className="electric-eyebrow">ELECTROCALC · HERRAMIENTAS</p><h1 className="electric-calc-title">Calculadora científica</h1></div>
        </header>
        <section className="electric-calc-screen" aria-label="Pantalla de calculadora">
          <div className="electric-calc-mode"><span>CIENTÍFICA</span><span>{angulos === 'DEG' ? 'ÁNGULOS EN GRADOS' : 'ÁNGULOS EN RADIANES'}</span></div>
          <input aria-label="Expresión matemática" spellCheck={false} autoCapitalize="off" autoComplete="off" className="electric-calc-expression" type="text" value={expression} onChange={e => { setExpression(e.target.value.slice(0, 240)); setJustSolved(false); setError(''); }} placeholder="0" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); write('='); } }} />
          <div className="electric-calc-answer" aria-live="polite">{error ? <span className="electric-calc-error">{error}</span> : preview !== null ? `= ${preview}` : 'Ingresa una operación'}</div>
        </section>
        <div className="electric-calc-hint"><span>sin · cos · tan · log · ln · raíz · potencias</span><span>Ans: {formatearResultado(ans)}</span></div>
        <div className="electric-calc-keys" role="group" aria-label="Teclado científico">
          {BUTTONS.map(([label, kind], idx) => <button key={`${label}-${idx}`} type="button" className={`electric-calc-key key-${kind}`} aria-label={label === '⌫' ? 'Borrar último carácter' : label === 'AC' ? 'Limpiar' : label} onClick={() => write(label === 'DEG' ? angulos : label)}>
            {label === '⌫' ? <Delete size={21}/> : label === 'AC' ? <RotateCcw size={21}/> : label === 'DEG' ? angulos : label}
          </button>)}
        </div>
        {history.length > 0 && <section className="electric-calc-history"><h2><History size={17}/> Historial reciente</h2>{history.map((item, i) => <button key={`${i}-${item.expression}`} type="button" onClick={() => { setExpression(item.expression); setJustSolved(false); setError(''); }}><span>{item.expression}</span><strong>= {item.result}</strong></button>)}</section>}
        <p className="electric-calc-footnote">Resultados aproximados. La trigonometría usa el modo DEG/RAD seleccionado.</p>
      </div>
    </main>
  );
}
