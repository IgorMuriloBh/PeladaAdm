import { Response } from "express";
import { AuthRequest } from "../middlewares/auth";
import { prisma } from "../lib/prisma";
import { resolvePelada, getPeladaId } from "../lib/peladaHelper";

export async function listarGols(req: AuthRequest, res: Response) {
  const pelada = await resolvePelada(req);
  if (!pelada) { res.status(404).json({ error: "Pelada não encontrada" }); return; }

  const gols = await prisma.gol.findMany({
    where: { partidaId: req.params.partidaId as string },
    include: { jogadorPelada: { include: { jogador: true } } },
    orderBy: { minuto: "asc" },
  });
  res.json(gols);
}

export async function registrarGol(req: AuthRequest, res: Response) {
  const pelada = await resolvePelada(req);
  if (!pelada) { res.status(404).json({ error: "Pelada não encontrada" }); return; }

  const { jogadorPeladaId, minuto, time } = req.body;
  if (!jogadorPeladaId) { res.status(400).json({ error: "jogadorPeladaId é obrigatório" }); return; }

  const gol = await prisma.gol.create({
    data: { partidaId: req.params.partidaId as string, jogadorPeladaId, minuto: minuto ? Number(minuto) : null, time: time || null },
    include: { jogadorPelada: { include: { jogador: true } } },
  });
  res.status(201).json(gol);
}

export async function removerGol(req: AuthRequest, res: Response) {
  const pelada = await resolvePelada(req);
  if (!pelada) { res.status(404).json({ error: "Pelada não encontrada" }); return; }

  await prisma.gol.delete({ where: { id: req.params.golId as string } });
  res.json({ ok: true });
}

export async function atualizarPlacar(req: AuthRequest, res: Response) {
  const pelada = await resolvePelada(req);
  if (!pelada) { res.status(404).json({ error: "Pelada não encontrada" }); return; }

  const { placarTimeA, placarTimeB } = req.body;
  const partida = await prisma.partida.update({
    where: { id: req.params.partidaId as string },
    data: {
      placarTimeA: placarTimeA !== undefined ? Number(placarTimeA) : undefined,
      placarTimeB: placarTimeB !== undefined ? Number(placarTimeB) : undefined,
    },
  });
  res.json(partida);
}
