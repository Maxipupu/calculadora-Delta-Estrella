import React, { useEffect, useRef, useState } from 'react';
import { BrainCircuit, KeyRound, UserRound, Camera, Images, AlertTriangle, CheckCircle2, Trash2, PlugZap, LoaderCircle, ArrowRight, ExternalLink } from 'lucide-react';
import { PROVEEDORES, verificarGateway, limpiarGateway, solicitarInterpretacion, normalizarCircuitoIA } from './visionCircuitos.js';

const FIELD = 'ec-ai-input';
const leyenda = {R:'Resistencia',V:'Fuente de tensión',I:'Fuente de corriente',L:'Inductor',C:'Condensador'};
export default function CircuitosIA({ dibujo, onImport }) {
  const [provider,setProvider] = useState('openai');
  const [method,setMethod] = useState('account');
  const [gateway,setGateway] = useState(import.meta.env.VITE_ELECTROCALC_GATEWAY || '');
  const [apiKey,setApiKey] = useState('');
  const [model,setModel] = useState(PROVEEDORES.openai.model);
  const [image,setImage] = useState('');
  const [status,setStatus] = useState('');
  const [loading,setLoading] = useState(false);
  const [session,setSession] = useState(false);
  const [accountSupported,setAccountSupported] = useState(false);
  const [candidate,setCandidate] = useState(null);
  const camera = useRef(null),gallery=useRef(null),abort=useRef(null);
  useEffect(()=>{if(dibujo){setImage(dibujo);setCandidate(null);setStatus('Dibujo manual cargado. Puedes solicitar su interpretación.');}},[dibujo]);
  useEffect(()=>()=>abort.current?.abort(),[]);
  const selectProvider=id=>{setProvider(id);setModel(PROVEEDORES[id].model);setCandidate(null);setSession(false);setAccountSupported(false);};
  const handleFile=async e=>{
    const file=e.target.files?.[0];e.target.value='';if(!file)return;
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>8*1024*1024){setStatus('Selecciona una imagen JPG, PNG o WebP de hasta 8 MB.');return;}
    setCandidate(null);
    try{
      const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=reject;r.readAsDataURL(file);});
      // Limitar el tamaño enviado: crear una copia JPEG legible de máximo 1200 px.
      const im=new Image();im.src=data;await im.decode();
      const scale=Math.min(1,1200/Math.max(im.naturalWidth,im.naturalHeight));
      const c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.naturalWidth*scale));c.height=Math.max(1,Math.round(im.naturalHeight*scale));
      const ctx=c.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(im,0,0,c.width,c.height);
      setImage(c.toDataURL('image/jpeg',.82));setStatus('Imagen lista para analizar; la conexión con IA requiere una pasarela configurada.');
    }catch{setStatus('No se pudo procesar la imagen.');}
  };
  const checkAvailability=async()=>{
    if(!verificarGateway(gateway)){setStatus('Falta publicar la pasarela. GitHub Pages no ejecuta backend: revisa la guía de Cloudflare Workers incluida en la actualización.');return;}
    try{const r=await fetch(`${limpiarGateway(gateway)}/auth/capabilities`);const data=await r.json();const available=Boolean(r.ok && Array.isArray(data.oauthProviders) && data.oauthProviders.includes(provider));setAccountSupported(available);setStatus(available?'Este proveedor permite autorización OAuth mediante tu pasarela.':'Esta pasarela no tiene OAuth habilitado para el proveedor seleccionado. Puedes usar tu API personal.');}
    catch{setAccountSupported(false);setStatus('No hay conexión con la pasarela. Verifica la URL, el despliegue de Cloudflare y la configuración CORS.');}
  };
  const connect=()=>{
    if(!verificarGateway(gateway)||!accountSupported){setStatus('Primero comprueba que la pasarela ofrezca OAuth para este proveedor.');return;}
    const url=`${limpiarGateway(gateway)}/auth/start?provider=${encodeURIComponent(provider)}&return_to=${encodeURIComponent(window.location.href)}`;
    window.location.assign(url);
  };
  const checkSession=async()=>{
    if(!verificarGateway(gateway)){setStatus('Configura primero una pasarela HTTPS.');return;}
    try{const r=await fetch(`${limpiarGateway(gateway)}/auth/session?provider=${encodeURIComponent(provider)}`,{credentials:'include'});const data=await r.json();setSession(Boolean(r.ok&&data.authenticated));setStatus(r.ok&&data.authenticated?'Cuenta autorizada en la pasarela.':'Todavía no hay una sesión autorizada. La pasarela debe implementar OAuth para este proveedor.');}
    catch{setStatus('La pasarela no responde o no admite autorización por cuenta.');}
  };
  const analyze=async()=>{
    setStatus('');setCandidate(null);const controller=new AbortController();abort.current=controller;setLoading(true);
    try{const result=await solicitarInterpretacion({gateway,provider,model,authMode:method,key:apiKey,imageData:image,signal:controller.signal});setCandidate(result);setStatus('La IA propuso un circuito: revisa todos los elementos antes de importarlo.');}
    catch(err){if(err.name!=='AbortError')setStatus(err.message||'No se pudo analizar la imagen.');}
    finally{setLoading(false);abort.current=null;}
  };
  const edit=(idx,key,v)=>setCandidate(prev=>({...prev,elementos:prev.elementos.map((e,i)=>i===idx?{...e,[key]:v}:e)}));
  const importCandidate=()=>{
    try{const r=normalizarCircuitoIA(candidate);onImport(r.elementos);setStatus('Circuito importado. Comprueba el dibujo digital y los resultados en el editor.');}
    catch(err){setStatus(err.message);}
  };
  return <section className="ec-ai-panel" aria-label="Modo IA de ElectroCalc">
    <div className="ec-draw-heading"><BrainCircuit size={20}/><div><strong>Interpretación con IA</strong><small>Separada del dibujo manual. Cada usuario utiliza su propia conexión.</small></div></div>
    <div className="ec-ai-disclaimer"><AlertTriangle size={17}/><span>El reconocimiento puede equivocarse en nodos, símbolos o valores. Siempre confirma el circuito propuesto antes de calcular.</span></div>
    <div className="ec-ai-options"><label>Proveedor<select value={provider} onChange={e=>selectProvider(e.target.value)}>{Object.entries(PROVEEDORES).map(([id,p])=><option key={id} value={id}>{p.name}</option>)}</select></label><label>Modelo compatible con imágenes<input value={model} onChange={e=>setModel(e.target.value)}/></label></div>
    <div className="ec-ai-method" role="group" aria-label="Método de conexión">
      <button type="button" aria-pressed={method==='account'} className={method==='account'?'selected':''} onClick={()=>setMethod('account')}><UserRound size={17}/> Con cuenta</button>
      <button type="button" aria-pressed={method==='api'} className={method==='api'?'selected':''} onClick={()=>setMethod('api')}><KeyRound size={17}/> Clave API</button>
    </div>
    <label className="ec-ai-field">Pasarela HTTPS (necesaria para proteger credenciales)<input inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="https://electrocalc-ai-gateway.tu-usuario.workers.dev" value={gateway} onChange={e=>{setGateway(e.target.value);setSession(false);setAccountSupported(false);}}/></label>
    {method==='account'?<div className="ec-ai-auth"><p><strong>Autorizar cuenta</strong></p><p>«Continuar con ChatGPT» puede utilizar el plan de usuarios elegibles únicamente mediante una integración autorizada oficialmente. GitHub Pages por sí solo no puede iniciar esta sesión: la aplicación web necesita credenciales y un callback registrados por el proveedor. La conexión de cuenta no está activa en esta instalación.</p><p><a href="https://developers.openai.com/siwc/quickstart" target="_blank" rel="noopener noreferrer" className="ec-ai-doc-link">Ver requisitos oficiales de acceso con ChatGPT ↗</a></p><div className="ec-ai-actions"><button type="button" onClick={checkAvailability}>Comprobar disponibilidad</button><button type="button" onClick={connect} disabled={!accountSupported}><ExternalLink size={16}/> Autorizar cuenta</button><button type="button" onClick={checkSession} disabled={!accountSupported}>Comprobar sesión</button></div>{session&&<div className="ec-ai-connected"><CheckCircle2 size={16}/> Sesión autorizada</div>}</div>
    :<div className="ec-ai-auth"><label className="ec-ai-field">Clave API de tu proveedor<input type="password" autoComplete="off" placeholder="Introduce tu clave temporal" value={apiKey} onChange={e=>setApiKey(e.target.value)} /></label><p>Esta opción sí permite analizar imágenes después de publicar la pasarela Cloudflare Workers. La clave solo se mantiene en la memoria de esta pestaña: no se guarda en GitHub, localStorage ni archivos. Se envía por HTTPS exclusivamente a la pasarela que tú configures. Para usarla, despliega la pasarela del proyecto o una propia.</p><button type="button" className="ec-ai-clear" onClick={()=>setApiKey('')}><Trash2 size={14}/> Borrar clave</button></div>}
    <div className="ec-ai-photo"><input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" capture="environment" ref={camera} onChange={handleFile} aria-label="Fotografiar circuito para IA"/><input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" ref={gallery} onChange={handleFile} aria-label="Cargar dibujo para IA"/>
      <div className="ec-ai-actions"><button type="button" onClick={()=>camera.current?.click()}><Camera size={17}/> Cámara</button><button type="button" onClick={()=>gallery.current?.click()}><Images size={17}/> Imagen</button></div>
      {image?<div className="ec-ai-preview"><img src={image} alt="Circuito preparado para análisis con IA"/><button type="button" onClick={()=>{setImage('');setCandidate(null);}}><Trash2 size={15}/> Quitar imagen</button></div>:<p>También puedes dibujar el circuito en el modo Manual y enviarlo aquí con «Interpretar con IA».</p>}
    </div>
    <button type="button" className="ec-ai-submit" disabled={loading||!image||!verificarGateway(gateway)||(method==='api'&&!apiKey.trim())||(method==='account'&&!session)} onClick={analyze}>{loading?<LoaderCircle size={17} className="animate-spin"/>:<BrainCircuit size={17}/>} {loading?'Interpretando…':'Analizar circuito con IA'}</button>
    {loading&&<button className="ec-ai-cancel" type="button" onClick={()=>abort.current?.abort()}>Cancelar análisis</button>}
    {status&&<p className="ec-draw-status" role="status">{status}</p>}
    {candidate&&<div className="ec-ai-proposal"><h3><CheckCircle2 size={17}/> Propuesta de la IA — revisar antes de usar</h3>{candidate.resumen&&<p>{candidate.resumen}</p>}{candidate.advertencias.map((w,i)=><p key={i} className="ec-ai-warning">⚠ {w}</p>)}<div className="ec-ai-table-head"><span>Tipo</span><span>Valor SI</span><span>Nodo A</span><span>Nodo B</span></div>{candidate.elementos.map((e,i)=><div className="ec-ai-table-row" key={i}><select aria-label={`Tipo del elemento ${i+1}`} value={e.t} onChange={ev=>edit(i,'t',ev.target.value)}>{Object.entries(leyenda).map(([t,n])=><option key={t} value={t}>{t} · {n}</option>)}</select><input aria-label={`Valor elemento ${i+1}`} value={e.v} onChange={ev=>edit(i,'v',ev.target.value)}/><input aria-label={`Nodo A elemento ${i+1}`} value={e.a} inputMode="numeric" onChange={ev=>edit(i,'a',ev.target.value)}/><input aria-label={`Nodo B elemento ${i+1}`} value={e.b} inputMode="numeric" onChange={ev=>edit(i,'b',ev.target.value)}/></div>)}<button type="button" onClick={importCandidate} className="ec-ai-submit"><ArrowRight size={17}/> Confirmar e importar al editor</button></div>}
    <p className="ec-draw-footnote">ElectroCalc no paga ni gestiona la cuenta de IA de sus usuarios. La API y la pasarela pueden tener límites o cargos propios. La foto se envía al proveedor elegido solo cuando presionas «Analizar».</p>
  </section>;
}
