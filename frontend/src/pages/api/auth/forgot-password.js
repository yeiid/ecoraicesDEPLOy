import { prisma } from '../../../lib/prisma.js';
import { sendMail } from '../../../lib/mail.js';
import crypto from 'crypto';

const APP_URL = process.env.APP_URL || 'http://localhost:4322';
const RESET_TTL_SECONDS = 60 * 60; // 1 hora

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function POST({ request }) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!email) {
      return new Response(JSON.stringify({ message: 'Ingresa tu correo electrónico.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Siempre responder igual para no revelar si el correo existe
    if (user && user.provider === 'local') {
      const token = crypto.randomBytes(32).toString('hex');
      const resetTokenHash = hashToken(token);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetTokenHash,
          resetTokenExpiresAt: new Date(Date.now() + RESET_TTL_SECONDS * 1000),
        },
      });

      const resetUrl = `${APP_URL}/auth/reset-password/${token}`;
      const text =
        `Hola ${user.name || user.username},\n\n` +
        `Recibimos una solicitud para restablecer tu contraseña en EcoRaíces.\n\n` +
        `Para continuar, abre este enlace (válido por 1 hora):\n${resetUrl}\n\n` +
        `Si no solicitaste este cambio, ignora este correo y tu contraseña seguirá igual.\n`;

      await sendMail({
        to: user.email,
        subject: 'Restablece tu contraseña en EcoRaíces',
        text,
      });

      // En desarrollo, sin SMTP configurado, mostramos el enlace en la respuesta
      // para que el flujo sea comprobable de punta a punta.
      const devLink =
        !process.env.MAIL_HOST && process.env.NODE_ENV !== 'production'
          ? ` (dev) Enlace: ${resetUrl}`
          : '';
      return new Response(
        JSON.stringify({
          success: true,
          message:
            'Si el correo existe, te enviamos las instrucciones para restablecer tu contraseña.' +
            devLink,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else if (user && user.provider !== 'local') {
      await sendMail({
        to: user.email,
        subject: 'Restablece tu contraseña en EcoRaíces',
        text:
          `Hola ${user.name || user.username},\n\n` +
          `Tu cuenta de EcoRaíces usa el inicio de sesión con ${user.provider}.\n` +
          `Para acceder, inicia sesión con ese proveedor desde ${APP_URL}/auth/login.\n`,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Si el correo existe, te enviamos las instrucciones para restablecer tu contraseña.',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Forgot password API error:', error);
    return new Response(JSON.stringify({ message: 'Error al procesar la solicitud.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
