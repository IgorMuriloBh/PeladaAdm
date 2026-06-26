import { Router } from "express";
import { authMiddleware } from "../middlewares/auth";
import { upload } from "../middlewares/upload";
import * as auth from "../controllers/auth.controller";
import * as pelada from "../controllers/pelada.controller";
import * as jogador from "../controllers/jogador.controller";
import * as partida from "../controllers/partida.controller";

const router = Router();

// Auth
router.post("/auth/register", auth.register);
router.post("/auth/login", auth.login);
router.get("/auth/me", authMiddleware, auth.me);

// Peladas
router.get("/peladas", authMiddleware, pelada.listar);
router.get("/peladas/:id", authMiddleware, pelada.buscar);
router.post("/peladas", authMiddleware, upload.single("logo"), pelada.criar);
router.put("/peladas/:id", authMiddleware, upload.single("logo"), pelada.atualizar);
router.put("/peladas/:id/financeiro", authMiddleware, pelada.atualizarFinanceiro);

// Jogadores
const fotoFields = upload.fields([{ name: "fotoNormal", maxCount: 1 }, { name: "fotoFeliz", maxCount: 1 }, { name: "fotoTriste", maxCount: 1 }]);
router.get("/peladas/:peladaId/jogadores", authMiddleware, jogador.listar);
router.post("/peladas/:peladaId/jogadores", authMiddleware, fotoFields, jogador.criar);
router.put("/peladas/:peladaId/jogadores/:id", authMiddleware, fotoFields, jogador.atualizar);

// Partidas / Agenda
router.get("/peladas/:peladaId/partidas", authMiddleware, partida.listar);
router.get("/peladas/:peladaId/partidas/:id", authMiddleware, partida.buscar);
router.post("/peladas/:peladaId/partidas", authMiddleware, partida.criar);
router.post("/peladas/:peladaId/partidas/gerar", authMiddleware, partida.gerarProximas);
router.put("/peladas/:peladaId/partidas/:id", authMiddleware, partida.atualizar);

// Presenças
router.post("/peladas/:peladaId/partidas/:id/presencas", authMiddleware, partida.confirmarPresenca);
router.delete("/peladas/:peladaId/partidas/:id/presencas/:presencaId", authMiddleware, partida.removerPresenca);
router.post("/peladas/:peladaId/partidas/:id/lembretes", authMiddleware, partida.enviarLembretes);

export default router;
