import { Response } from "express";
import { AuthRequest } from "../middlewares/auth";
import { prisma } from "../lib/prisma";
import { resolvePelada, getPeladaId } from "../lib/peladaHelper";

export async function listarVotacoes(req: AuthRequest, res: Response) {
  const pelada = await resolvePelada(req);
  if (!pelada) { res.status(404).json({ error: "Pelada não encontrada" }); return; }
  const peladaId = getPeladaId(req);

  const votacoes = await prisma.votacao.findMany({
    // Exclui destaques lançados na partida sintética de histórico (01/01)
    where: {
      partida: {
        peladaId,
        OR: [
          { observacoes: null },
          { observacoes: { not: { startsWith: "Histórico importado" } } },
        ],
      },
    },
    include: {
      jogadorPelada: { include: { jogador: true } },
      partida: { select: { data: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(votacoes);
}

export async function registrarVotacao(req: AuthRequest, res: Response) {
  const pelada = await resolvePelada(req);
  if (!pelada) { res.status(404).json({ error: "Pelada não encontrada" }); return; }

  const partidaId = req.params.partidaId as string;
  const { jogadorPeladaId, tipo } = req.body;

  if (!jogadorPeladaId || !tipo) {
    res.status(400).json({ error: "jogadorPeladaId e tipo são obrigatórios" }); return;
  }
  if (!["DESTAQUE", "AGUA_SALSICHA"].includes(tipo)) {
    res.status(400).json({ error: "tipo deve ser DESTAQUE ou AGUA_SALSICHA" }); return;
  }

  // remove votação anterior do mesmo tipo na mesma partida
  await prisma.votacao.deleteMany({ where: { partidaId, tipo } });

  const votacao = await prisma.votacao.create({
    data: { partidaId, jogadorPeladaId, tipo },
    include: { jogadorPelada: { include: { jogador: true } } },
  });
  res.status(201).json(votacao);
}

export async function removerVotacao(req: AuthRequest, res: Response) {
  const pelada = await resolvePelada(req);
  if (!pelada) { res.status(404).json({ error: "Pelada não encontrada" }); return; }

  await prisma.votacao.delete({ where: { id: req.params.votacaoId as string } });
  res.json({ ok: true });
}

export async function votacoesPorPartida(req: AuthRequest, res: Response) {
  const pelada = await resolvePelada(req);
  if (!pelada) { res.status(404).json({ error: "Pelada não encontrada" }); return; }

  const votacoes = await prisma.votacao.findMany({
    where: { partidaId: req.params.partidaId as string },
    include: { jogadorPelada: { include: { jogador: true } } },
  });
  res.json(votacoes);
}

// ════════════════════════════════════════════════════════════════════════════
// Enquete dos jogadores (VotoJogador) — separada do destaque oficial da pelada
// ════════════════════════════════════════════════════════════════════════════

// Jogador registra seu voto (uma vez por tema, só com pelada EM_ANDAMENTO)
export async function registrarVotoJogador(req: AuthRequest, res: Response) {
  const pelada = await resolvePelada(req);
  const peladaId = getPeladaId(req);
  if (!pelada) { res.status(404).json({ error: "Pelada não encontrada" }); return; }

  const votanteId = req.userId;
  if (!votanteId) { res.status(401).json({ error: "Usuário não autenticado" }); return; }

  const partidaId = req.params.partidaId as string;
  const { jogadorPeladaId, tipo } = req.body;
  if (!jogadorPeladaId || !tipo) { res.status(400).json({ error: "jogadorPeladaId e tipo são obrigatórios" }); return; }
  if (!["DESTAQUE", "AGUA_SALSICHA"].includes(tipo)) { res.status(400).json({ error: "tipo inválido" }); return; }

  const partida = await prisma.partida.findFirst({ where: { id: partidaId, peladaId } });
  if (!partida) { res.status(404).json({ error: "Partida não encontrada" }); return; }
  if (partida.status !== "EM_ANDAMENTO") {
    res.status(400).json({ error: "A votação só é permitida com a pelada em andamento" }); return;
  }

  const jaVotou = await prisma.votoJogador.findUnique({
    where: { partidaId_tipo_votanteId: { partidaId, tipo, votanteId } },
  });
  if (jaVotou) {
    res.status(409).json({ error: "Você já votou neste tema. Peça a um administrador ou operador para zerar seu voto." }); return;
  }

  const voto = await prisma.votoJogador.create({ data: { partidaId, tipo, votanteId, jogadorPeladaId } });
  res.status(201).json(voto);
}

// Resultado da enquete + o que o usuário atual já votou + lista para gestão (adm/operador)
export async function resultadoVotoJogador(req: AuthRequest, res: Response) {
  const pelada = await resolvePelada(req);
  const peladaId = getPeladaId(req);
  if (!pelada) { res.status(404).json({ error: "Pelada não encontrada" }); return; }

  const partidaId = req.params.partidaId as string;
  const partida = await prisma.partida.findFirst({ where: { id: partidaId, peladaId } });
  if (!partida) { res.status(404).json({ error: "Partida não encontrada" }); return; }

  const votos = await prisma.votoJogador.findMany({
    where: { partidaId },
    include: { jogadorPelada: { include: { jogador: true } } },
  });

  // Nomes dos votantes (Usuario) para o painel de gestão
  const votanteIds = [...new Set(votos.map(v => v.votanteId))];
  const votantes = await prisma.usuario.findMany({
    where: { id: { in: votanteIds } },
    select: { id: true, nome: true },
  });
  const nomeVotante = new Map(votantes.map(u => [u.id, u.nome]));

  // Apuração por tema
  function apurar(tipo: string) {
    const filtrados = votos.filter(v => v.tipo === tipo);
    const contagem = new Map<string, { jogadorPeladaId: string; nome: string; votos: number }>();
    for (const v of filtrados) {
      const atual = contagem.get(v.jogadorPeladaId) || { jogadorPeladaId: v.jogadorPeladaId, nome: v.jogadorPelada.jogador.nome, votos: 0 };
      atual.votos++;
      contagem.set(v.jogadorPeladaId, atual);
    }
    return [...contagem.values()].sort((a, b) => b.votos - a.votos);
  }

  const meuId = req.userId;
  res.json({
    status: partida.status,
    emAndamento: partida.status === "EM_ANDAMENTO",
    apuracao: { DESTAQUE: apurar("DESTAQUE"), AGUA_SALSICHA: apurar("AGUA_SALSICHA") },
    meusVotos: {
      DESTAQUE: votos.find(v => v.tipo === "DESTAQUE" && v.votanteId === meuId)?.jogadorPeladaId || null,
      AGUA_SALSICHA: votos.find(v => v.tipo === "AGUA_SALSICHA" && v.votanteId === meuId)?.jogadorPeladaId || null,
    },
    votos: votos.map(v => ({
      id: v.id,
      tipo: v.tipo,
      votanteId: v.votanteId,
      votanteNome: nomeVotante.get(v.votanteId) || "—",
      jogadorPeladaId: v.jogadorPeladaId,
      jogadorNome: v.jogadorPelada.jogador.nome,
    })),
  });
}

// Adm/Operador zera o voto de um votante (só com pelada EM_ANDAMENTO)
export async function zerarVotoJogador(req: AuthRequest, res: Response) {
  const pelada = await resolvePelada(req);
  const peladaId = getPeladaId(req);
  if (!pelada) { res.status(404).json({ error: "Pelada não encontrada" }); return; }

  const partidaId = req.params.partidaId as string;
  const votanteId = req.params.votanteId as string;
  const tipo = req.query.tipo as string | undefined;

  const partida = await prisma.partida.findFirst({ where: { id: partidaId, peladaId } });
  if (!partida) { res.status(404).json({ error: "Partida não encontrada" }); return; }
  if (partida.status !== "EM_ANDAMENTO") {
    res.status(400).json({ error: "Só é possível zerar votos com a pelada em andamento" }); return;
  }

  await prisma.votoJogador.deleteMany({
    where: { partidaId, votanteId, ...(tipo ? { tipo: tipo as any } : {}) },
  });
  res.json({ ok: true });
}
