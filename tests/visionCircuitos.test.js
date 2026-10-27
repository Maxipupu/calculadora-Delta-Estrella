import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizarCircuitoIA, verificarGateway, solicitarInterpretacion } from '../src/visionCircuitos.js';
import { route } from '../backend/worker.mjs';

test('reconocimiento importa un circuito con fuente, resistor y tierra',()=>{
 const out=normalizarCircuitoIA({elementos:[{t:'V',v:'12',a:1,b:0},{t:'R',v:'2k',a:1,b:0}],resumen:'Dos ramas',advertencias:['Verificar nodos']});
 assert.equal(out.elementos[1].v,'2k');assert.equal(out.elementos[0].a,'1');assert.equal(out.advertencias[0],'Verificar nodos');
});
test('se rechazan conexiones iguales, nodos sin tierra o datos inexistentes',()=>{
 assert.throws(()=>normalizarCircuitoIA({elementos:[{t:'R',v:'2k',a:2,b:2}]}),/conexiones/);
 assert.throws(()=>normalizarCircuitoIA({elementos:[{t:'R',v:'2k',a:1,b:2}]}),/referencia/);
 assert.throws(()=>normalizarCircuitoIA({elementos:[]}),/entre 1/);
});
test('la pasarela no admite URLs inseguras ni credenciales incrustadas',()=>{
 assert.equal(verificarGateway('https://ejemplo.workers.dev'),true);
 assert.equal(verificarGateway('http://localhost:8787'),true);
 assert.equal(verificarGateway('http://ejemplo.com'),false);
 assert.equal(verificarGateway('https://clave:secret@ejemplo.com'),false);
});
test('worker aplica lista blanca de origen y no implementa OAuth falso',async()=>{
 const env={ALLOWED_ORIGIN:'https://miusuario.github.io'};
 const req=new Request('https://gateway.workers.dev/v1/analyze',{method:'OPTIONS',headers:{Origin:'https://otro.github.io'}});
 const r=await route(req,env,async()=>{throw new Error('No debe llamarse');});assert.equal(r.status,403);
 const oauth=await route(new Request('https://gateway.workers.dev/auth/session',{headers:{Origin:'https://miusuario.github.io'}}),env);
 assert.equal(oauth.status,501);
});
test('worker reenvía clave solo durante la petición a Gemini y no la guarda en su respuesta',async()=>{
 const env={ALLOWED_ORIGIN:'https://miusuario.github.io'};
 let seen;
 const body={provider:'gemini',mode:'api',model:'gemini-2.5-flash',apiKey:'example-secret-never-log',imageData:'data:image/png;base64,'+Buffer.from('img').toString('base64')};
 const req=new Request('https://gateway.workers.dev/v1/analyze',{method:'POST',headers:{Origin:'https://miusuario.github.io','Content-Type':'application/json'},body:JSON.stringify(body)});
 const resp=await route(req,env,async(url,options)=>{seen={url,options};return new Response(JSON.stringify({candidates:[{content:{parts:[{text:'{"elementos":[{"t":"R","v":"2k","a":"1","b":"0"}]}' }]}}]}),{status:200});});
 assert.equal(resp.status,200);assert.equal(seen.options.headers['x-goog-api-key'],body.apiKey);
 assert.doesNotMatch(await resp.text(),/example-secret/);
});
