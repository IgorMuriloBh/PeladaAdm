import { Request, Response } from "express";
import { AuthRequest } from "../middlewares/auth";
import { prisma } from "../lib/prisma";
import { sendEmail, templateNovaPartida, templateEncerramentoPelada, SmtpConfig } from "../lib/email";
import crypto from "crypto";

const APP_URL = process.env.APP_URL || "http://localhost:3002";

// ── Config SMTP por pelada ──────────────────────────────────────────────────

export async function buscarConfigAlerta(req: AuthRequest, res: Response) {
  const peladaId = req.params.peladaId as string;
  const pelada = await prisma.pelada.findFirst({ where: { id: peladaId, adminId: req.adminId as string } });
  if (!pelada) { res.status(404).json({ error: "Pelada não encontrada" }); return; }

  let cfg = await prisma.configuracaoAlerta.findUnique({ where: { peladaId } });
  if (!cfg) {
    cfg = await prisma.configuracaoAlerta.create({ data: { peladaId } });
  }
  // Não retorna a senha SMTP
  res.json({ ...cfg, smtpPass: cfg.smtpPass ? "••••••••" : "" });
}

export async function salvarConfigAlerta(req: AuthRequest, res: Response) {
  const peladaId = req.params.peladaId as string;
  const pelada = await prisma.pelada.findFirst({ where: { id: peladaId, adminId: req.adminId as string } });
  if (!pelada) { res.status(404).json({ error: "Pelada não encontrada" }); return; }

  const { ativo, smtpPort, alertaNovaPartida, alertaEncerramentoPelada } = req.body;
  // Trim em todos os campos de texto para evitar espaços acidentais
  const smtpHost = (req.body.smtpHost || "").trim();
  const smtpUser = (req.body.smtpUser || "").trim();
  const smtpPass = (req.body.smtpPass || "").trim();
  const emailRemetente = (req.body.emailRemetente || "").trim();
  const nomeRemetente = (req.body.nomeRemetente || "").trim();

  const data: Record<string, unknown> = {
    ativo, smtpHost, smtpPort: smtpPort ? Number(smtpPort) : undefined,
    smtpUser, emailRemetente, nomeRemetente, alertaNovaPartida, alertaEncerramentoPelada,
  };
  // Só atualiza a senha se veio uma nova (não "••••••••")
  if (smtpPass && smtpPass !== "••••••••") data.smtpPass = smtpPass;

  const cfg = await prisma.configuracaoAlerta.upsert({
    where: { peladaId },
    create: { peladaId, ...data } as any,
    update: data,
  });
  res.json({ ...cfg, smtpPass: cfg.smtpPass ? "••••••••" : "" });
}

export async function testarEmail(req: AuthRequest, res: Response) {
  const peladaId = req.params.peladaId as string;
  const pelada = await prisma.pelada.findFirst({ where: { id: peladaId, adminId: req.adminId as string } });
  if (!pelada) { res.status(404).json({ error: "Pelada não encontrada" }); return; }

  const cfg = await prisma.configuracaoAlerta.findUnique({ where: { peladaId } });
  if (!cfg || !cfg.smtpUser) { res.status(400).json({ error: "Configure o SMTP antes de testar" }); return; }

  const { emailDestino } = req.body;
  if (!emailDestino) { res.status(400).json({ error: "emailDestino é obrigatório" }); return; }

  // Valida campos obrigatórios antes de tentar conectar
  const camposFaltando = [];
  if (!cfg.smtpHost) camposFaltando.push("Host SMTP");
  if (!cfg.smtpUser) camposFaltando.push("Usuário SMTP");
  if (!cfg.smtpPass) camposFaltando.push("Senha SMTP");
  if (camposFaltando.length > 0) {
    res.status(400).json({ error: `Campos obrigatórios não preenchidos: ${camposFaltando.join(", ")}. Salve a configuração antes de testar.` });
    return;
  }

  try {
    const smtpCfg: SmtpConfig = {
      host: cfg.smtpHost, port: cfg.smtpPort, user: cfg.smtpUser, pass: cfg.smtpPass,
      remetente: cfg.emailRemetente || cfg.smtpUser, nomeRemetente: cfg.nomeRemetente,
    };
    await sendEmail({
      to: emailDestino,
      subject: `✅ Teste de email — ${pelada.nome}`,
      html: `<p style="font-family:Arial;padding:24px">Email de teste do sistema <strong>${pelada.nome}</strong> funcionando corretamente! 🎉</p>`,
    }, smtpCfg);
    res.json({ ok: true });
  } catch (e: any) {
    const msg: string = e.message || "";
    let erro = msg;
    if (msg.includes("ENOTFOUND")) {
      erro = `Não foi possível resolver o servidor "${cfg.smtpHost}". Verifique o Host SMTP e se há conexão com a internet.`;
    } else if (msg.includes("ECONNREFUSED")) {
      erro = `Conexão recusada em ${cfg.smtpHost}:${cfg.smtpPort}. Verifique o host e a porta SMTP.`;
    } else if (msg.includes("ETIMEDOUT") || msg.includes("ESOCKETTIMEDOUT")) {
      erro = `Timeout ao conectar em ${cfg.smtpHost}:${cfg.smtpPort}. Verifique se a porta não está bloqueada por firewall.`;
    } else if (msg.includes("535") || msg.includes("534") || msg.toLowerCase().includes("auth")) {
      erro = `Falha de autenticação. Verifique usuário e senha. Para Gmail, use uma Senha de App (não a senha normal da conta).`;
    } else if (msg.includes("STARTTLS") || msg.includes("TLS")) {
      erro = `Erro de TLS/SSL. Tente a porta 465 com SSL ou 587 com STARTTLS.`;
    }
    res.status(500).json({ error: erro, detalhe: msg });
  }
}

