import { Router } from "express";
import { authMiddleware, usuarioMiddleware, requireRole } from "../middlewares/auth";
import { upload } from "../middlewares/upload";
import * as auth from "../controllers/auth.controller";
import * as pelada from "../controllers/pelada.controller";
import * as jogador from "../controllers/jogador.controller";
import * as partida from "../controllers/partida.controller";
import * as fin from "../controllers/financeiro.controller";
import * as gols from "../controllers/gols.controller";
import * as stats from "../controllers/estatisticas.controller";
import * as votacao from "../controllers/votacao.controller";
import * as sorteio from "../controllers/sorteio.controller";
import * as usuario from "../controllers/usuario.controller";
import * as alerta from "../controllers/alerta.controller";
import * as importacao from "../controllers/importacao.controller";
import * as pix from "../controllers/pix.controller";
import multer from "multer";

const uploadPlanilha = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const router = Router();

// ── Auth ──────────────────────────────────────────────────────────────────
router.post("/auth/register", auth.register);
router.post("/auth/login", auth.login);
router.get("/auth/me", authMiddleware, auth.me);
router.post("/auth/usuario/login", auth.loginUsuario);
router.get("/auth/usuario/me", usuarioMiddleware, auth.meUsuario);
router.post("/auth/usuario/trocar-senha", usuarioMiddleware, auth.trocarSenha);

// ── Peladas (Admin) ────────────────────────────────────────────────────────
router.get("/peladas", authMiddleware, pelada.listar);
router.get("/peladas/:id", authMiddleware, pelada.buscar);
router.post("/peladas", authMiddleware, upload.single("logo"), pelada.criar);
router.put("/peladas/:id", authMiddleware, upload.single("logo"), pelada.atualizar);
router.put("/peladas/:id/financeiro", authMiddleware, pelada.atualizarFinanceiro);

// ── Jogadores (Admin) ─────────────────────────────────────────────────────
const fotoFields = upload.fields([{ name: "fotoNormal", maxCount: 1 }, { name: "fotoFeliz", maxCount: 1 }, { name: "fotoTriste", maxCount: 1 }]);
router.get("/peladas/:peladaId/jogadores", authMiddleware, jogador.listar);
router.post("/peladas/:peladaId/jogadores", authMiddleware, fotoFields, jogador.criar);
router.put("/peladas/:peladaId/jogadores/:id", authMiddleware, fotoFields, jogador.atualizar);

// ── Usuários (Admin cria/gerencia) ─────────────────────────────────────────
router.get("/peladas/:peladaId/usuarios", authMiddleware, usuario.listarUsuarios);
router.post("/peladas/:peladaId/usuarios", authMiddleware, usuario.criarUsuario);
router.put("/peladas/:peladaId/usuarios/:id", authMiddleware, usuario.atualizarUsuario);
router.delete("/peladas/:peladaId/usuarios/:id", authMiddleware, usuario.removerUsuario);

// ── Partidas / Agenda (Admin) ─────────────────────────────────────────────
router.get("/peladas/:peladaId/partidas", authMiddleware, partida.listar);
router.get("/peladas/:peladaId/partidas/:id", authMiddleware, partida.buscar);
router.post("/peladas/:peladaId/partidas", authMiddleware, partida.criar);
router.post("/peladas/:peladaId/partidas/gerar", authMiddleware, partida.gerarProximas);
router.put("/peladas/:peladaId/partidas/:id", authMiddleware, partida.atualizar);

// ── Presenças (Admin) ─────────────────────────────────────────────────────
router.post("/peladas/:peladaId/partidas/:id/presencas", authMiddleware, partida.confirmarPresenca);
router.delete("/peladas/:peladaId/partidas/:id/presencas/:presencaId", authMiddleware, partida.removerPresenca);
router.post("/peladas/:peladaId/partidas/:id/lembretes", authMiddleware, partida.enviarLembretes);

// ── Sorteio e Avaliação (Admin) ───────────────────────────────────────────
router.post("/peladas/:peladaId/partidas/:partidaId/sortear", authMiddleware, sorteio.sortearTimes);
router.patch("/peladas/:peladaId/presencas/:presencaId/avaliar", authMiddleware, sorteio.avaliarJogador);

