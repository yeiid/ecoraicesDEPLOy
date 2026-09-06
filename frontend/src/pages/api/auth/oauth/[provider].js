import crypto from 'crypto';
import { isProviderConfigured, buildAuthorizeUrl } from '../../../../lib/oauth.js';

// GET /api/auth/oauth/[provider]
// Inicia el flujo OAuth redirigiendo al proveedor. Estado firmado en la cookie `oauth_state`.
export async function GET({ params, cookies }) {
  const { provider } = params;

  if (!isProviderConfigured(provider)) {
    return new Response(
      `El inicio de sesión con ${provider} aún no está configurado. Pide al administrador que añada las credenciales en las variables de entorno.`,
      { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }

  const state = crypto.randomBytes(24).toString('hex');

  cookies.set('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    sameSite: 'lax',
    maxAge: 60 * 10,
  });

  return new Response(null, {
    status: 302,
    headers: { Location: buildAuthorizeUrl(provider, state) },
  });
}
