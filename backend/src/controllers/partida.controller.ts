import { Response } from "express";
import { AuthRequest } from "../middlewares/auth";
import { prisma } from "../lib/prisma";
import { resolvePelada, getPeladaId } from "../lib/peladaHelper";
import { proximasOcorrencias } from "../utils/agenda";
import { sendEmail, templateLembrete, templateVagaDisponivel } from "../lib/email";
import { dispararAlertaNovaPartida, dispararAlertaEncerramentoPelada } from "./alerta.controller";
import { gerarResenhaComConfirmados } from "./financeiro.controller";


export async function listar(req: AuthRequest, res: Response) {
  const pelada = await resolvePelada(req);
  const peladaId = getPeladaId(req);
  if (!pelada) { res.status(404).json({ error: "Pelada não encontrada" }); return; }

  const partidas = await prisma.partida.findMany({
    // Exclui as partidas sintéticas geradas pela importação de histórico (01/01)
    where: {
      peladaId,
      OR: [
        { observacoes: null },
        { observacoes: { not: { startsWith: "Histórico importado" } } },
      ],
    },
    include: {
      _count: { select: { presencas: true } },
      presencas: { include: { jogadorPelada: { include: { jogador: true } } }, orderBy: { posicaoFila: "asc" } },
    },
    orderBy: { data: "asc" },
  });
  res.json(partidas);
}

export async function buscar(req: AuthRequest, res: Response) {
  const pelada = await resolvePelada(req);
  const peladaId = getPeladaId(req);
  if (!pelada) { res.status(404).json({ error: "Pelada não encontrada" }); return; }

  const partida = await prisma.partida.findFirst({
    where: { id: req.params.id as string, peladaId },
    include: {
      presencas: {
        include: { jogadorPelada: { include: { jogador: true } } },
        orderBy: [{ status: "asc" }, { posicaoFila: "asc" }],
      },
    },
  });
  if (!partida) { res.status(404).json({ error: "Partida não encontrada" }); return; }
  res.json(partida);
}

export async function criar(req: AuthRequest, res: Response) {
  const pelada = await resolvePelada(req);
  const peladaId = getPeladaId(req);
  if (!pelada) { res.status(404).json({ error: "Pelada não encontrada" }); return; }

  const { data, observacoes } = req.body;
  if (!data) { res.status(400).json({ error: "data é obrigatória" }); return; }

  const partida = await prisma.partida.create({
    data: { peladaId, data: new Date(data as string), observacoes: observacoes as string | undefined },
  });
  res.status(201).json(partida);

  // Dispara alerta em background — não bloqueia a resposta
  dispararAlertaNovaPartida(peladaId, partida.id).catch(() => {});
}

export async function gerarProximas(req: AuthRequest, res: Response) {
  const pelada = await resolvePelada(req);
  const peladaId = getPeladaId(req);
  if (!pelada) { res.status(404).json({ error: "Pelada não encontrada" }); return; }

  const quantidade = Number(req.query.quantidade) || 4;
  const datas = proximasOcorrencias(pelada.diaSemana, pelada.horario, quantidade);

  const criadas = [];
  for (const data of datas) {
    const existe = await prisma.partida.findFirst({ where: { peladaId, data } });
    if (!existe) {
      const p = await prisma.partida.create({ data: { peladaId, data } });
      criadas.push(p);
    }
  }
  res.json({ criadas: criadas.length, partidas: criadas });
}

export async function atualizar(req: AuthRequest, res: Response) {
  const pelada = await resolvePelada(req);
  const peladaId = getPeladaId(req);
  if (!pelada) { res.status(404).json({ error: "Pelada não encontrada" }); return; }

  const { status, observacoes } = req.body;
  const anteriorPartida = await prisma.partida.findUnique({ where: { id: req.params.id as string } });
  const partida = await prisma.partida.update({
    where: { id: req.params.id as string },
    data: { ...(status && { status }), ...(observacoes !== undefined && { observacoes }) },
  });
  res.json(partida);

  // Dispara alerta de encerramento quando status muda para REALIZADA
  if (status === "REALIZADA" && anteriorPartida?.status !== "REALIZADA") {
    dispararAlertaEncerramentoPelada(peladaId, partida.id).catch(() => {});
  }

  // Cria resenha automaticamente ao confirmar a pelada, se configurado
  if (status === "CONFIRMADA" && anteriorPartida?.status !== "CONFIRMADA") {
    prisma.configuracaoFinanceira.findUnique({ where: { peladaId } })
      .then(cfg => {
        if (cfg?.criarResenhaComPelada) return gerarResenhaComConfirmados(peladaId, partida.id);
      })
      .catch(() => {});
  }
}

