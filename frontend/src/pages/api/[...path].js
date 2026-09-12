/**
 * Proxy Catch-All para redirigir peticiones de Astro hacia FastAPI.
 * Esto atrapa todas las llamadas al cliente a /api/* que no tengan 
 * un archivo físico correspondiente en src/pages/api/
 */
export async function ALL({ request, params }) {
  const path = params.path;
  
  // URL base del backend en Docker
  const backendUrl = process.env.BACKEND_URL || "http://backend:8000";
  
  // Extraer query params de la petición original
  const url = new URL(request.url);
  const targetUrl = `${backendUrl}/api/${path}${url.search}`;

  console.log(`[Proxy] ${request.method} ${targetUrl}`);

  // Clonar headers evitando algunos problemáticos para proxy
  const headers = new Headers(request.headers);
  headers.delete("host");

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.arrayBuffer() : undefined,
      redirect: 'manual'
    });

    console.log(`[Proxy] Response: ${response.status} from ${targetUrl}`);

    const responseHeaders = new Headers(response.headers);
    // Eliminar headers problemáticos de proxy
    responseHeaders.delete('content-encoding');
    responseHeaders.delete('content-length');
    responseHeaders.delete('transfer-encoding');
    
    // Leer el buffer completo para evitar problemas con body stream
    const buffer = await response.arrayBuffer();
    
    return new Response(buffer, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error(`[Proxy] FAILED ${request.method} ${targetUrl}:`, error.message, error.cause || '');
    return new Response(JSON.stringify({ 
      error: "Backend proxy error", 
      detail: `No se pudo conectar al backend en ${targetUrl}` 
    }), {
      status: 502,
      headers: { "Content-Type": "application/json" }
    });
  }
}
