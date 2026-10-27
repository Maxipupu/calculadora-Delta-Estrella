/** Contrato de intercambio entre la pasarela de IA y el editor existente. */
export const PROVEEDORES = {
  gemini: { name: 'Google Gemini', model: 'gemini-2.5-flash' },
  openai: { name: 'OpenAI', model: 'gpt-4.1-mini' },
  anthropic: { name: 'Anthropic Claude', model: 'claude-sonnet-4-5' },
};
export function verificarGateway(url) {
  try {
    const u=new URL(url);
    if(u.username||u.password||u.search||u.hash) return false;
    return u.protocol==='https:' || (u.protocol==='http:' && ['localhost','127.0.0.1'].includes(u.hostname));
  } catch{return false;}
}
export const limpiarGateway = url => url.trim().replace(/\/+$/,'');
export function normalizarCircuitoIA(data) {
  if(!data||typeof data!=='object') throw new Error('La IA no devolvió un circuito válido.');
  let o=data;
  if(o.circuito && typeof o.circuito==='object') o=o.circuito;
  if(!Array.isArray(o.elementos) || o.elementos.length===0 || o.elementos.length>35) throw new Error('La respuesta debe incluir entre 1 y 35 elementos.');
  const elementos=o.elementos.map((e,i)=>{
    const t=String(e.t??e.tipo??'').trim().toUpperCase();
    const a=String(e.a??'').trim(), b=String(e.b??'').trim();
    const v=String(e.v??e.valor??'').trim();
    if(!['R','C','L','V','I'].includes(t)) throw new Error(`Elemento ${i+1}: tipo no compatible.`);
    if(!/^\d{1,3}$/.test(a)||!/^\d{1,3}$/.test(b)||a===b) throw new Error(`Elemento ${i+1}: conexiones inválidas.`);
    if(!v||v.length>60)throw new Error(`Elemento ${i+1}: falta el valor.`);
    return {t,v,a,b};
  });
  const nodos=new Set(elementos.flatMap(e=>[e.a,e.b]));
  if(!nodos.has('0'))throw new Error('La IA debe definir el nodo de referencia 0.');
  const warnings=Array.isArray(o.advertencias)?o.advertencias.slice(0,12).map(x=>String(x).slice(0,280)):[];
  const summary=typeof o.resumen==='string'?o.resumen.slice(0,500):'';
  return {elementos,advertencias:warnings,resumen:summary};
}
/** ImageData es la cadena data:image/...;base64,...; no se guarda en el proyecto. */
export async function solicitarInterpretacion({gateway,provider,model,authMode,key,imageData,signal}) {
  if(!verificarGateway(gateway))throw new Error('Escribe una dirección HTTPS válida de tu pasarela de IA.');
  if(!PROVEEDORES[provider])throw new Error('Proveedor no admitido.');
  if(!/^data:image\/(png|jpeg|webp);base64,[\w+/=]+$/i.test(imageData||'')) throw new Error('Elige una imagen PNG, JPEG o WebP.');
  if(authMode==='api'&&!key?.trim())throw new Error('Introduce tu clave API temporal.');
  const response=await fetch(`${limpiarGateway(gateway)}/v1/analyze`,{
    method:'POST',credentials:authMode==='account'?'include':'omit',signal,
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({provider,model:model?.trim()||PROVEEDORES[provider].model,mode:authMode,apiKey:authMode==='api'?key.trim():undefined,imageData})
  });
  let data;
  try{data=await response.json();}catch{throw new Error('La pasarela no devolvió JSON válido.');}
  if(!response.ok)throw new Error(String(data?.error||`Error HTTP ${response.status}`).slice(0,350));
  return normalizarCircuitoIA(data);
}
