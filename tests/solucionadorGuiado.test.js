import test from 'node:test';
import assert from 'node:assert/strict';
import {solveUnknown, eligibleSourceTransformations} from '../src/solucionadorGuiado.js';
import {C} from '../src/calc.js';
import {resolver} from '../src/calc3.js';
const el=(t,v,a,b)=>({t,v,a,b});
const near=(a,b,tol=1e-7)=>assert.ok(Math.abs(a-b)<=tol*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
const div=[el('V','?',1,0),el('R','1k',1,2),el('R','2k',2,0)];
test('fuente de tensión incógnita con nodo conocido',()=>{const r=solveUnknown({elements:div,measurement:{kind:'node',node:2},targetText:'8'});assert.equal(r.error,undefined);near(r.solutions[0].value.r,12);});
test('fuente de corriente incógnita con medición independiente',()=>{const els=[el('I','?',0,1),el('R','2k',1,0)];const r=solveUnknown({elements:els,measurement:{kind:'node',node:1},targetText:'10'});assert.equal(r.error,undefined);near(r.solutions[0].value.r,0.005);});
test('resistencia incógnita de divisor',()=>{const r=solveUnknown({elements:[el('V','12',1,0),el('R','1k',1,2),el('R','?',2,0)],measurement:{kind:'node',node:2},targetText:'8'});assert.equal(r.error,undefined);near(r.solutions[0].value.r,2000,1e-5);});
test('no resuelve dos incógnitas independientes',()=>{const r=solveUnknown({elements:[el('V','?',1,0),el('R','?',1,0)],measurement:{kind:'node',node:1},targetText:'12'});assert.ok(r.error);});
test('capacitancia indeterminada con CC permanente',()=>{const r=solveUnknown({elements:[el('V','12',1,0),el('C','?',1,0)],measurement:{kind:'node',node:1},targetText:'12'});assert.match(r.error,/CC estacionaria/);});
test('resuelve capacitancia en CA con dato fasorial',()=>{const w=2*Math.PI*50;const c=1e-6; const Zc=C(0,-1/(w*c));const R=1000;const a=C(10);const den=C(R+Zc.r,Zc.i);const target=C((a.r*Zc.r*den.r+a.r*Zc.i*den.i)/(den.r**2+den.i**2),(a.r*Zc.i*den.r-a.r*Zc.r*den.i)/(den.r**2+den.i**2)); const known=`${target.r}${target.i<0?'':'+'}${target.i}j`; const r=solveUnknown({elements:[el('V','10',1,0),el('R','1k',1,2),el('C','?',2,0)],frequency:50,measurement:{kind:'node',node:2},targetText:known}); assert.equal(r.error,undefined);near(r.solutions[0].value.r,c,2e-4);});
test('transformación fuente + R serie respeta tensión en puerto',()=>{
const els=[{t:'V',a:1,b:0,v:C(12)},{t:'R',a:1,b:2,v:C(6000)},{t:'R',a:2,b:0,v:C(3000)}];
const t=eligibleSourceTransformations(els);assert.equal(t.length,1);near(t[0].current.r,-0.002);
const x=resolver(els,0).Vn[2].r;
const converted=[{t:'R',a:1,b:0,v:C(3000)},...t[0].replacement.map(e=>({...e,a:e.a===2?1:e.a,b:e.b===2?1:e.b}))];
const y=resolver(converted,0).Vn[1].r;near(x,y);});
test('no transforma resistencia que no está en serie',()=>{
const els=[{t:'V',a:1,b:0,v:C(12)},{t:'R',a:1,b:2,v:C(6000)},{t:'R',a:1,b:0,v:C(3000)}];assert.equal(eligibleSourceTransformations(els).length,0);});
