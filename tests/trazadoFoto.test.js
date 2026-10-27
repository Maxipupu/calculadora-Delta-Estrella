import test from 'node:test';
import assert from 'node:assert/strict';
import { detectarTrazos, sugerirUniones } from '../src/trazadoFoto.js';

const blank = (w=100,h=70) => ({width:w,height:h,data:new Uint8ClampedArray(w*h*4).fill(255)});
const ink = (im,x,y) => { const off=(y*im.width+x)*4; im.data[off]=0; im.data[off+1]=0; im.data[off+2]=0; };

test('detecta conductores horizontales y verticales en una imagen de prueba', () => {
  const im=blank();
  for (let x=10;x<85;x++) ink(im,x,25);
  for (let y=5;y<60;y++) ink(im,35,y);
  const paths=detectarTrazos(im,{threshold:160,minLength:20});
  assert.ok(paths.some(p=>p.x1<=12&&p.x2>=82&&Math.abs(p.y1-25)<2));
  assert.ok(paths.some(p=>Math.abs(p.x1-35)<2&&p.y1<=8&&p.y2>=57));
  assert.ok(sugerirUniones(paths,im.width,im.height).some(p=>Math.abs(p.x-35)<2&&Math.abs(p.y-25)<2));
});

test('ignora ruido aislado y entradas inválidas',()=>{
 const im=blank(); for(let i=0;i<10;i++) ink(im,i*3,5);
 assert.equal(detectarTrazos(im).length,0);
 assert.deepEqual(detectarTrazos({width:2,height:2,data:[]}),[]);
});

test('las anotaciones se convierten en ramas con tierra cero y continuidad de nodos', async ()=>{
 const {anotacionesACircuito}=await import('../src/trazadoFoto.js');
 const nodos=[{id:0},{id:1},{id:2}];
 const circuit=anotacionesACircuito(nodos,[{t:'V',v:'12',a:0,b:2},{t:'R',v:'2k',a:0,b:1}],2);
 assert.deepEqual(circuit.elementos,[{t:'V',v:'12',a:'1',b:'0'},{t:'R',v:'2k',a:'1',b:'2'}]);
 assert.match(anotacionesACircuito(nodos,[{t:'R',v:'',a:1,b:2}],0).error,/Revisa/);
});
