import nodemailer from "nodemailer";

export interface SmtpConfig {
  host: string; port: number; user: string; pass: string;
  remetente: string; nomeRemetente: string;
}

interface EmailOpts { to: string; subject: string; html: string }

function buildTransport(cfg?: SmtpConfig) {
  const host = cfg?.host || process.env.SMTP_HOST || "smtp.gmail.com";
  const port = cfg?.port || Number(process.env.SMTP_PORT) || 587;
  const user = cfg?.user || process.env.SMTP_USER;
  const pass = cfg?.pass || process.env.SMTP_PASS;
  return nodemailer.createTransport({ host, port, secure: false, auth: { user, pass } });
}

export async function sendEmail(opts: EmailOpts, cfg?: SmtpConfig) {
  const user = cfg?.user || process.env.SMTP_USER;
  if (!user) return; // não configurado — ignora silenciosamente
  const nomeRemetente = cfg?.nomeRemetente || "Pelada ADM";
  const email = cfg?.remetente || cfg?.user || user;
  const from = `"${nomeRemetente}" <${email}>`;
  await buildTransport(cfg).sendMail({ from, ...opts });
}

// ── Templates ──────────────────────────────────────────────────────────────

const headerGreen = (peladaNome: string) => `
  <div style="background:#16a34a;border-radius:12px 12px 0 0;padding:24px;text-align:center">
    <span style="font-size:40px">⚽</span>
    <h1 style="color:#fff;margin:8px 0 0;font-size:22px">${peladaNome}</h1>
  </div>`;

const wrapper = (content: string) =>
  `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">${content}</div>`;

export function templateNovaPartida(
  peladaNome: string, jogadorNome: string, data: string, horario: string, linkConfirmacao: string
) {
  return wrapper(`
    ${headerGreen(peladaNome)}
    <div style="padding:28px 24px">
      <p style="color:#475569;margin:0 0 8px">Olá, <strong>${jogadorNome}</strong>!</p>
      <h2 style="color:#0f172a;margin:0 0 12px">🗓️ Nova pelada marcada!</h2>
      <p style="color:#475569">A lista de presença para a pelada de <strong>${data}</strong> às <strong>${horario}</strong> já está aberta.</p>
      <p style="color:#475569">Além de confirmar sua presença, você também pode indicar se vai participar da <strong>resenha</strong> depois do jogo.</p>
      <div style="text-align:center;margin:28px 0">
        <a href="${linkConfirmacao}" style="background:#16a34a;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block">
          ✅ Confirmar presença
        </a>
      </div>
      <p style="color:#94a3b8;font-size:12px;text-align:center">Este link é de uso pessoal e expira em 7 dias.</p>
    </div>`);
}

export function templateEncerramentoPelada(
  peladaNome: string, data: string,
  destaque: string | null, aguaSalsicha: string | null,
  artilharia: { nome: string; gols: number }[]
) {
  const medalhas = ["🥇", "🥈", "🥉", "4°", "5°"];
  const topArt = artilharia.slice(0, 5).map((a, i) =>
    `<tr>
      <td style="padding:6px 8px;color:#475569">${medalhas[i]}</td>
      <td style="padding:6px 8px;color:#0f172a;font-weight:${i === 0 ? "bold" : "normal"}">${a.nome}</td>
      <td style="padding:6px 8px;text-align:right;color:#16a34a;font-weight:bold">${a.gols} ⚽</td>
    </tr>`
  ).join("");

  return wrapper(`
    ${headerGreen(peladaNome)}
    <div style="padding:28px 24px">
      <h2 style="color:#0f172a;margin:0 0 4px">Pelada encerrada!</h2>
      <p style="color:#94a3b8;margin:0 0 24px;font-size:14px">${data}</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
        <tr>
          <td style="width:50%;padding-right:8px;vertical-align:top">
            <div style="background:#f0fdf4;border-radius:10px;padding:16px;text-align:center">
              <p style="margin:0;font-size:28px">🏆</p>
              <p style="margin:4px 0 2px;font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:600">Destaque da Pelada</p>
              <p style="margin:0;font-weight:bold;color:#15803d;font-size:15px">${destaque || "—"}</p>
            </div>
          </td>
          <td style="width:50%;padding-left:8px;vertical-align:top">
            <div style="background:#fff7ed;border-radius:10px;padding:16px;text-align:center">
              <p style="margin:0;font-size:28px">🌊</p>
              <p style="margin:4px 0 2px;font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:600">Água de Salsicha</p>
              <p style="margin:0;font-weight:bold;color:#ea580c;font-size:15px">${aguaSalsicha || "—"}</p>
            </div>
          </td>
        </tr>
      </table>
      ${artilharia.length > 0 ? `
      <h3 style="color:#0f172a;margin:0 0 12px;font-size:15px">⚽ Ranking de artilharia</h3>
      <table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:8px;overflow:hidden">
        <tbody>${topArt}</tbody>
      </table>` : ""}
    </div>`);
}

export function templateLembrete(peladaNome: string, data: string, horario: string) {
  return wrapper(`
    ${headerGreen(peladaNome)}
    <div style="padding:28px 24px">
      <h2 style="color:#0f172a">Lembrete de Pelada!</h2>
      <p style="color:#475569">Não esqueça da pelada <strong>${data}</strong> às <strong>${horario}</strong>.</p>
      <p style="color:#475569">Confirme sua presença no sistema para garantir sua vaga!</p>
    </div>`);
}

export function templateVagaDisponivel(peladaNome: string, data: string) {
  return wrapper(`
    ${headerGreen(peladaNome)}
    <div style="padding:28px 24px">
      <h2 style="color:#0f172a">Vaga disponível!</h2>
      <p style="color:#475569">Uma vaga abriu para a pelada de <strong>${data}</strong>. Você saiu da lista de espera!</p>
    </div>`);
}
