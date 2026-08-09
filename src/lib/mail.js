import nodemailer from 'nodemailer';

const MAIL_HOST = process.env.MAIL_HOST;
const MAIL_PORT = parseInt(process.env.MAIL_PORT || '587', 10);
const MAIL_USER = process.env.MAIL_USER;
const MAIL_PASS = process.env.MAIL_PASS;
const MAIL_FROM = process.env.MAIL_FROM || 'EcoRaíces <no-reply@ecoraices.example>';
const MAIL_SECURE = process.env.MAIL_SECURE === 'true';

let transporter = null;

function getTransporter() {
  if (!MAIL_HOST || !MAIL_USER || !MAIL_PASS) return null;

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: MAIL_HOST,
      port: MAIL_PORT,
      secure: MAIL_SECURE,
      auth: { user: MAIL_USER, pass: MAIL_PASS },
    });
  }
  return transporter;
}

// Envía un correo. Sin SMTP configurado (p. ej. dev) imprime el mensaje en consola
// y devuelve true para que el flujo continúe sin error.
export async function sendMail({ to, subject, text, html }) {
  const smtp = getTransporter();

  if (!smtp) {
    console.log(`\n[mail:dev] Para: ${to}\n[mail:dev] Asunto: ${subject}\n[mail:dev]\n${text}\n`);
    return true;
  }

  await smtp.sendMail({
    from: MAIL_FROM,
    to,
    subject,
    text,
    html,
  });

  return true;
}