export async function confirmarPresenca(req: AuthRequest, res: Response) {
  const pelada = await resolvePelada(req);
  const peladaId = getPeladaId(req);
  if (!pelada) { res.status(404).json({ error: "Pelada não encontrada" }); return; }

  const partidaId = req.params.id as string;
  const { jogadorPeladaId } = req.body;
  if (!jogadorPeladaId) { res.status(400).json({ error: "jogadorPeladaId é obrigatório" }); return; }

  const partida = await prisma.partida.findFirst({ where: { id: partidaId, peladaId } });
  if (!partida) { res.status(404).json({ error: "Partida não encontrada" }); return; }

  const jaExiste = await prisma.presenca.findUnique({ where: { partidaId_jogadorPeladaId: { partidaId, jogadorPeladaId } } });
  if (jaExiste) { res.status(409).json({ error: "Presença já registrada" }); return; }

  const confirmados = await prisma.presenca.count({ where: { partidaId, status: "CONFIRMADO" } });
  const status = confirmados < pelada.maxJogadores ? "CONFIRMADO" : "LISTA_ESPERA";

  let posicaoFila: number | undefined;
  if (status === "LISTA_ESPERA") {
    const maxFila = await prisma.presenca.aggregate({ where: { partidaId, status: "LISTA_ESPERA" }, _max: { posicaoFila: true } });
    posicaoFila = (maxFila._max.posicaoFila || 0) + 1;
  }

  const presenca = await prisma.presenca.create({
    data: { partidaId, jogadorPeladaId, status, posicaoFila },
    include: { jogadorPelada: { include: { jogador: true } } },
  });
  res.status(201).json(presenca);
}

export async function removerPresenca(req: AuthRequest, res: Response) {
  const pelada = await resolvePelada(req);
  const peladaId = getPeladaId(req);
  if (!pelada) { res.status(404).json({ error: "Pelada não encontrada" }); return; }

  const partidaId = req.params.id as string;
  const presencaId = req.params.presencaId as string;

  const presenca = await prisma.presenca.findUnique({ where: { id: presencaId } });
  if (!presenca) { res.status(404).json({ error: "Presença não encontrada" }); return; }

  await prisma.presenca.delete({ where: { id: presencaId } });

  // Promover primeiro da fila de espera se era CONFIRMADO
  if (presenca.status === "CONFIRMADO") {
    const proxDaFila = await prisma.presenca.findFirst({
      where: { partidaId, status: "LISTA_ESPERA" },
      orderBy: { posicaoFila: "asc" },
      include: { jogadorPelada: { include: { jogador: true } } },
    });
    if (proxDaFila) {
      await prisma.presenca.update({
        where: { id: proxDaFila.id },
        data: { status: "CONFIRMADO", posicaoFila: null },
      });
      // Reordenar fila
      const restanteFila = await prisma.presenca.findMany({
        where: { partidaId, status: "LISTA_ESPERA" },
        orderBy: { posicaoFila: "asc" },
      });
      for (let i = 0; i < restanteFila.length; i++) {
        await prisma.presenca.update({ where: { id: restanteFila[i].id }, data: { posicaoFila: i + 1 } });
      }
      // Notificar por e-mail
      const email = proxDaFila.jogadorPelada.jogador.email;
      const partidaInfo = await prisma.partida.findUnique({ where: { id: partidaId } });
      const dataFormatada = partidaInfo ? new Date(partidaInfo.data).toLocaleDateString("pt-BR") : "";
      sendEmail({ to: email, subject: `Vaga disponível — ${pelada.nome}`, html: templateVagaDisponivel(pelada.nome, dataFormatada) }).catch(() => {});
    }
  }

  res.json({ ok: true });
}

export async function enviarLembretes(req: AuthRequest, res: Response) {
  const pelada = await resolvePelada(req);
  const peladaId = getPeladaId(req);
  if (!pelada) { res.status(404).json({ error: "Pelada não encontrada" }); return; }

  const partidaId = req.params.id as string;
  const partida = await prisma.partida.findFirst({ where: { id: partidaId, peladaId } });
  if (!partida) { res.status(404).json({ error: "Partida não encontrada" }); return; }

  // Enviar para todos os jogadores ativos da pelada
  const jogadores = await prisma.jogadorPelada.findMany({
    where: { peladaId, ativo: true },
    include: { jogador: true },
  });

  const dataFormatada = new Date(partida.data).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" });
  let enviados = 0;
  for (const jp of jogadores) {
    try {
      await sendEmail({
        to: jp.jogador.email,
        subject: `Lembrete: ${pelada.nome} — ${dataFormatada}`,
        html: templateLembrete(pelada.nome, dataFormatada, pelada.horario),
      });
      enviados++;
    } catch {}
  }
  res.json({ enviados });
}

