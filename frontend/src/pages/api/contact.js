import { sendMail } from '../../lib/mail.js';
import { z } from 'zod';

const contactSchema = z.object({
  name: z.string().min(2, 'Ingresa tu nombre.'),
  email: z.string().email('Ingresa un correo electrónico válido.'),
  subject: z.string().min(2, 'Ingresa un asunto.'),
  message: z.string().min(10, 'El mensaje debe tener al menos 10 caracteres.'),
});

const CONTACT_RECIPIENT = process.env.CONTACT_EMAIL || 'yeifran67@gmail.com';

export async function POST({ request }) {
  try {
    const body = await request.json().catch(() => ({}));

    const parsed = contactSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ message: parsed.error.errors[0]?.message || 'Datos inválidos.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { name, email, subject, message } = parsed.data;

    await sendMail({
      to: CONTACT_RECIPIENT,
      subject: `[Contacto] ${subject}`,
      text: `Nombre: ${name}\nCorreo: ${email}\nAsunto: ${subject}\n\n${message}`,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: '¡Gracias por tu mensaje! Te responderemos pronto.',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Contact API error:', error);
    return new Response(JSON.stringify({ message: 'Error al enviar el mensaje. Inténtalo de nuevo.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