// ── Envio alerta nova partida ───────────────────────────────────────────────

export async function dispararAlertaNovaPartida(peladaId: string, partidaId: string) {
  const [pelada, partida, cfg] = await Promise.all([
    prisma.pelada.findUnique({ where: { id: peladaId } }),
    prisma.partida.findUnique({ where: { id: partidaId } }),
    prisma.configuracaoAlerta.findUnique({ where: { peladaId } }),
  ]);
  if (!pelada || !partida || !cfg || !cfg.ativo || !cfg.alertaNovaPartida || !cfg.smtpUser) return;

  // Busca mensalistas ativos e adimplentes
  const mesAtual = new Date().getMonth() + 1;
  const anoAtual = new Date().getFullYear();

  const jogadores = await prisma.jogadorPelada.findMany({
    where: { peladaId, tipo: "MENSALISTA", ativo: true },
    include: { jogador: true },
  });

  // Verifica inadimplência: tem pagamento de mensalidade do mês atual NÃO pago
  const inadimplentes = await prisma.pagamento.findMany({
    where: {
      jogadorPelada: { peladaId },
      tipo: "MENSALIDADE",
      mes: mesAtual, ano: anoAtual,
      pago: false,
    },
    select: { jogadorPeladaId: true },
  });
  const inadimplenteIds = new Set(inadimplentes.map(p => p.jogadorPeladaId));

  const dataFormatada = partida.data.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
  const smtpCfg: SmtpConfig = {
    host: cfg.smtpHost, port: cfg.smtpPort, user: cfg.smtpUser, pass: cfg.smtpPass,
    remetente: cfg.emailRemetente, nomeRemetente: cfg.nomeRemetente,
  };

  // Expira em 7 dias
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  for (const jp of jogadores) {
    if (inadimplenteIds.has(jp.id)) continue; // pula inadimplentes
    if (!jp.jogador.email) continue;

    // Cria token único
    const token = crypto.randomUUID();
    await prisma.presencaToken.create({
      data: { token, jogadorPeladaId: jp.id, partidaId, expiresAt },
    });

    const link = `${APP_URL}/confirmar/${token}`;
    await sendEmail({
      to: jp.jogador.email,
      subject: `⚽ ${pelada.nome} — Lista aberta: ${dataFormatada}`,
      html: templateNovaPartida(pelada.nome, jp.jogador.nome, dataFormatada, pelada.horario, link),
    }, smtpCfg).catch(() => {}); // não bloqueia se um email falhar
  }
}

// ── Envio alerta encerramento ───────────────────────────────────────────────

