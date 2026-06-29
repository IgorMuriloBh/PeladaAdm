import { AuthRequest } from "../middlewares/auth";
import { prisma } from "./prisma";

/** Resolve peladaId — params (admin) ou JWT (portal) */
export function getPeladaId(req: AuthRequest): string {
  return (req.params.peladaId || req.peladaId || "") as string;
}

/** Busca a pelada validando posse: admin verifica adminId, portal confia no JWT */
export async function resolvePelada(req: AuthRequest, includeConfig = false) {
  const peladaId = getPeladaId(req);
  if (!peladaId) return null;

  const where = req.adminId ? { id: peladaId, adminId: req.adminId } : { id: peladaId };
  if (includeConfig) {
    return prisma.pelada.findFirst({ where, include: { configuracaoFinanceira: true } });
  }
  return prisma.pelada.findFirst({ where });
}