// ── Destaques / Votações (Admin) ──────────────────────────────────────────
router.get("/peladas/:peladaId/destaques", authMiddleware, votacao.listarVotacoes);
router.get("/peladas/:peladaId/partidas/:partidaId/votacoes", authMiddleware, votacao.votacoesPorPartida);
router.post("/peladas/:peladaId/partidas/:partidaId/votacoes", authMiddleware, votacao.registrarVotacao);
router.delete("/peladas/:peladaId/votacoes/:votacaoId", authMiddleware, votacao.removerVotacao);

// ── Gols / Placar (Admin) ─────────────────────────────────────────────────
router.get("/peladas/:peladaId/partidas/:partidaId/gols", authMiddleware, gols.listarGols);
router.post("/peladas/:peladaId/partidas/:partidaId/gols", authMiddleware, gols.registrarGol);
router.delete("/peladas/:peladaId/partidas/:partidaId/gols/:golId", authMiddleware, gols.removerGol);
router.patch("/peladas/:peladaId/partidas/:partidaId/placar", authMiddleware, gols.atualizarPlacar);

// ── Estatísticas e Artilharia (Admin) ────────────────────────────────────
router.get("/peladas/:peladaId/estatisticas", authMiddleware, stats.estatisticasJogadores);
router.get("/peladas/:peladaId/artilharia", authMiddleware, stats.artilharia);

// ── Financeiro (Admin) ────────────────────────────────────────────────────
router.get("/peladas/:peladaId/financeiro/mensalidades", authMiddleware, fin.listarMensalidades);
router.post("/peladas/:peladaId/financeiro/mensalidades/gerar", authMiddleware, fin.gerarMensalidades);
router.patch("/peladas/:peladaId/financeiro/mensalidades/:id", authMiddleware, fin.marcarMensalidade);
router.get("/peladas/:peladaId/financeiro/inadimplentes", authMiddleware, fin.inadimplentes);
router.post("/peladas/:peladaId/partidas/:partidaId/diaria", authMiddleware, fin.gerarDiaria);
router.get("/peladas/:peladaId/financeiro/diarias", authMiddleware, fin.listarDiarias);
router.patch("/peladas/:peladaId/financeiro/diarias/:id", authMiddleware, fin.marcarDiaria);
router.post("/peladas/:peladaId/partidas/:partidaId/resenha", authMiddleware, fin.criarResenha);
router.get("/peladas/:peladaId/partidas/:partidaId/resenha", authMiddleware, fin.buscarResenha);
router.post("/peladas/:peladaId/resenha/:resenhaId/participantes", authMiddleware, fin.adicionarParticipanteResenha);
router.patch("/peladas/:peladaId/resenha/participantes/:id", authMiddleware, fin.marcarPagamentoResenha);
router.delete("/peladas/:peladaId/resenha/participantes/:id", authMiddleware, fin.removerParticipanteResenha);
router.get("/peladas/:peladaId/financeiro/resumo", authMiddleware, fin.resumo);

// ── Alertas / Email (Admin) ───────────────────────────────────────────────
router.get("/peladas/:peladaId/alertas", authMiddleware, alerta.buscarConfigAlerta);
router.put("/peladas/:peladaId/alertas", authMiddleware, alerta.salvarConfigAlerta);
router.post("/peladas/:peladaId/alertas/testar", authMiddleware, alerta.testarEmail);

// ── Importação de planilha (Admin) ────────────────────────────────────────
router.get("/peladas/:peladaId/importacao/modelo", authMiddleware, importacao.baixarModelo);
router.post("/peladas/:peladaId/importacao", authMiddleware, uploadPlanilha.single("planilha"), importacao.importarPlanilha);

// ── Chaves PIX (Admin) ─────────────────────────────────────────────────────
router.get("/peladas/:peladaId/pix", authMiddleware, pix.listarPix);
router.post("/peladas/:peladaId/pix", authMiddleware, upload.single("imagem"), pix.criarPix);
router.delete("/peladas/:peladaId/pix/:id", authMiddleware, pix.removerPix);

