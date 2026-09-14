import nodemailer from "nodemailer";

export async function sendInviteEmail({
  name,
  email,
  link,
}: {
  name: string;
  email: string;
  link: string;
}) {
  const host = process.env.EMAIL_HOST;
  const port = Number(process.env.EMAIL_PORT ?? "587");
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!host || !user || !pass) {
    console.log("[invite-email-preview]");
    console.log({
      to: email,
      subject: "Convite para acesso ao sistema",
      text: `Olá ${name},\n\nVocê foi convidado(a) para acessar o sistema da ArcelorMittal.\n\nClique no link abaixo para criar sua senha:\n${link}`,
    });

    return {
      ok: true,
      mode: "preview",
      link,
    };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || `"ArcelorMittal" <${user}>`,
    to: email,
    subject: "Convite para acesso ao sistema",
    text: `Olá ${name},\n\nVocê foi convidado(a) para acessar o sistema da ArcelorMittal.\n\nClique no link abaixo para criar sua senha:\n${link}`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
        <p>Olá <strong>${name}</strong>,</p>
        <p>Você foi convidado(a) para acessar o sistema da ArcelorMittal.</p>
        <p>Para continuar, clique no botão abaixo e crie sua senha:</p>
        <p>
          <a href="${link}" style="display: inline-block; background: #d7a24a; color: #10151d; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: bold;">
            Criar senha
          </a>
        </p>
        <p>Se o botão não funcionar, use este link:</p>
        <p><a href="${link}">${link}</a></p>
      </div>
    `,
  });

  return {
    ok: true,
    mode: "smtp",
    messageId: info.messageId,
    link,
  };
}