// ── Portal do jogador: confirma/cancela a própria presença ──────────────────
const CANCELAMENTO_LIMITE_MS = 2 * 60 * 60 * 1000; // 2 horas antes do início

export async function confirmarMinhaPresenca(req: AuthRequest, res: Response) {
  const pelada = await resolvePelada(req);
  const peladaId = getPeladaId(req);
  if (!pelada) { res.status(404).json({ error: "Pelada não encontrada" }); return; }

  const jogadorPeladaId = req.jogadorPeladaId;
  if (!jogadorPeladaId) { res.status(400).json({ error: "Seu usuário não está vinculado a um jogador" }); return; }

  const partidaId = req.params.partidaId as string;
  const partida = await prisma.partida.findFirst({ where: { id: partidaId, peladaId } });
  if (!partida) { res.status(404).json({ error: "Partida não encontrada" }); return; }
  if (["REALIZADA", "CANCELADA"].includes(partida.status)) {
    res.status(400).json({ error: "Esta pelada não está mais aberta para confirmação" }); return;
  }

  const ja = await prisma.presenca.findUnique({ where: { partidaId_jogadorPeladaId: { partidaId, jogadorPeladaId } } });
  if (ja) { res.status(200).json(ja); return; }

  const confirmados = await prisma.presenca.count({ where: { partidaId, status: "CONFIRMADO" } });
  const status = confirmados < pelada.maxJogadores ? "CONFIRMADO" : "LISTA_ESPERA";

  let posicaoFila: number | undefined;
  if (status === "LISTA_ESPERA") {
    const maxFila = await prisma.presenca.aggregate({ where: { partidaId, status: "LISTA_ESPERA" }, _max: { posicaoFila: true } });
    posicaoFila = (maxFila._max.posicaoFila || 0) + 1;
  }

  const presenca = await prisma.presenca.create({
    data: { partidaId, jogadorPeladaId, status, posicaoFila },
    include: { jogadorPelada: { include: { jogador: true } } },
  });
  res.status(201).json(presenca);
}

export async function removerMinhaPresenca(req: AuthRequest, res: Response) {
  const pelada = await resolvePelada(req);
  const peladaId = getPeladaId(req);
  if (!pelada) { res.status(404).json({ error: "Pelada não encontrada" }); return; }

  const jogadorPeladaId = req.jogadorPeladaId;
  if (!jogadorPeladaId) { res.status(400).json({ error: "Seu usuário não está vinculado a um jogador" }); return; }

  const partidaId = req.params.partidaId as string;
  const partida = await prisma.partida.findFirst({ where: { id: partidaId, peladaId } });
  if (!partida) { res.status(404).json({ error: "Partida não encontrada" }); return; }

  // Regra: só pode cancelar até 2 horas antes do início da pelada
  const limite = new Date(partida.data).getTime() - CANCELAMENTO_LIMITE_MS;
  if (Date.now() > limite) {
    res.status(400).json({ error: "O cancelamento só é permitido até 2 horas antes do início da pelada" }); return;
  }

  const presenca = await prisma.presenca.findUnique({ where: { partidaId_jogadorPeladaId: { partidaId, jogadorPeladaId } } });
  if (!presenca) { res.status(404).json({ error: "Você não está confirmado nesta pelada" }); return; }

  await prisma.presenca.delete({ where: { id: presenca.id } });

  // Promover o primeiro da fila de espera se o cancelado era CONFIRMADO
  if (presenca.status === "CONFIRMADO") {
    const proxDaFila = await prisma.presenca.findFirst({
      where: { partidaId, status: "LISTA_ESPERA" },
      orderBy: { posicaoFila: "asc" },
      include: { jogadorPelada: { include: { jogador: true } } },
    });
    if (proxDaFila) {
      await prisma.presenca.update({ where: { id: proxDaFila.id }, data: { status: "CONFIRMADO", posicaoFila: null } });
      const restanteFila = await prisma.presenca.findMany({ where: { partidaId, status: "LISTA_ESPERA" }, orderBy: { posicaoFila: "asc" } });
      for (let i = 0; i < restanteFila.length; i++) {
        await prisma.presenca.update({ where: { id: restanteFila[i].id }, data: { posicaoFila: i + 1 } });
      }
      sendEmail({ to: proxDaFila.jogadorPelada.jogador.email, subject: `Vaga disponível — ${pelada.nome}`, html: templateVagaDisponivel(pelada.nome, new Date(partida.data).toLocaleDateString("pt-BR")) }).catch(() => {});
    }
  }

  res.json({ ok: true });
}

