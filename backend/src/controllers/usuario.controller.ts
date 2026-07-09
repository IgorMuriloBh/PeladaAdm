import { Response } from "express";
import bcrypt from "bcryptjs";
import { AuthRequest } from "../middlewares/auth";
import { prisma } from "../lib/prisma";

// Replica a foto do usuário para o jogador vinculado (usada nas artes do Instagram)
async function replicarFotoParaJogador(jogadorPeladaId: string | null | undefined, foto: string | null | undefined) {
  if (!jogadorPeladaId || !foto) return;
  const jp = await prisma.jogadorPelada.findUnique({ where: { id: jogadorPeladaId } });
  if (jp) await prisma.jogador.update({ where: { id: jp.jogadorId }, data: { fotoNormal: foto } });
}

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

  const foto = (req as any).file ? `/uploads/${(req as any).file.filename}` : null;

  // Sem senha informada → usa a senha padrão da pelada e obriga troca no primeiro login
  const usaSenhaPadrao = !senha;
  const senhaFinal = senha || (pelada as any).senhaPadrao || "senha001";
  const hash = await bcrypt.hash(senhaFinal, 10);
  const usuario = await prisma.usuario.create({
    data: {
      nome, email, senha: hash, role, peladaId,
      jogadorPeladaId: jogadorPeladaId || null,
      foto,
      precisaTrocarSenha: usaSenhaPadrao,
    },
    include: { jogadorPelada: { include: { jogador: true } } },
  });

  // Replica a foto para o jogador vinculado (para uso nas artes)
  await replicarFotoParaJogador(usuario.jogadorPeladaId, usuario.foto);

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
  const foto = (req as any).file ? `/uploads/${(req as any).file.filename}` : undefined;
  if (foto) data.foto = foto;

  const usuario = await prisma.usuario.update({
    where: { id },
    data,
    include: { jogadorPelada: { include: { jogador: true } } },
  });

  // Replica a foto do usuário para o jogador vinculado (nova foto ou ao vincular
  // um jogador a um usuário que já tem foto)
  await replicarFotoParaJogador(usuario.jogadorPeladaId, usuario.foto);

  res.json({ ...usuario, senha: undefined });
}

export async function removerUsuario(req: AuthRequest, res: Response) {
  const peladaId = req.params.peladaId as string;
  const pelada = await prisma.pelada.findFirst({ where: { id: peladaId, adminId: req.adminId as string } });
  if (!pelada) { res.status(404).json({ error: "Pelada não encontrada" }); return; }

  await prisma.usuario.delete({ where: { id: req.params.id as string } });
  res.json({ ok: true });
}
