import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";

// ── Admin ──────────────────────────────────────────────────────────────────
export async function register(req: Request, res: Response) {
  const { nome, email, senha } = req.body;
  if (!nome || !email || !senha) {
    res.status(400).json({ error: "nome, email e senha são obrigatórios" }); return;
  }
  const existe = await prisma.admin.findUnique({ where: { email } });
  if (existe) { res.status(409).json({ error: "E-mail já cadastrado" }); return; }

  const hash = await bcrypt.hash(senha, 10);
  const admin = await prisma.admin.create({ data: { nome, email, senha: hash } });
  const token = jwt.sign({ adminId: admin.id }, process.env.JWT_SECRET!, { expiresIn: "7d" });
  res.status(201).json({ token, admin: { id: admin.id, nome: admin.nome, email: admin.email } });
}

export async function login(req: Request, res: Response) {
  const { email, senha } = req.body;
  if (!email || !senha) { res.status(400).json({ error: "email e senha são obrigatórios" }); return; }

  const admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin || !(await bcrypt.compare(senha, admin.senha))) {
    res.status(401).json({ error: "Credenciais inválidas" }); return;
  }
  const token = jwt.sign({ adminId: admin.id }, process.env.JWT_SECRET!, { expiresIn: "7d" });
  res.json({ token, tipo: "admin", admin: { id: admin.id, nome: admin.nome, email: admin.email } });
}

export async function me(req: Request & { adminId?: string }, res: Response) {
  const admin = await prisma.admin.findUnique({
    where: { id: req.adminId },
    select: { id: true, nome: true, email: true, createdAt: true },
  });
  if (!admin) { res.status(404).json({ error: "Admin não encontrado" }); return; }
  res.json(admin);
}

// ── Usuario (Jogador / Operador / Administrador) ───────────────────────────
export async function loginUsuario(req: Request, res: Response) {
  const { email, senha } = req.body;
  if (!email || !senha) { res.status(400).json({ error: "email e senha são obrigatórios" }); return; }

  const usuario = await prisma.usuario.findUnique({
    where: { email },
    include: { pelada: { select: { id: true, nome: true, slug: true, logo: true, corPrimaria: true } }, jogadorPelada: { include: { jogador: true } } },
  });
  if (!usuario || !usuario.ativo || !(await bcrypt.compare(senha, usuario.senha))) {
    res.status(401).json({ error: "Credenciais inválidas" }); return;
  }

  const token = jwt.sign(
    { userId: usuario.id, role: usuario.role, peladaId: usuario.peladaId, jogadorPeladaId: usuario.jogadorPeladaId },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" }
  );
  res.json({
    token,
    tipo: "usuario",
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      role: usuario.role,
      pelada: usuario.pelada,
      jogadorPelada: usuario.jogadorPelada,
    },
  });
}

export async function meUsuario(req: Request & { userId?: string }, res: Response) {
  const usuario = await prisma.usuario.findUnique({
    where: { id: req.userId },
    include: { pelada: { select: { id: true, nome: true, slug: true, logo: true, corPrimaria: true } }, jogadorPelada: { include: { jogador: true } } },
  });
  if (!usuario) { res.status(404).json({ error: "Usuário não encontrado" }); return; }
  res.json({
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    role: usuario.role,
    pelada: usuario.pelada,
    jogadorPelada: usuario.jogadorPelada,
  });
}
