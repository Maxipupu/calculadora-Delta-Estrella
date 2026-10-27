/**
 * Pasarela voluntaria BYOK para ElectroCalc V11, desplegable en Cloudflare Workers.
 * Recibe la clave temporal del usuario SOLAMENTE en una petición HTTPS y la reenvía
 * al proveedor seleccionado. NO persiste claves, imágenes, tokens ni respuestas.
 * No implementa OAuth: un login real requiere registro/configuración por proveedor.
 */
const PROMPT = `Analiza esta imagen de un esquema eléctrico. Devuelve ÚNICAMENTE un JSON con esta forma:
{"elementos":[{"t":"R","v":"2k","a":"1","b":"0"}],"resumen":"...","advertencias":["..."]}
Los tipos permitidos son R (resistencia), C (condensador), L (inductor), V (fuente ideal tensión), I (fuente ideal corriente). Los valores deben expresarse en unidades SI con prefijos compatibles: 2k, 4.7m, 33u, 12. Usa los nodos 0,1,2,..., siendo 0 la referencia de tierra; si no hay tierra explícita, selecciona una referencia razonable y adviértelo. Los nodos representan CONEXIÓN ELÉCTRICA, no solo cruces de líneas sin punto. La tensión sobre un condensador NO ES una fuente independiente. No inventes valores ilegibles; advierte incertidumbres. La foto puede ser incompleta; devuelve una lista de advertencias indicando conexiones dudosas. Máximo 35 elementos. No añadas Markdown ni explicaciones fuera del JSON.`;
const LIMIT = 4_500_000;
const json=(obj,status=200,headers={})=>new Response(JSON.stringify(obj),{status,headers:{'Content-Type':'application/json; charset=utf-8',...headers}});
const readImage = d=>{
  const m=/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(d||'');
  if(!m||m[2].length>3_200_000)throw new Error('Imagen inválida o demasiado grande (máximo ~2,4 MB).');
  return {mediaType:m[1],data:m[2]};
};
function parseReply(raw) {
  const clean=String(raw).trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
  const content=JSON.parse(clean);
  if(!content || !Array.isArray(content.elementos))throw new Error('La IA no entregó una lista de elementos.');
  return content;
}
export async function route(request,env,upstream=fetch) {
  const origin=request.headers.get('Origin')||'';
  const allowed=String(env.ALLOWED_ORIGIN||'').split(',').map(v=>v.trim()).filter(Boolean);
  if(!allowed.includes(origin))return json({error:'Origen no autorizado. Configura ALLOWED_ORIGIN en el Worker.'},403);
  const h={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Credentials':'true','Access-Control-Allow-Methods':'POST, GET, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Vary':'Origin','Cache-Control':'no-store'};
  const url=new URL(request.url);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:h});
  if(url.pathname==='/auth/capabilities' && request.method==='GET')return json({oauthProviders:[]},200,h);
  if(url.pathname.startsWith('/auth/'))return json({authenticated:false,error:'OAuth aún no configurado. Requiere integración oficial con el proveedor y servidor de autorización.'},501,h);
  if(url.pathname!=='/v1/analyze'||request.method!=='POST')return json({error:'Ruta no encontrada.'},404,h);
  const declared=Number(request.headers.get('content-length')||'0');
  if(declared>LIMIT)return json({error:'Solicitud demasiado grande.'},413,h);
  let body;
  try{const raw=await request.text();if(raw.length>LIMIT)return json({error:'Solicitud demasiado grande.'},413,h);body=JSON.parse(raw);}catch{return json({error:'Cuerpo JSON inválido.'},400,h);}
  if(body.mode!=='api')return json({error:'La conexión por cuenta todavía requiere un servidor OAuth autorizado.'},501,h);
  const apiKey=String(body.apiKey||'').trim(),provider=body.provider;
  if(!apiKey||apiKey.length>400)return json({error:'Clave API no proporcionada.'},400,h);
  let img;
  try{img=readImage(body.imageData);}catch(e){return json({error:e.message},400,h);}
  const model=String(body.model||'').trim();
  if(!/^[a-zA-Z0-9._:-]{2,100}$/.test(model))return json({error:'Nombre de modelo no válido.'},400,h);
  let endpoint,headers={'Content-Type':'application/json'},payload;
  if(provider==='gemini') {
    endpoint=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    headers['x-goog-api-key']=apiKey;
    payload={contents:[{parts:[{text:PROMPT},{inline_data:{mime_type:img.mediaType,data:img.data}}]}],generationConfig:{responseMimeType:'application/json'}};
  } else if(provider==='openai') {
    endpoint='https://api.openai.com/v1/chat/completions';
    headers.Authorization=`Bearer ${apiKey}`;
    payload={model,messages:[{role:'user',content:[{type:'text',text:PROMPT},{type:'image_url',image_url:{url:body.imageData}}]}],response_format:{type:'json_object'}};
  } else if(provider==='anthropic') {
    endpoint='https://api.anthropic.com/v1/messages';
    headers['x-api-key']=apiKey;headers['anthropic-version']='2023-06-01';
    payload={model,max_tokens:3500,messages:[{role:'user',content:[{type:'text',text:PROMPT},{type:'image',source:{type:'base64',media_type:img.mediaType,data:img.data}}]}]};
  } else return json({error:'Proveedor no soportado.'},400,h);
  try{
    const resp=await upstream(endpoint,{method:'POST',headers,body:JSON.stringify(payload),redirect:'error'});
    if(!resp.ok)return json({error:`El proveedor devolvió HTTP ${resp.status}. Revisa tu modelo, clave y saldo/cuota.`},resp.status===429?429:502,h);
    const reply=await resp.json();
    let text='';
    if(provider==='gemini')text=(reply.candidates?.[0]?.content?.parts||[]).map(p=>p.text||'').join('');
    if(provider==='openai')text=reply.choices?.[0]?.message?.content||'';
    if(provider==='anthropic')text=(reply.content||[]).filter(c=>c.type==='text').map(c=>c.text).join('');
    return json(parseReply(text),200,h);
  }catch(err){return json({error:'No se pudo interpretar la respuesta de la IA. Revisa el modelo o intenta con una imagen más clara.'},502,h);}
}
export default {fetch(request,env){return route(request,env);}};
