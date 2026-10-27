import test from 'node:test';
import assert from 'node:assert/strict';
import { C } from '../src/calc.js';
import { resolver } from '../src/calc3.js';
import { solveMeshes, transformSource, energyCalculation, nodalSteps } from '../src/analisisAvanzado.js';
const branch = (t, value, a, b) => ({ t, v: C(value), a, b });
const close = (x, y, tol = 1e-9) => assert.ok(Math.abs(x - y) < tol, `esperado ${y}; obtenido ${x}`);

test('fuente Thévenin 12V en serie con 6kΩ equivale a Norton 2mA paralelo', () => {
  const n = transformSource({ type: 'V', voltage: 12, resistance: 6000 });
  close(n.result, 0.002);
  close(transformSource({ type: 'I', current: 0.002, resistance: 6000 }).result, 12);
  assert.ok(transformSource({ type: 'I', current: 1, resistance: 0 }).error);
});

test('malla: circuito 12 V y 1k+2k serie entrega 4 mA', () => {
  const els = [branch('V',12,1,0),branch('R',1000,1,2),branch('R',2000,2,0)];
  const mesh = solveMeshes(els,0), nod = resolver(els,0);
  assert.equal(mesh.cycleCount,1);
  for(let i=0;i<els.length;i++) close(mesh.branchCurrents[i].r,nod.res[i].I.r);
  close(mesh.branchCurrents[1].r,0.004);
});

test('mallas y supermallas reproducen el ejemplo de dos fuentes y corriente Io', () => {
  const els = [branch('V',6,1,0),branch('R',3000,1,2),branch('R',6000,2,0),branch('R',2000,2,3),branch('I',0.002,2,3),branch('R',4000,3,0)];
  const mesh=solveMeshes(els), nod=resolver(els,0);
  assert.ok(!mesh.error, mesh.error);
  assert.ok(mesh.hasCurrentSources);
  for(let i=0;i<els.length;i++) close(mesh.branchCurrents[i].r, nod.res[i].I.r,1e-8);
  const superVals = [0,4].map(k=>resolver(els,0,k).res[5].I.r);
  close(superVals[0]+superVals[1],nod.res[5].I.r);
});

test('mallas y nodos coinciden en el examen 12V, 6mA y resistencias 6k', () => {
  const els = [branch('V',12,1,0),branch('R',6000,1,2),branch('R',6000,2,0),branch('R',6000,2,3),branch('I',0.006,3,0),branch('R',6000,3,0)];
  const mesh=solveMeshes(els), nod=resolver(els,0);
  assert.ok(!mesh.error, mesh.error);
  for(let i=0;i<els.length;i++) close(mesh.branchCurrents[i].r,nod.res[i].I.r);
});

test('en CA los inductores y condensadores participan con impedancias complejas', () => {
  const w=2*Math.PI*50;
  const els = [branch('V',10,1,0),branch('R',100,1,2),branch('L',0.1,2,0),branch('C',0.000001,2,0)];
  const mesh=solveMeshes(els,w),nod=resolver(els,w);
  assert.ok(!mesh.error,mesh.error);
  for(let i=0;i<els.length;i++) { close(mesh.branchCurrents[i].r,nod.res[i].I.r); close(mesh.branchCurrents[i].i,nod.res[i].I.i); }
});

test('C desconocida en la guía de 18V: 125nF para energía igual a L', () => {
  const els=[branch('V',18,1,0),branch('R',1000,1,2),branch('L',0.5,2,3),branch('R',2000,3,0),branch('C',1,2,0)];
  const nod=resolver(els,0);
  const energy=energyCalculation({mode:'igual',find:'C',Cval:NaN,Lval:0.5,Vval:nod.res[4].V.r,Ival:nod.res[2].I.r,Eval:NaN});
  assert.ok(!energy.error,energy.error);
  close(energy.answer,125e-9,1e-12);
});

test('despejes de energía para C, L, V, I y E', () => {
  const cases=[
    [{mode:'C',find:'E',Cval:0.001,Lval:NaN,Vval:10,Ival:NaN,Eval:NaN},0.05],
    [{mode:'C',find:'C',Cval:NaN,Lval:NaN,Vval:10,Ival:NaN,Eval:0.05},0.001],
    [{mode:'C',find:'V',Cval:0.001,Lval:NaN,Vval:NaN,Ival:NaN,Eval:0.05},10],
    [{mode:'L',find:'E',Cval:NaN,Lval:0.5,Vval:NaN,Ival:2,Eval:NaN},1],
    [{mode:'L',find:'L',Cval:NaN,Lval:NaN,Vval:NaN,Ival:2,Eval:1},0.5],
    [{mode:'L',find:'I',Cval:NaN,Lval:0.5,Vval:NaN,Ival:NaN,Eval:1},2],
    [{mode:'igual',find:'V',Cval:0.0001,Lval:0.01,Vval:NaN,Ival:1,Eval:NaN},10],
    [{mode:'igual',find:'I',Cval:0.0001,Lval:0.01,Vval:10,Ival:NaN,Eval:NaN},1],
  ];
  for(const [args,expected] of cases) close(energyCalculation(args).answer,expected,1e-9);
  assert.ok(energyCalculation({mode:'igual',find:'C',Vval:0,Lval:1,Ival:1}).error);
});

test('análisis nodal muestra KCL y restricción por fuente ideal', () => {
  const els=[branch('V',12,1,0),branch('R',1000,1,2),branch('R',2000,2,0)];
  const steps=nodalSteps(els,0,['V1','R1','R2']);
  assert.ok(steps.some(s=>s.text.includes('I(V1)')));
  assert.ok(steps.some(s=>s.text.includes('V1 − V0 = E(V1) = 12 V')));
});

test('mallas indican circuitos sin lazo o desconectados sin inventar valores', () => {
  assert.match(solveMeshes([branch('R',2000,1,0)])?.error,/lazos/);
  assert.match(solveMeshes([branch('V',12,1,0),branch('R',10,2,3)])?.error,/desconectadas/);
});
