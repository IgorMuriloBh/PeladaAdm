import { Response } from "express";
import { AuthRequest } from "../middlewares/auth";
import { prisma } from "../lib/prisma";
import { resolvePelada, getPeladaId } from "../lib/peladaHelper";

export async function listarVotacoes(req: AuthRequest, res: Response) {
  const pelada = await resolvePelada(req);
  if (!pelada) { res.status(404).json({ error: "Pelada não encontrada" }); return; }
  const peladaId = getPeladaId(req);

  const votacoes = await prisma.votacao.findMany({
    where: { partida: { peladaId } },
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
