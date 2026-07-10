import { prisma } from "./prisma";
import { gerarMensalidadesMes } from "../controllers/financeiro.controller";

const SEIS_HORAS = 6 * 60 * 60 * 1000;

// Garante que as mensalidades do mês corrente já estejam lançadas para todos
// os mensalistas ativos de cada pelada. Idempotente: só cria o que faltar.
// Como roda ao iniciar e periodicamente, o lançamento acontece automaticamente
// a partir do dia 01 de cada mês (quando o mês vira, o próximo ciclo gera).
async function garantirMensalidadesMesAtual() {
  const agora = new Date();
  const mes = agora.getMonth() + 1;
  const ano = agora.getFullYear();

  const peladas = await prisma.pelada.findMany({ where: { ativa: true }, select: { id: true } });
  let total = 0;
  for (const p of peladas) {
    try { total += await gerarMensalidadesMes(p.id, mes, ano); }
    catch (e: any) { console.error(`[scheduler] pelada ${p.id}: ${e.message}`); }
  }
  if (total > 0) console.log(`[scheduler] ${total} mensalidade(s) gerada(s) para ${String(mes).padStart(2, "0")}/${ano}`);
}

export function iniciarScheduler() {
  garantirMensalidadesMesAtual().catch(e => console.error("[scheduler]", e.message));
  setInterval(() => {
    garantirMensalidadesMesAtual().catch(e => console.error("[scheduler]", e.message));
  }, SEIS_HORAS);
  console.log("[scheduler] geração automática de mensalidades ativa");
}
