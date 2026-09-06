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

    const responseHeaders = new Headers(response.headers);
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Proxy error to FastAPI:", error);
    return new Response(JSON.stringify({ error: "Backend proxy error" }), {
      status: 502,
      headers: { "Content-Type": "application/json" }
    });
  }
}
