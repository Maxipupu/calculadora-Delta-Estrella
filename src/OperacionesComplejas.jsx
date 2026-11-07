import React, { useMemo, useState } from 'react';
import { ArrowLeft, Calculator, RotateCcw, Copy, Check, Info } from 'lucide-react';
import { solveComplex, formatRectangular, formatPolar } from './operacionesComplejas.js';

const examples = [
  { title: 'Mixta', left: '3+4j', right: '5∠30°', operation: '×' },
  { title: 'Rectangulares', left: '2-3j', right: '4+2j', operation: '+' },
  { title: 'Polares', left: '10∠45°', right: '4∠-20°', operation: '÷' },
];
const operations = ['+', '-', '×', '÷'];

export default function OperacionesComplejas({ onBack }) {
  const [left, setLeft] = useState('3+4j');
  const [right, setRight] = useState('5∠30°');
  const [operation, setOperation] = useState('×');
  const [digits, setDigits] = useState(4);
  const [copied, setCopied] = useState(false);
  const calculated = useMemo(() => {
    try { return { data: solveComplex(left, right, operation), error: null }; }
    catch (err) { return { data: null, error: err.message }; }
  }, [left, right, operation]);
  const setExample = (e) => { setLeft(e.left); setRight(e.right); setOperation(e.operation); setCopied(false); };
  const copyResult = async () => {
    if (!calculated.data) return;
    try {
      await navigator.clipboard.writeText(`${formatRectangular(calculated.data.result, digits)}\n${formatPolar(calculated.data.result, digits)}`);
      setCopied(true);
    } catch { setCopied(false); }
  };

  return <main className="electric-home complex-page text-slate-100 min-h-screen pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
    <div className="electric-shell mx-auto px-4 pb-12">
      <header className="complex-header">
        <button type="button" className="electric-calc-back" onClick={onBack} aria-label="Volver al inicio"><ArrowLeft size={21}/></button>
        <span className="electric-calc-head-icon"><Calculator size={22}/></span>
        <div><h1 className="electric-calc-title">Operaciones complejas</h1><p className="complex-muted">Rectangular y polar, sin conversión manual</p></div>
      </header>

      <section className="complex-panel" aria-label="Datos para operar">
        <div className="complex-heading"><h2>Introduce tus números</h2><button type="button" onClick={() => setExample(examples[0])} className="complex-reset"><RotateCcw size={15}/> Reiniciar</button></div>
        <label className="complex-label" htmlFor="complex-left">Número A</label>
        <input id="complex-left" className="complex-input" type="text" inputMode="text" autoCapitalize="off" autoCorrect="off" spellCheck={false} value={left} onChange={e => { setLeft(e.target.value); setCopied(false); }} placeholder="Ej. 3+4j o 5∠30°" />
        <label className="complex-label" id="complex-operation-label">Operación</label>
        <div className="complex-operations" role="group" aria-labelledby="complex-operation-label">
          {operations.map(op => <button key={op} type="button" className={operation === op ? 'active' : ''} aria-pressed={operation === op} onClick={() => { setOperation(op); setCopied(false); }}>{op}</button>)}
        </div>
        <label className="complex-label" htmlFor="complex-right">Número B</label>
        <input id="complex-right" className="complex-input" type="text" inputMode="text" autoCapitalize="off" autoCorrect="off" spellCheck={false} value={right} onChange={e => { setRight(e.target.value); setCopied(false); }} placeholder="Ej. 4-2j o 10∠-45°" />
        <div className="complex-hint"><Info size={16}/> Acepta 3+4j, 3-4i, -j, 5∠30°, 5&lt;30 o un número real. Puedes usar coma decimal.</div>
      </section>

      <section className="complex-panel" aria-label="Resultado">
        <div className="complex-heading"><h2>Resultado</h2><label className="complex-precision" htmlFor="complex-decimals">Decimales <select id="complex-decimals" value={digits} onChange={e => setDigits(Number(e.target.value))}>{[2, 3, 4, 6, 8].map(n => <option key={n} value={n}>{n}</option>)}</select></label></div>
        {calculated.error ? <p className="complex-error" role="alert">{calculated.error}</p> : <>
          <p className="complex-result-label">Forma rectangular (a + bj)</p>
          <p className="complex-result-value">{formatRectangular(calculated.data.result, digits)}</p>
          <div className="complex-rule"/>
          <p className="complex-result-label">Forma polar (módulo ∠ ángulo)</p>
          <p className="complex-result-value complex-accent">{formatPolar(calculated.data.result, digits)}</p>
          <button type="button" className="complex-copy" onClick={copyResult}>{copied ? <Check size={17}/> : <Copy size={17}/>} {copied ? 'Copiado' : 'Copiar ambos resultados'}</button>
        </>}
      </section>

      {calculated.data && <section className="complex-panel" aria-label="Procedimiento">
        <h2>Procedimiento</h2>
        <p className="complex-muted">La app interpreta ambos formatos y opera internamente con sus valores equivalentes, sin que tengas que convertirlos.</p>
        <div className="complex-step"><span>1. Número A</span><strong>{formatRectangular(calculated.data.a, digits)}</strong><small>{formatPolar(calculated.data.a, digits)}</small></div>
        <div className="complex-step"><span>2. Número B</span><strong>{formatRectangular(calculated.data.b, digits)}</strong><small>{formatPolar(calculated.data.b, digits)}</small></div>
        <div className="complex-step"><span>3. Operación: {operation}</span><strong>{formatRectangular(calculated.data.result, digits)}</strong></div>
      </section>}

      <section className="complex-panel"><h2>Ejemplos rápidos</h2><div className="complex-examples">{examples.map(e => <button type="button" key={e.title} onClick={() => setExample(e)}>{e.title}<small>{e.left} {e.operation} {e.right}</small></button>)}</div></section>
    </div>
  </main>;
}
