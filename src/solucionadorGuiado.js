// Solución inversa de una única variable desconocida con una medición independiente.
// Solo circuitos lineales RLC con fuentes independientes, CC estacionaria o CA senoidal.
import { C, add, sub, div, mul, abs, ok, parseComplex } from './calc.js';
import { resolver, si } from './calc3.js';

const error = (message) => ({ error: message });
export const unitFor = (type) => type === 'R' ? 'Ω' : type === 'C' ? 'F' : type === 'L' ? 'H' : type === 'V' ? 'V' : 'A';
export const isMissing = (s) => String(s ?? '').trim() === '?' || String(s ?? '').trim() === '';
export const parseValue = (s, type, ac) => {
  if (isMissing(s)) return null;
  const number = si(s);
  if (Number.isFinite(number)) return C(number);
  if ((type === 'V' || type === 'I') && ac) {
    const value = parseComplex(s);
    return ok(value) ? value : null;
  }
  return null;
};
export const prepareUnknownCircuit = (raw, ac = false) => {
  const unknowns = [];
  const els = raw.map((e, k) => {
    const a = Number(e.a), b = Number(e.b);
    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0 || a === b) return null;
    const v = parseValue(e.v, e.t, ac);
    if (!v) {
      if (!isMissing(e.v)) return null;
      unknowns.push(k);
      return { t:e.t, a, b, v:C(1) };
    }
    if (['R','C','L'].includes(e.t) && (v.r <= 0 || v.i !== 0)) return null;
    return { t:e.t, a, b, v };
  });
  return els.some(x=>!x) ? error('Hay valores o nodos inválidos. Usa valores con prefijos SI, por ejemplo 2k, 33u o 0.5.') : { els, unknowns };
};
const measured = (solution, measurement) => {
  if (measurement.kind === 'node') return solution.Vn[Number(measurement.node)] ?? null;
  const item = solution.res[Number(measurement.index)];
  return item ? item[measurement.kind] : null;
};
const residual = (actual, target, mode) => mode === 'magnitude' ? Math.abs(abs(actual) - abs(target)) : abs(sub(actual, target));
const near = (a,b) => Math.abs(a-b) <= 1e-7 * Math.max(1,Math.abs(a),Math.abs(b));
const solveFor = (els, w, idx, test, measurement) => {
  const modified = els.map((e,k)=> k===idx ? {...e,v:test} : e);
  const result = resolver(modified,w);
  return result ? measured(result,measurement) : null;
};
const graphValid = (els) => {
  const nodes = new Set(els.flatMap(e=>[e.a,e.b]));
  if (!nodes.has(0)) return false;
  const maxNode=Math.max(...nodes);
  if ([...Array(maxNode+1).keys()].some(i=>!nodes.has(i))) return false;
  const adj = new Map([...nodes].map(n=>[n,new Set()]));
  for (const e of els) { adj.get(e.a).add(e.b); adj.get(e.b).add(e.a); }
  const visited = new Set([0]), queue = [0];
  while(queue.length){const n=queue.shift();for(const other of adj.get(n)) if(!visited.has(other)){visited.add(other);queue.push(other);}}
  return visited.size===nodes.size;
};

