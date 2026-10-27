# ElectroCalc V12 — conectar IA de forma real

## Qué funciona
- Lienzo y cálculos manuales sin API.
- Clave API personal (OpenAI, Gemini o Anthropic) una vez que se publique el Worker incluido en `backend/worker.mjs`.
- **Con cuenta ChatGPT** solo cuando una integración oficialmente autorizada implemente OAuth: **no está activada** en este repositorio. No se puede activar cambiando una casilla.

## Activar la pasarela para clave API (Cloudflare Workers)
1. Crea una cuenta de Cloudflare y un Worker nuevo.
2. Publica el código de `backend/worker.mjs` (por ejemplo, con Wrangler). En la carpeta `backend`, copia `wrangler.toml.example` como `wrangler.toml`.
3. Ajusta `ALLOWED_ORIGIN` al origen real, ej. `https://Maxipupu.github.io` (sin el nombre de repositorio ni barra final).
4. Con Wrangler instalado, dentro de `backend` ejecuta `npx wrangler deploy`. Guarda la URL HTTPS `https://...workers.dev` obtenida.
5. En ElectroCalc → Circuitos → IA → Clave API introduce esa URL y la clave privada de TU proveedor. El modelo elegido debe admitir imágenes y estar disponible para tu cuenta.
6. Si quieres evitar escribir la URL cada vez, configura `VITE_ELECTROCALC_GATEWAY` con la dirección del Worker **solo como configuración pública**, antes de compilar Vite. NUNCA incluyas claves API en `VITE_*` ni en GitHub.
7. Revisa los componentes, unidades y nodos propuestos por IA antes de usarlos para cálculos.

## ¿Por qué «Con cuenta» no se activa aún?
La documentación oficial de OpenAI distingue el login web de socios autorizados y el flujo de clientes de código abierto, que exige un callback HTTP loopback en 127.0.0.1. Un sitio estático público de GitHub Pages no es un host local y no puede sustituir ese callback. La integración web requiere client ID registrado, callback autorizado, PKCE, comprobación de identidad/alcances y backend de sesiones. No se debe usar un client_id ficticio ni pedir el usuario y contraseña de ChatGPT dentro de ElectroCalc.

Documentación: https://developers.openai.com/siwc/quickstart y https://developers.openai.com/siwc/token-sharing-open-source/sign-in

## Costos y privacidad
Con API propia, el proveedor puede cobrar a cada usuario o aplicar una cuota gratis según su plan. Las claves e imágenes viajan hacia el Worker configurado y al proveedor elegido. El Worker incluido no persiste claves ni fotografías, pero los servicios pueden registrar datos de operación según sus políticas. Usa únicamente pasarelas propias o confiables.
