import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  adminId?: string;
  userId?: string;
  role?: string;
  peladaId?: string;
  jogadorPeladaId?: string;
}

// Middleware existente — verifica token de Admin
export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) { res.status(401).json({ error: "Token não fornecido" }); return; }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { adminId?: string };
    if (!payload.adminId) { res.status(401).json({ error: "Token inválido (perfil incorreto)" }); return; }
    req.adminId = payload.adminId;
    next();
  } catch {
    res.status(401).json({ error: "Token inválido" });
  }
}

// Middleware para Usuario (Jogador/Operador/Administrador)
export function usuarioMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) { res.status(401).json({ error: "Token não fornecido" }); return; }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId?: string; role?: string; peladaId?: string; jogadorPeladaId?: string;
    };
    if (!payload.userId) { res.status(401).json({ error: "Token inválido (perfil incorreto)" }); return; }
    req.userId = payload.userId;
    req.role = payload.role;
    req.peladaId = payload.peladaId;
    req.jogadorPeladaId = payload.jogadorPeladaId;
    next();
  } catch {
    res.status(401).json({ error: "Token inválido" });
  }
}

// Factory: aceita qualquer um dos dois tipos de token
export function anyAuthMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) { res.status(401).json({ error: "Token não fornecido" }); return; }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as Record<string, string>;
    if (payload.adminId) {
      req.adminId = payload.adminId;
    } else if (payload.userId) {
      req.userId = payload.userId;
      req.role = payload.role;
      req.peladaId = payload.peladaId;
      req.jogadorPeladaId = payload.jogadorPeladaId;
    } else {
      res.status(401).json({ error: "Token inválido" }); return;
    }
    next();
  } catch {
    res.status(401).json({ error: "Token inválido" });
  }
}

// Guard de role para rotas de usuario
export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.role || !roles.includes(req.role)) {
      res.status(403).json({ error: "Acesso não autorizado para este perfil" }); return;
    }
    next();
  };
}
