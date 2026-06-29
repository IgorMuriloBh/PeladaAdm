import { Response } from "express";
import { AuthRequest } from "../middlewares/auth";
import { prisma } from "../lib/prisma";

async function getPelada(peladaId: string, adminId: string) {
  return prisma.pelada.findFirst({ where: { id: peladaId, adminId } });
}

export async function sortearTimes(req: AuthRequest, res: Response) {
  const peladaId = req.params.peladaId as string;
  const pelada = await getPelada(peladaId, req.adminId as string);
  if (!pelada) { res.status(404).json({ error: "Pelada não encontrada" }); return; }

  const partidaId = req.params.partidaId as string;

  const presencas = await prisma.presenca.findMany({
    where: { partidaId, status: "CONFIRMADO" },
    include: { jogadorPelada: { include: { jogador: true } } },
  });

  if (presencas.length < 2) {
    res.status(400).json({ error: "São necessários pelo menos 2 jogadores confirmados" }); return;
  }

  // Separa goleiros e linha
  const goleiros = presencas.filter(p => p.jogadorPelada.posicao === "GOLEIRO");
  const linha = presencas.filter(p => p.jogadorPelada.posicao === "LINHA");

  // Ordena linha por nível decrescente para snake draft
  linha.sort((a, b) => b.jogadorPelada.nivel - a.jogadorPelada.nivel);

  // Snake draft: 1→A, 2→B, 3→B, 4→A, 5→A, 6→B...
  const assignments: { id: string; time: string }[] = [];
  linha.forEach((p, i) => {
    const round = Math.floor(i / 2);
    const posInRound = i % 2;
    const timeA = round % 2 === 0 ? posInRound === 0 : posInRound === 1;
    assignments.push({ id: p.id, time: timeA ? "A" : "B" });
  });

  // Goleiros: distribui 1 por time, resto para A
  goleiros.forEach((p, i) => {
    assignments.push({ id: p.id, time: i === 0 ? "A" : "B" });
  });

  // Salva no banco
  await Promise.all(assignments.map(a =>
    prisma.presenca.update({ where: { id: a.id }, data: { time: a.time } })
  ));

  const atualizado = await prisma.presenca.findMany({
    where: { partidaId, status: "CONFIRMADO" },
    include: { jogadorPelada: { include: { jogador: true } } },
    orderBy: { createdAt: "asc" },
  });

  res.json(atualizado);
}

export async function avaliarJogador(req: AuthRequest, res: Response) {
  const peladaId = req.params.peladaId as string;
  const pelada = await getPelada(peladaId, req.adminId as string);
  if (!pelada) { res.status(404).json({ error: "Pelada não encontrada" }); return; }

  const presencaId = req.params.presencaId as string;
  const { notaJogo } = req.body;

  if (!notaJogo || notaJogo < 1 || notaJogo > 5) {
    res.status(400).json({ error: "notaJogo deve ser entre 1 e 5" }); return;
  }

  const presenca = await prisma.presenca.update({
    where: { id: presencaId },
    data: { notaJogo: Number(notaJogo) },
    include: { jogadorPelada: { include: { jogador: true } } },
  });

  res.json(presenca);
}
