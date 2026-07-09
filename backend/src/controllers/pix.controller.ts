import { Response } from "express";
import { AuthRequest } from "../middlewares/auth";
import { prisma } from "../lib/prisma";
import { resolvePelada, getPeladaId } from "../lib/peladaHelper";

const TIPOS_VALIDOS = ["TELEFONE", "CPF_CNPJ", "EMAIL", "ALEATORIA", "QRCODE"];

// ── Admin ───────────────────────────────────────────────────────────────────
export async function listarPix(req: AuthRequest, res: Response) {
  const peladaId = req.params.peladaId as string;
  const pelada = await prisma.pelada.findFirst({ where: { id: peladaId, adminId: req.adminId as string } });
  if (!pelada) { res.status(404).json({ error: "Pelada não encontrada" }); return; }

  const chaves = await prisma.chavePix.findMany({ where: { peladaId }, orderBy: { createdAt: "asc" } });
  res.json(chaves);
}

export async function criarPix(req: AuthRequest, res: Response) {
  const peladaId = req.params.peladaId as string;
  const pelada = await prisma.pelada.findFirst({ where: { id: peladaId, adminId: req.adminId as string } });
  if (!pelada) { res.status(404).json({ error: "Pelada não encontrada" }); return; }

  const { tipo, valor, descricao } = req.body;
  if (!tipo || !TIPOS_VALIDOS.includes(tipo)) {
    res.status(400).json({ error: "Tipo de chave inválido" }); return;
  }

  const imagem = (req as any).file ? `/uploads/${(req as any).file.filename}` : undefined;

  if (tipo === "QRCODE") {
    if (!imagem) { res.status(400).json({ error: "Envie a imagem do QR Code" }); return; }
  } else {
    if (!valor || !String(valor).trim()) { res.status(400).json({ error: "Informe o valor da chave" }); return; }
  }

  const chave = await prisma.chavePix.create({
    data: {
      peladaId,
      tipo,
      valor: tipo === "QRCODE" ? null : String(valor).trim(),
      imagem: tipo === "QRCODE" ? imagem : null,
      descricao: descricao ? String(descricao).trim() : null,
    },
  });
  res.status(201).json(chave);
}

export async function removerPix(req: AuthRequest, res: Response) {
  const peladaId = req.params.peladaId as string;
  const pelada = await prisma.pelada.findFirst({ where: { id: peladaId, adminId: req.adminId as string } });
  if (!pelada) { res.status(404).json({ error: "Pelada não encontrada" }); return; }

  const chave = await prisma.chavePix.findFirst({ where: { id: req.params.id as string, peladaId } });
  if (!chave) { res.status(404).json({ error: "Chave não encontrada" }); return; }

  await prisma.chavePix.delete({ where: { id: chave.id } });
  res.json({ ok: true });
}

// ── Portal (jogador/operador/admin) ─────────────────────────────────────────
export async function listarPixPortal(req: AuthRequest, res: Response) {
  const pelada = await resolvePelada(req);
  const peladaId = getPeladaId(req);
  if (!pelada) { res.status(404).json({ error: "Pelada não encontrada" }); return; }

  const chaves = await prisma.chavePix.findMany({ where: { peladaId }, orderBy: { createdAt: "asc" } });
  res.json(chaves);
}
