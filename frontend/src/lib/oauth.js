const APP_URL = process.env.APP_URL || 'http://localhost:4322';

export const OAUTH_PROVIDERS = {
  google: {
    label: 'Google',
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    profileUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
    scope: 'openid email profile',
    authParams: { response_type: 'code', access_type: 'online', prompt: 'select_account' },
  },
  facebook: {
    label: 'Facebook',
    clientId: process.env.FACEBOOK_CLIENT_ID,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    authorizeUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
    profileUrl: 'https://graph.facebook.com/me',
    scope: 'email',
    authParams: {},
    profileParams: { fields: 'id,name,email,picture' },
  },
};

export function isProviderConfigured(provider) {
  const cfg = OAUTH_PROVIDERS[provider];
  return Boolean(cfg && cfg.clientId && cfg.clientSecret);
}

export function buildAuthorizeUrl(provider, state) {
  const cfg = OAUTH_PROVIDERS[provider];
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: callbackUrl(provider),
    scope: cfg.scope,
    state,
    ...cfg.authParams,
  });
  return `${cfg.authorizeUrl}?${params.toString()}`;
}

export function callbackUrl(provider) {
  return `${APP_URL}/api/auth/oauth/callback/${provider}`;
}

export async function exchangeCodeForToken(provider, code) {
  const cfg = OAUTH_PROVIDERS[provider];
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    code,
    redirect_uri: callbackUrl(provider),
    grant_type: 'authorization_code',
  });

  const res = await fetch(cfg.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${text}`);
  }

  return res.json();
}

export async function fetchProfile(provider, accessToken) {
  const cfg = OAUTH_PROVIDERS[provider];
  const params = new URLSearchParams(cfg.profileParams || {});
  const url = `${cfg.profileUrl}?${params.toString()}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Profile fetch failed (${res.status}): ${text}`);
  }

  return res.json();
}

// Normaliza el perfil del proveedor a un shape común.
export function normalizeProfile(provider, profile) {
  if (provider === 'google') {
    return {
      providerId: String(profile.id),
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.picture || null,
    };
  }
  if (provider === 'facebook') {
    return {
      providerId: String(profile.id),
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.picture?.data?.url || null,
    };
  }
  throw new Error('Unsupported provider');
}