export async function dispararAlertaEncerramentoPelada(peladaId: string, partidaId: string) {
  const [pelada, partida, cfg] = await Promise.all([
    prisma.pelada.findUnique({ where: { id: peladaId } }),
    prisma.partida.findUnique({
      where: { id: partidaId },
      include: {
        presencas: { include: { jogadorPelada: { include: { jogador: true } } } },
        votacoes: { include: { jogadorPelada: { include: { jogador: true } }, votos: true } },
        gols: { include: { jogadorPelada: { include: { jogador: true } } } },
      },
    }),
    prisma.configuracaoAlerta.findUnique({ where: { peladaId } }),
  ]);
  if (!pelada || !partida || !cfg || !cfg.ativo || !cfg.alertaEncerramentoPelada || !cfg.smtpUser) return;

  // Calcula destaque e água de salsicha
  const votacoesPorTipo = (tipo: string) =>
    partida.votacoes.filter(v => v.tipo === tipo)
      .sort((a, b) => b.votos.length - a.votos.length);

  const destaque = votacoesPorTipo("DESTAQUE")[0]?.jogadorPelada.jogador.nome || null;
  const agua = votacoesPorTipo("AGUA_SALSICHA")[0]?.jogadorPelada.jogador.nome || null;

  // Artilharia geral da pelada
  const golsAgg = await prisma.gol.groupBy({
    by: ["jogadorPeladaId"],
    where: { partida: { peladaId } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  });
  const jpIds = golsAgg.map(g => g.jogadorPeladaId);
  const jps = await prisma.jogadorPelada.findMany({
    where: { id: { in: jpIds } },
    include: { jogador: true },
  });
  const artilharia = golsAgg.map(g => ({
    nome: jps.find(j => j.id === g.jogadorPeladaId)?.jogador.nome || "?",
    gols: g._count.id,
  }));

  const dataFormatada = partida.data.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
  const smtpCfg: SmtpConfig = {
    host: cfg.smtpHost, port: cfg.smtpPort, user: cfg.smtpUser, pass: cfg.smtpPass,
    remetente: cfg.emailRemetente, nomeRemetente: cfg.nomeRemetente,
  };

  // Envia para todos os presentes
  const presentes = partida.presencas.filter(p => p.status === "CONFIRMADO");
  for (const pr of presentes) {
    const email = pr.jogadorPelada.jogador.email;
    if (!email) continue;
    await sendEmail({
      to: email,
      subject: `🏆 ${pelada.nome} — Resultados de ${dataFormatada}`,
      html: templateEncerramentoPelada(pelada.nome, dataFormatada, destaque, agua, artilharia),
    }, smtpCfg).catch(() => {});
  }
}

// ── Rota pública: confirmar presença via token ─────────────────────────────

export async function buscarToken(req: Request, res: Response) {
  const { token } = req.params;
  const pt = await prisma.presencaToken.findUnique({
    where: { token },
    include: {
      partida: { include: { pelada: true } },
      jogadorPelada: { include: { jogador: true } },
    },
  });
  if (!pt) { res.status(404).json({ error: "Link inválido" }); return; }
  if (pt.expiresAt < new Date()) { res.status(410).json({ error: "Link expirado" }); return; }

  // Verifica se já respondeu
  const presenca = await prisma.presenca.findUnique({
    where: { partidaId_jogadorPeladaId: { partidaId: pt.partidaId, jogadorPeladaId: pt.jogadorPeladaId } },
  });

  res.json({
    jogadorNome: pt.jogadorPelada.jogador.nome,
    peladaNome: pt.partida.pelada.nome,
    corPrimaria: pt.partida.pelada.corPrimaria,
    corTexto: pt.partida.pelada.corTexto,
    data: pt.partida.data,
    horario: pt.partida.pelada.horario,
    usado: pt.usado,
    respostaAtual: presenca ? {
      status: presenca.status,
      interesseResenha: presenca.interesseResenha,
      categoriaResenha: presenca.categoriaResenha,
    } : null,
  });
}

export async function confirmarViaToken(req: Request, res: Response) {
  const { token } = req.params;
  const { presenca: statusPresenca, interesseResenha, categoriaResenha } = req.body;

  const pt = await prisma.presencaToken.findUnique({ where: { token } });
  if (!pt) { res.status(404).json({ error: "Link inválido" }); return; }
  if (pt.expiresAt < new Date()) { res.status(410).json({ error: "Link expirado" }); return; }

  // Upsert presença
  await prisma.presenca.upsert({
    where: { partidaId_jogadorPeladaId: { partidaId: pt.partidaId, jogadorPeladaId: pt.jogadorPeladaId } },
    create: {
      partidaId: pt.partidaId,
      jogadorPeladaId: pt.jogadorPeladaId,
      status: statusPresenca || "CONFIRMADO",
      interesseResenha: interesseResenha ?? null,
      categoriaResenha: categoriaResenha || null,
    },
    update: {
      status: statusPresenca || "CONFIRMADO",
      interesseResenha: interesseResenha ?? null,
      categoriaResenha: categoriaResenha || null,
    },
  });

  // Marca token como usado
  await prisma.presencaToken.update({ where: { token }, data: { usado: true } });

  res.json({ ok: true });
}