export function solveUnknown({ elements, frequency = 0, measurement, targetText, targetMode = 'phasor' }) {
  const w = Number(frequency) > 0 ? 2*Math.PI*Number(frequency) : 0;
  const ac = w>0;
  const data = prepareUnknownCircuit(elements,ac);
  if (data.error) return data;
  if (data.unknowns.length !== 1) return error('Selecciona exactamente una incógnita escribiendo ? en su valor. Las demás variables deben estar definidas.');
  const idx = data.unknowns[0], type = data.els[idx].t;
  if (!graphValid(data.els)) return error('Todos los nodos deben estar conectados con la referencia 0.');
  if ((type==='C'||type==='L')&&!ac) return error('En CC estacionaria no es posible identificar C o L mediante tensiones o corrientes: usa la relación de energía o trabaja en CA.');
  const m = measurement;
  if(!m || !['node','V','I'].includes(m.kind)) return error('Selecciona una tensión de nodo o una tensión/corriente de elemento como dato conocido.');
  if(m.kind==='node' && (!Number.isInteger(Number(m.node)) || Number(m.node)<0 || Number(m.node)>Math.max(...data.els.flatMap(e=>[e.a,e.b])))) return error('El nodo de medición no existe.');
  if(m.kind!=='node' && (!Number.isInteger(Number(m.index))||Number(m.index)<0||Number(m.index)>=data.els.length))return error('El componente de medición no existe.');
  if (m.index===idx && m.kind==='I' && type==='I' || m.index===idx && m.kind==='V' && type==='V') {
    // Es el propio valor de la fuente: la medición ya determina la incógnita directamente.
  }
  const target = parseValue(targetText, m.kind==='I'?'I':'V',ac);
  if(!target || !ok(target)) return error('La medición conocida no es válida. En CA admite 9∠30 o 8+2j; en CC escribe un valor real.');
  if(!ac && Math.abs(target.i)>1e-10) return error('La medición en CC debe ser real.');
  const mode = ac && targetMode==='magnitude' ? 'magnitude':'phasor';
  if (mode==='magnitude' && abs(target)<0) return error('El módulo no puede ser negativo.');
  const y = v=>solveFor(data.els,w,idx,v,m);
  let solutions=[];
  if(type==='V'||type==='I'){
    if(mode==='magnitude') return error('Para despejar una fuente en CA utiliza la medición fasorial completa (módulo y ángulo), no solo su magnitud.');
    const y0=y(C(0)), y1=y(C(1));
    if(!y0||!y1)return error('El circuito no tiene solución única con estos elementos. Revisa las conexiones y las fuentes.');
    const sensitivity=sub(y1,y0);
    if(abs(sensitivity)<1e-13)return error('La medición no depende de esa fuente: no es posible despejarla.');
    const unknown=div(sub(target,y0),sensitivity);
    if(!ac && Math.abs(unknown.i)>1e-8) return error('La medición no es compatible con una fuente real en CC.');
    const checked=y(unknown);
    if(!checked || residual(checked,target,'phasor')>1e-6*Math.max(1,abs(target)))return error('La medición no es compatible con el circuito.');
    solutions=[{value:unknown,achieved:checked}];
    return {type, index:idx, unit:unitFor(type), solutions, ac, steps:[
      'Se sustituye provisionalmente la fuente desconocida por cero y se resuelve la red completa.',
      `Medición con fuente = 0: ${formatZ(y0)} ${m.kind==='I'?'A':'V'}.`,
      `Medición con fuente = 1 ${unitFor(type)}: ${formatZ(y1)} ${m.kind==='I'?'A':'V'}.`,
      'Por linealidad: medición = medición(0) + incógnita × [medición(1) − medición(0)].',
      `Incógnita = [${formatZ(target)} − (${formatZ(y0)})] / [${formatZ(y1)} − (${formatZ(y0)})] = ${formatZ(unknown)} ${unitFor(type)}.`,
      `Comprobación: medición obtenida = ${formatZ(checked)} ${m.kind==='I'?'A':'V'}.`
    ]};
  }
  // Elemento pasivo real y positivo. Búsqueda logarítmica de TODAS las raíces observables.
  const fscalar=value=>{const v=y(C(value));if(!v)return NaN;if(mode==='magnitude')return abs(v)-abs(target);return Math.abs(target.i)>Math.abs(target.r) ? v.i-target.i : v.r-target.r;};
  const points=[];
  for(let i=0;i<=360;i++){
    const val=Math.pow(10,-12+i*(24/360));
    points.push({x:val,f:fscalar(val)});
  }
  for(let i=1;i<points.length;i++){
    let prev=points[i-1], next=points[i];
    if(!Number.isFinite(prev.f)||!Number.isFinite(next.f))continue;
    if(prev.f===0) {solutions.push({value:C(prev.x)});continue;}
    if(prev.f*next.f>0)continue;
    let lo=prev.x,hi=next.x,fl=prev.f;
    for(let k=0;k<100;k++){
      const mid=Math.sqrt(lo*hi), fm=fscalar(mid);
      if(!Number.isFinite(fm))break;
      if(fl*fm<=0)hi=mid;else{lo=mid;fl=fm;}
    }
    const v=Math.sqrt(lo*hi), got=y(C(v));
    if(got && residual(got,target,mode)<=1e-5*Math.max(abs(target),1e-8)){
      if(!solutions.some(s=>near(s.value.r,v)))solutions.push({value:C(v),achieved:got});
    }
  }
  // Detectar valor constante (inductor/capacitor no observable en este punto)
  const checks=[1e-6,1,1e6].map(v=>y(C(v))).filter(Boolean);
  if(checks.length===3 && checks.every(z=>residual(z,checks[0],'phasor')<1e-10*Math.max(1,abs(z))))return error('La medición no cambia al variar este componente. No hay un valor único identificable.');
  if(!solutions.length)return error('No se encontró un valor positivo que reproduzca la medición. Puede no existir solución, estar fuera del intervalo de búsqueda o requerir otra medición.');
  return {type,index:idx,unit:unitFor(type),solutions,ac,steps:[
    `Se reemplaza ${type}${idx+1} por un valor de prueba positivo y se resuelve el sistema nodal completo.`,
    `Se calcula la diferencia entre la medición obtenida y el dato ${formatZ(target)} ${m.kind==='I'?'A':'V'}.`,
    'Se buscan cambios de signo en una escala logarítmica (10⁻¹² a 10¹² unidades SI) y se refinan las raíces.',
    'Cada resultado candidato se comprueba sustituyéndolo en la red original.',
    ...(solutions.length>1?['Atención: más de un valor reproduce la medición. Es necesario otro dato para seleccionar una solución.']:[])
  ]};
}
export const formatZ = z => z && ok(z) ? (Math.abs(z.i)<1e-8 ? `${Number(z.r.toPrecision(7))}` : `${Number(z.r.toPrecision(7))}${z.i<0?' − ':' + '}${Number(Math.abs(z.i).toPrecision(7))}j`) : '—';

// Fuente V ideal + resistencia R realmente en serie, nodo interno de grado dos.
export function eligibleSourceTransformations(els){
  const out=[];
  const count=new Map();
  els.forEach(e=>{count.set(e.a,(count.get(e.a)||0)+1);count.set(e.b,(count.get(e.b)||0)+1);});
  els.forEach((src,idx)=>{
    if(src.t!=='V')return;
    for(let j=0;j<els.length;j++){
      const R=els[j];if(R.t!=='R'||R.v.r<=0)continue;
      for(const internal of [src.a,src.b]){
        if(internal===0||count.get(internal)!==2||R.a!==internal&&R.b!==internal)continue;
        const outV=src.a===internal?src.b:src.a;
        const outR=R.a===internal?R.b:R.a;
        if(outV===outR)continue;
        // Norton current flows from outR -> outV if source plus is outV.
        const sign=src.a===internal?-1:1;
        const current=mul(div(src.v,R.v),C(sign));
        out.push({sourceIndex:idx,resistorIndex:j,internal,outV,outR,current,resistance:R.v,
          replacement:[{t:'R',a:outV,b:outR,v:R.v},{t:'I',a:outR,b:outV,v:current}]});
      }
    }
  });
  return out;
}
