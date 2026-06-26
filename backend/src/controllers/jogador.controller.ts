import { Response } from "express";
import { AuthRequest } from "../middlewares/auth";
import { prisma } from "../lib/prisma";

export async function listar(req: AuthRequest, res: Response) {
  const peladaId = req.params.peladaId as string;
  const pelada = await prisma.pelada.findFirst({ where: { id: peladaId, adminId: req.adminId as string } });
  if (!pelada) { res.status(404).json({ error: "Pelada não encontrada" }); return; }

  const jogadores = await prisma.jogadorPelada.findMany({
    where: { peladaId },
    include: { jogador: true },
    orderBy: { jogador: { nome: "asc" } },
  });
  res.json(jogadores);
}

export async function criar(req: AuthRequest, res: Response) {
  const peladaId = req.params.peladaId as string;
  const pelada = await prisma.pelada.findFirst({ where: { id: peladaId, adminId: req.adminId as string } });
  if (!pelada) { res.status(404).json({ error: "Pelada não encontrada" }); return; }

  const { nome, email, celular, tipo, posicao, nivel } = req.body;
  if (!nome || !email) { res.status(400).json({ error: "nome e email são obrigatórios" }); return; }

  const files = (req as any).files as Record<string, Express.Multer.File[]> | undefined;
  const fotoNormal = files?.fotoNormal?.[0] ? `/uploads/${files.fotoNormal[0].filename}` : undefined;
  const fotoFeliz  = files?.fotoFeliz?.[0]  ? `/uploads/${files.fotoFeliz[0].filename}`  : undefined;
  const fotoTriste = files?.fotoTriste?.[0] ? `/uploads/${files.fotoTriste[0].filename}` : undefined;

  const emailStr = email as string;

  let jogador = await prisma.jogador.findUnique({ where: { email: emailStr } });
  if (!jogador) {
    jogador = await prisma.jogador.create({ data: { nome: nome as string, email: emailStr, celular: celular as string | undefined, fotoNormal, fotoFeliz, fotoTriste } });
  } else {
    jogador = await prisma.jogador.update({
      where: { email: emailStr },
      data: { nome: nome as string, celular: celular as string | undefined, ...(fotoNormal && { fotoNormal }), ...(fotoFeliz && { fotoFeliz }), ...(fotoTriste && { fotoTriste }) },
    });
  }

  const jaVinculado = await prisma.jogadorPelada.findUnique({ where: { jogadorId_peladaId: { jogadorId: jogador.id, peladaId } } });
  if (jaVinculado) { res.status(409).json({ error: "Jogador já está nessa pelada" }); return; }

  const jogadorPelada = await prisma.jogadorPelada.create({
    data: { jogadorId: jogador.id, peladaId, tipo: tipo || "DIARISTA", posicao: posicao || "LINHA", nivel: nivel ? Number(nivel) : 3 },
    include: { jogador: true },
  });
  res.status(201).json(jogadorPelada);
}

export async function atualizar(req: AuthRequest, res: Response) {
  const peladaId = req.params.peladaId as string;
  const id = req.params.id as string;

  const pelada = await prisma.pelada.findFirst({ where: { id: peladaId, adminId: req.adminId as string } });
  if (!pelada) { res.status(404).json({ error: "Pelada não encontrada" }); return; }

  const jp = await prisma.jogadorPelada.findFirst({ where: { id, peladaId } });
  if (!jp) { res.status(404).json({ error: "Jogador não encontrado" }); return; }

  const files = (req as any).files as Record<string, Express.Multer.File[]> | undefined;
  const fotoNormal = files?.fotoNormal?.[0] ? `/uploads/${files.fotoNormal[0].filename}` : undefined;
  const fotoFeliz  = files?.fotoFeliz?.[0]  ? `/uploads/${files.fotoFeliz[0].filename}`  : undefined;
  const fotoTriste = files?.fotoTriste?.[0] ? `/uploads/${files.fotoTriste[0].filename}` : undefined;

  const { nome, celular, tipo, posicao, nivel, ativo } = req.body;

  await prisma.jogador.update({
    where: { id: jp.jogadorId },
    data: {
      ...(nome && { nome: nome as string }),
      ...(celular && { celular: celular as string }),
      ...(fotoNormal && { fotoNormal }),
      ...(fotoFeliz && { fotoFeliz }),
      ...(fotoTriste && { fotoTriste }),
    },
  });

  const jogadorPelada = await prisma.jogadorPelada.update({
    where: { id },
    data: {
      ...(tipo && { tipo }),
      ...(posicao && { posicao }),
      ...(nivel && { nivel: Number(nivel) }),
      ...(ativo !== undefined && { ativo: ativo === "true" || ativo === true }),
    },
    include: { jogador: true },
  });
  res.json(jogadorPelada);
}
