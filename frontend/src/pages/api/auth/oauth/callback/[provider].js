import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../../../../../lib/prisma.js';
import {
  isProviderConfigured,
  exchangeCodeForToken,
  fetchProfile,
  normalizeProfile,
} from '../../../../../lib/oauth.js';
import { TOKEN_NAME, MAX_AGE } from '../../../../../lib/middleware/auth.js';

const { sign } = jwt;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-only';

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function setAuthCookie(cookies, user) {
  const token = sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      isAdmin: user.isAdmin || false,
    },
    JWT_SECRET,
    { expiresIn: MAX_AGE }
  );

  cookies.set(TOKEN_NAME, token, {
    maxAge: MAX_AGE,
    expires: new Date(Date.now() + MAX_AGE * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    sameSite: 'lax',
  });
}

// GET /api/auth/oauth/callback/[provider]?code=...&state=...
export async function GET({ params, request, cookies }) {
  const { provider } = params;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  const expectedState = cookies.get('oauth_state')?.value;

  if (error || !isProviderConfigured(provider) || !code) {
    return redirectWithMessage('/auth/login', 'No se pudo iniciar sesión con el proveedor.');
  }

  if (!expectedState || !state || state !== expectedState) {
    return redirectWithMessage('/auth/login', 'La solicitud de inicio de sesión no es válida. Inténtalo de nuevo.');
  }

  cookies.delete('oauth_state', { path: '/' });

  try {
    const tokenData = await exchangeCodeForToken(provider, code);
    const profile = await fetchProfile(provider, tokenData.access_token);
    const data = normalizeProfile(provider, profile);

    if (!data.email) {
      return redirectWithMessage('/auth/login', `No pudimos obtener tu correo de ${provider}. Verifica los permisos de la cuenta.`);
    }

    const providerIdHash = hashToken(`${provider}:${data.providerId}`);

    // 1) Vínculo por providerId (cuenta social ya conectada)
    let user = await prisma.user.findUnique({ where: { providerId: providerIdHash } });

    // 2) Si no, por email (cuenta local existente -> se vincula)
    if (!user) {
      user = await prisma.user.findUnique({ where: { email: data.email } });

      if (user) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            provider: provider,
            providerId: providerIdHash,
            ...(data.avatarUrl && !user.avatarUrl ? { avatarUrl: data.avatarUrl } : {}),
          },
        });
      }
    }

    // 3) Si no existe, crea la cuenta social
    if (!user) {
      const baseUsername = (data.name || data.email.split('@')[0] || 'usuario')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '')
        .slice(0, 20) || 'usuario';

      const username = await ensureUniqueUsername(baseUsername);

      user = await prisma.user.create({
        data: {
          username,
          email: data.email,
          passwordHash: crypto.randomBytes(32).toString('hex'),
          name: data.name,
          avatarUrl: data.avatarUrl,
          provider: provider,
          providerId: providerIdHash,
        },
      });
    }

    setAuthCookie(cookies, user);

    return new Response(null, {
      status: 302,
      headers: { Location: '/' },
    });
  } catch (err) {
    console.error('OAuth callback error:', err);
    return redirectWithMessage('/auth/login', 'Error al completar el inicio de sesión. Inténtalo de nuevo.');
  }
}

async function ensureUniqueUsername(base) {
  let username = base;
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.user.findUnique({ where: { username } });
    if (!existing) return username;
    n += 1;
    username = `${base}${n}`;
  }
}

function redirectWithMessage(location, message) {
  const target = `${location}?error=${encodeURIComponent(message)}`;
  return new Response(null, { status: 302, headers: { Location: target } });
}