// Estado atual da confirmação do jogador (pelada + resenha) numa partida
export async function minhaConfirmacao(req: AuthRequest, res: Response) {
  const pelada = await resolvePelada(req);
  const peladaId = getPeladaId(req);
  if (!pelada) { res.status(404).json({ error: "Pelada não encontrada" }); return; }
  const jogadorPeladaId = req.jogadorPeladaId;
  if (!jogadorPeladaId) { res.status(400).json({ error: "Seu usuário não está vinculado a um jogador" }); return; }

  const partidaId = req.params.partidaId as string;
  const presenca = await prisma.presenca.findUnique({ where: { partidaId_jogadorPeladaId: { partidaId, jogadorPeladaId } } });
  const resenha = await prisma.resenha.findUnique({ where: { partidaId }, include: { presencas: { where: { jogadorPeladaId } } } });
  const rp = resenha?.presencas[0];

  res.json({
    naPelada: !!presenca,
    statusPelada: presenca?.status || null,
    naResenha: !!rp,
    categoriaResenha: rp?.categoria || null,
  });
}

// Confirmação do jogador com opções: pelada e/ou resenha (com categoria)
export async function confirmarPresencaOpcoes(req: AuthRequest, res: Response) {
  const pelada = await resolvePelada(req, true);
  const peladaId = getPeladaId(req);
  if (!pelada) { res.status(404).json({ error: "Pelada não encontrada" }); return; }
  const jogadorPeladaId = req.jogadorPeladaId;
  if (!jogadorPeladaId) { res.status(400).json({ error: "Seu usuário não está vinculado a um jogador" }); return; }

  const partidaId = req.params.partidaId as string;
  const { pelada: confPelada, resenha: confResenha, bebe } = req.body;
  if (!confPelada && !confResenha) {
    res.status(400).json({ error: "Escolha ao menos uma opção (pelada e/ou resenha)" }); return;
  }

  const partida = await prisma.partida.findFirst({ where: { id: partidaId, peladaId } });
  if (!partida) { res.status(404).json({ error: "Partida não encontrada" }); return; }
  if (["REALIZADA", "CANCELADA"].includes(partida.status)) {
    res.status(400).json({ error: "Esta pelada não está mais aberta para confirmação" }); return;
  }

  const jp = await prisma.jogadorPelada.findUnique({ where: { id: jogadorPeladaId } });
  if (!jp) { res.status(404).json({ error: "Jogador não encontrado" }); return; }

  // ── Presença na pelada ────────────────────────────────────────────────────
  const presencaAtual = await prisma.presenca.findUnique({ where: { partidaId_jogadorPeladaId: { partidaId, jogadorPeladaId } } });
  if (confPelada) {
    if (!presencaAtual) {
      const confirmados = await prisma.presenca.count({ where: { partidaId, status: "CONFIRMADO" } });
      const status = confirmados < pelada.maxJogadores ? "CONFIRMADO" : "LISTA_ESPERA";
      let posicaoFila: number | undefined;
      if (status === "LISTA_ESPERA") {
        const maxFila = await prisma.presenca.aggregate({ where: { partidaId, status: "LISTA_ESPERA" }, _max: { posicaoFila: true } });
        posicaoFila = (maxFila._max.posicaoFila || 0) + 1;
      }
      await prisma.presenca.create({ data: { partidaId, jogadorPeladaId, status, posicaoFila } });
    }
  } else if (presencaAtual) {
    // Opção "só resenha": remove a presença da pelada e promove a fila se preciso
    await prisma.presenca.delete({ where: { id: presencaAtual.id } });
    if (presencaAtual.status === "CONFIRMADO") {
      const prox = await prisma.presenca.findFirst({ where: { partidaId, status: "LISTA_ESPERA" }, orderBy: { posicaoFila: "asc" }, include: { jogadorPelada: { include: { jogador: true } } } });
      if (prox) {
        await prisma.presenca.update({ where: { id: prox.id }, data: { status: "CONFIRMADO", posicaoFila: null } });
        const fila = await prisma.presenca.findMany({ where: { partidaId, status: "LISTA_ESPERA" }, orderBy: { posicaoFila: "asc" } });
        for (let i = 0; i < fila.length; i++) await prisma.presenca.update({ where: { id: fila[i].id }, data: { posicaoFila: i + 1 } });
        sendEmail({ to: prox.jogadorPelada.jogador.email, subject: `Vaga disponível — ${pelada.nome}`, html: templateVagaDisponivel(pelada.nome, new Date(partida.data).toLocaleDateString("pt-BR")) }).catch(() => {});
      }
    }
  }

  // ── Resenha ───────────────────────────────────────────────────────────────
  if (confResenha) {
    let resenha = await prisma.resenha.findUnique({ where: { partidaId } });
    if (!resenha) resenha = await prisma.resenha.create({ data: { partidaId } });

    const cfg = (pelada as any).configuracaoFinanceira;
    const isGoleiro = jp.posicao === "GOLEIRO";
    // Goleiro sempre usa o custo de goleiro; os demais dependem de beber ou não
    const categoria = isGoleiro ? "GOLEIRO_BEBE" : (bebe ? "BEBE" : "NAO_BEBE");
    const valorDevido = categoria === "BEBE" ? (cfg?.resenhaBebe ?? 85)
      : categoria === "GOLEIRO_BEBE" ? (cfg?.resenhaGoleiro ?? 40)
      : (cfg?.resenhaNaoBebe ?? 40);

    await prisma.resenhaPresenca.upsert({
      where: { resenhaId_jogadorPeladaId: { resenhaId: resenha.id, jogadorPeladaId } },
      create: { resenhaId: resenha.id, jogadorPeladaId, categoria: categoria as any, valorDevido },
      update: { categoria: categoria as any, valorDevido },
    });
  } else {
    const resenha = await prisma.resenha.findUnique({ where: { partidaId } });
    if (resenha) await prisma.resenhaPresenca.deleteMany({ where: { resenhaId: resenha.id, jogadorPeladaId } });
  }

  res.json({ ok: true });
}