// ── Confirmação de presença via token (pública) ───────────────────────────
router.get("/confirmar/:token", alerta.buscarToken);
router.post("/confirmar/:token", alerta.confirmarViaToken);

// ════════════════════════════════════════════════════════════════════════════
// PORTAL — rotas para Jogador / Operador / Administrador (token de usuario)
// O peladaId vem do JWT, extraído em cada controller
// ════════════════════════════════════════════════════════════════════════════

// Estatísticas (todos os perfis)
router.get("/portal/estatisticas", usuarioMiddleware, stats.estatisticasJogadores);
router.get("/portal/artilharia", usuarioMiddleware, stats.artilharia);
router.get("/portal/destaques", usuarioMiddleware, votacao.listarVotacoes);
router.get("/portal/pix", usuarioMiddleware, pix.listarPixPortal);

// Partidas + Votação (todos os perfis)
router.get("/portal/partidas", usuarioMiddleware, partida.listar);
// Jogador confirma/cancela a própria presença
router.post("/portal/partidas/:partidaId/minha-presenca", usuarioMiddleware, partida.confirmarMinhaPresenca);
router.delete("/portal/partidas/:partidaId/minha-presenca", usuarioMiddleware, partida.removerMinhaPresenca);
// Enquete dos jogadores (VotoJogador)
router.get("/portal/partidas/:partidaId/votos", usuarioMiddleware, votacao.resultadoVotoJogador);
router.post("/portal/partidas/:partidaId/votos", usuarioMiddleware, votacao.registrarVotoJogador);
// Adm/Operador zera o voto de um votante (só com pelada em andamento)
router.delete("/portal/partidas/:partidaId/votos/:votanteId", usuarioMiddleware, requireRole("OPERADOR", "ADMINISTRADOR"), votacao.zerarVotoJogador);

// Gols (Operador, Administrador)
router.get("/portal/partidas/:partidaId/gols", usuarioMiddleware, gols.listarGols);
router.post("/portal/partidas/:partidaId/gols", usuarioMiddleware, requireRole("OPERADOR", "ADMINISTRADOR"), gols.registrarGol);
router.delete("/portal/partidas/:partidaId/gols/:golId", usuarioMiddleware, requireRole("OPERADOR", "ADMINISTRADOR"), gols.removerGol);

// Jogadores (para listagem de gols/arte no portal)
router.get("/portal/jogadores", usuarioMiddleware, jogador.listar);

// Financeiro (Operador, Administrador)
router.get("/portal/financeiro/mensalidades", usuarioMiddleware, requireRole("OPERADOR", "ADMINISTRADOR"), fin.listarMensalidades);
router.patch("/portal/financeiro/mensalidades/:id", usuarioMiddleware, requireRole("OPERADOR", "ADMINISTRADOR"), fin.marcarMensalidade);
router.get("/portal/financeiro/diarias", usuarioMiddleware, requireRole("OPERADOR", "ADMINISTRADOR"), fin.listarDiarias);
router.patch("/portal/financeiro/diarias/:id", usuarioMiddleware, requireRole("OPERADOR", "ADMINISTRADOR"), fin.marcarDiaria);
router.post("/portal/partidas/:partidaId/resenha", usuarioMiddleware, requireRole("OPERADOR", "ADMINISTRADOR"), fin.criarResenha);
router.get("/portal/partidas/:partidaId/resenha", usuarioMiddleware, requireRole("OPERADOR", "ADMINISTRADOR"), fin.buscarResenha);
router.post("/portal/resenha/:resenhaId/participantes", usuarioMiddleware, requireRole("OPERADOR", "ADMINISTRADOR"), fin.adicionarParticipanteResenha);
router.patch("/portal/resenha/participantes/:id", usuarioMiddleware, requireRole("OPERADOR", "ADMINISTRADOR"), fin.marcarPagamentoResenha);
router.delete("/portal/resenha/participantes/:id", usuarioMiddleware, requireRole("OPERADOR", "ADMINISTRADOR"), fin.removerParticipanteResenha);

export default router;
