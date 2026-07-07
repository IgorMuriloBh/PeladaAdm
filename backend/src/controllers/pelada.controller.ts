import { Response } from "express";
import { AuthRequest } from "../middlewares/auth";
import { prisma } from "../lib/prisma";

export async function listar(req: AuthRequest, res: Response) {
  const peladas = await prisma.pelada.findMany({
    where: { adminId: req.adminId as string },
    include: { configuracaoFinanceira: true, _count: { select: { jogadores: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(peladas);
}

export async function buscar(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  const pelada = await prisma.pelada.findFirst({
    where: { id, adminId: req.adminId as string },
    include: { configuracaoFinanceira: true, _count: { select: { jogadores: true, partidas: true } } },
  });
  if (!pelada) { res.status(404).json({ error: "Pelada não encontrada" }); return; }
  res.json(pelada);
}

export async function criar(req: AuthRequest, res: Response) {
  const { nome, slug, corPrimaria, corSecundaria, corTexto, diaSemana, horario, maxJogadores, horaAbreLista, horaFechaLista } = req.body;
  if (!nome || !slug || !diaSemana) {
    res.status(400).json({ error: "nome, slug e diaSemana são obrigatórios" });
    return;
  }
  const slugExiste = await prisma.pelada.findUnique({ where: { slug: slug as string } });
  if (slugExiste) { res.status(409).json({ error: "Slug já em uso" }); return; }

  const logo = (req as any).file ? `/uploads/${(req as any).file.filename}` : undefined;

  const pelada = await prisma.pelada.create({
    data: {
      nome: nome as string,
      slug: slug as string,
      logo,
      corPrimaria: (corPrimaria as string) || "#16a34a",
      corSecundaria: (corSecundaria as string) || "#15803d",
      corTexto: (corTexto as string) || "#ffffff",
      diaSemana: Array.isArray(diaSemana) ? diaSemana : JSON.parse(diaSemana as string),
      horario: (horario as string) || "20:00",
      maxJogadores: maxJogadores ? Number(maxJogadores) : 20,
      horaAbreLista: (horaAbreLista as string) || "08:00",
      horaFechaLista: (horaFechaLista as string) || "18:00",
      adminId: req.adminId!,
      configuracaoFinanceira: { create: {} },
    },
    include: { configuracaoFinanceira: true },
  });
  res.status(201).json(pelada);
}

export async function atualizar(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  const existe = await prisma.pelada.findFirst({ where: { id, adminId: req.adminId as string } });
  if (!existe) { res.status(404).json({ error: "Pelada não encontrada" }); return; }

  const logo = (req as any).file ? `/uploads/${(req as any).file.filename}` : undefined;
  const { nome, corPrimaria, corSecundaria, corTexto, diaSemana, horario, maxJogadores, horaAbreLista, horaFechaLista, ativa, senhaPadrao } = req.body;

  const pelada = await prisma.pelada.update({
    where: { id },
    data: {
      ...(nome && { nome: nome as string }),
      ...(logo && { logo }),
      ...(corPrimaria && { corPrimaria: corPrimaria as string }),
      ...(corSecundaria && { corSecundaria: corSecundaria as string }),
      ...(corTexto && { corTexto: corTexto as string }),
      ...(diaSemana && { diaSemana: Array.isArray(diaSemana) ? diaSemana : JSON.parse(diaSemana as string) }),
      ...(horario && { horario: horario as string }),
      ...(maxJogadores && { maxJogadores: Number(maxJogadores) }),
      ...(horaAbreLista && { horaAbreLista: horaAbreLista as string }),
      ...(horaFechaLista && { horaFechaLista: horaFechaLista as string }),
      ...(senhaPadrao && { senhaPadrao: (senhaPadrao as string).trim() }),
      ...(ativa !== undefined && { ativa: ativa === "true" || ativa === true }),
    },
    include: { configuracaoFinanceira: true },
  });
  res.json(pelada);
}

export async function atualizarFinanceiro(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  const pelada = await prisma.pelada.findFirst({ where: { id, adminId: req.adminId as string } });
  if (!pelada) { res.status(404).json({ error: "Pelada não encontrada" }); return; }

  const config = await prisma.configuracaoFinanceira.update({
    where: { peladaId: id },
    data: req.body,
  });
  res.json(config);
}