// Cancela a confirmação do jogador (pelada + resenha), respeitando o limite de 2h
export async function cancelarMinhaConfirmacao(req: AuthRequest, res: Response) {
  const pelada = await resolvePelada(req);
  const peladaId = getPeladaId(req);
  if (!pelada) { res.status(404).json({ error: "Pelada não encontrada" }); return; }
  const jogadorPeladaId = req.jogadorPeladaId;
  if (!jogadorPeladaId) { res.status(400).json({ error: "Seu usuário não está vinculado a um jogador" }); return; }

  const partidaId = req.params.partidaId as string;
  const partida = await prisma.partida.findFirst({ where: { id: partidaId, peladaId } });
  if (!partida) { res.status(404).json({ error: "Partida não encontrada" }); return; }

  const limite = new Date(partida.data).getTime() - CANCELAMENTO_LIMITE_MS;
  if (Date.now() > limite) {
    res.status(400).json({ error: "O cancelamento só é permitido até 2 horas antes do início da pelada" }); return;
  }

  const presenca = await prisma.presenca.findUnique({ where: { partidaId_jogadorPeladaId: { partidaId, jogadorPeladaId } } });
  const resenha = await prisma.resenha.findUnique({ where: { partidaId } });
  const naResenha = resenha ? await prisma.resenhaPresenca.findUnique({ where: { resenhaId_jogadorPeladaId: { resenhaId: resenha.id, jogadorPeladaId } } }) : null;

  if (!presenca && !naResenha) { res.status(404).json({ error: "Você não está confirmado nesta pelada" }); return; }

  if (resenha && naResenha) {
    await prisma.resenhaPresenca.deleteMany({ where: { resenhaId: resenha.id, jogadorPeladaId } });
  }

  if (presenca) {
    await prisma.presenca.delete({ where: { id: presenca.id } });
    if (presenca.status === "CONFIRMADO") {
      const prox = await prisma.presenca.findFirst({ where: { partidaId, status: "LISTA_ESPERA" }, orderBy: { posicaoFila: "asc" }, include: { jogadorPelada: { include: { jogador: true } } } });
      if (prox) {
        await prisma.presenca.update({ where: { id: prox.id }, data: { status: "CONFIRMADO", posicaoFila: null } });
        const fila = await prisma.presenca.findMany({ where: { partidaId, status: "LISTA_ESPERA" }, orderBy: { posicaoFila: "asc" } });
        for (let i = 0; i < fila.length; i++) await prisma.presenca.update({ where: { id: fila[i].id }, data: { posicaoFila: i + 1 } });
        sendEmail({ to: prox.jogadorPelada.jogador.email, subject: `Vaga disponível — ${pelada.nome}`, html: templateVagaDisponivel(pelada.nome, new Date(partida.data).toLocaleDateString("pt-BR")) }).catch(() => {});
      }
    }
  }

  res.json({ ok: true });
}
