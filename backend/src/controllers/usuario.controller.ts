import { Response } from "express";
import bcrypt from "bcryptjs";
import { AuthRequest } from "../middlewares/auth";
import { prisma } from "../lib/prisma";

// Admin cria/lista/atualiza usuarios da pelada
export async function listarUsuarios(req: AuthRequest, res: Response) {
  const peladaId = req.params.peladaId as string;
  const pelada = await prisma.pelada.findFirst({ where: { id: peladaId, adminId: req.adminId as string } });
  if (!pelada) { res.status(404).json({ error: "Pelada não encontrada" }); return; }

  const usuarios = await prisma.usuario.findMany({
    where: { peladaId },
    include: { jogadorPelada: { include: { jogador: true } } },
    orderBy: { nome: "asc" },
  });
  res.json(usuarios);
}

export async function criarUsuario(req: AuthRequest, res: Response) {
  const peladaId = req.params.peladaId as string;
  const pelada = await prisma.pelada.findFirst({ where: { id: peladaId, adminId: req.adminId as string } });
  if (!pelada) { res.status(404).json({ error: "Pelada não encontrada" }); return; }

  const { nome, email, senha, role, jogadorPeladaId } = req.body;
  if (!nome || !email || !role) {
    res.status(400).json({ error: "nome, email e role são obrigatórios" }); return;
  }
  // Perfil JOGADOR exige vínculo com um jogador cadastrado
  if (role === "JOGADOR" && !jogadorPeladaId) {
    res.status(400).json({ error: "Para o perfil Jogador é obrigatório vincular a um jogador cadastrado" }); return;
  }

  const existe = await prisma.usuario.findUnique({ where: { email } });
  if (existe) { res.status(409).json({ error: "E-mail já cadastrado" }); return; }

  // Sem senha informada → usa a senha padrão da pelada e obriga troca no primeiro login
  const usaSenhaPadrao = !senha;
  const senhaFinal = senha || (pelada as any).senhaPadrao || "senha001";
  const hash = await bcrypt.hash(senhaFinal, 10);
  const usuario = await prisma.usuario.create({
    data: {
      nome, email, senha: hash, role, peladaId,
      jogadorPeladaId: jogadorPeladaId || null,
      precisaTrocarSenha: usaSenhaPadrao,
    },
    include: { jogadorPelada: { include: { jogador: true } } },
  });

  res.status(201).json({ ...usuario, senha: undefined });
}

export async function atualizarUsuario(req: AuthRequest, res: Response) {
  const peladaId = req.params.peladaId as string;
  const pelada = await prisma.pelada.findFirst({ where: { id: peladaId, adminId: req.adminId as string } });
  if (!pelada) { res.status(404).json({ error: "Pelada não encontrada" }); return; }

  const id = req.params.id as string;
  const { nome, email, senha, role, ativo, jogadorPeladaId } = req.body;

  const data: Record<string, unknown> = { nome, email, role, ativo };
  if (jogadorPeladaId !== undefined) data.jogadorPeladaId = jogadorPeladaId || null;
  if (senha) data.senha = await bcrypt.hash(senha, 10);

  const usuario = await prisma.usuario.update({
    where: { id },
    data,
    include: { jogadorPelada: { include: { jogador: true } } },
  });
  res.json({ ...usuario, senha: undefined });
}

export async function removerUsuario(req: AuthRequest, res: Response) {
  const peladaId = req.params.peladaId as string;
  const pelada = await prisma.pelada.findFirst({ where: { id: peladaId, adminId: req.adminId as string } });
  if (!pelada) { res.status(404).json({ error: "Pelada não encontrada" }); return; }

  await prisma.usuario.delete({ where: { id: req.params.id as string } });
  res.json({ ok: true });
}
