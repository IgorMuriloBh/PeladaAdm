import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface EmailOpts {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(opts: EmailOpts) {
  if (!process.env.SMTP_USER) return; // silently skip if not configured
  await transporter.sendMail({
    from: `"Pelada ADM" <${process.env.SMTP_USER}>`,
    ...opts,
  });
}

export function templateLembrete(peladaNome: string, data: string, horario: string) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <div style="background:#16a34a;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px">
        <span style="font-size:40px">⚽</span>
        <h1 style="color:#fff;margin:8px 0 0;font-size:22px">${peladaNome}</h1>
      </div>
      <h2 style="color:#0f172a">Lembrete de Pelada!</h2>
      <p style="color:#475569">Não esqueça da pelada <strong>${data}</strong> às <strong>${horario}</strong>.</p>
      <p style="color:#475569">Confirme sua presença no sistema para garantir sua vaga!</p>
    </div>`;
}

export function templateVagaDisponivel(peladaNome: string, data: string) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <div style="background:#16a34a;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px">
        <span style="font-size:40px">⚽</span>
        <h1 style="color:#fff;margin:8px 0 0;font-size:22px">${peladaNome}</h1>
      </div>
      <h2 style="color:#0f172a">Vaga disponível!</h2>
      <p style="color:#475569">Uma vaga abriu para a pelada de <strong>${data}</strong>. Você saiu da lista de espera!</p>
      <p style="color:#475569">Acesse o sistema para confirmar sua presença.</p>
    </div>`;
}

export function templateInadimplente(peladaNome: string, mes: string, valor: number) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <div style="background:#dc2626;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px">
        <span style="font-size:40px">💰</span>
        <h1 style="color:#fff;margin:8px 0 0;font-size:22px">${peladaNome}</h1>
      </div>
      <h2 style="color:#0f172a">Mensalidade em atraso</h2>
      <p style="color:#475569">Sua mensalidade de <strong>${mes}</strong> no valor de <strong>R$ ${valor.toFixed(2)}</strong> ainda não foi registrada como paga.</p>
      <p style="color:#475569">Regularize com o administrador da pelada.</p>
    </div>`;
}
