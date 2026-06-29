"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { CheckCircle2, Circle, DollarSign, Utensils } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Pagamento { id: string; tipo: string; mes: number | null; ano: number | null; valor: number; pago: boolean; jogadorPelada: { jogador: { nome: string } } }
interface ResenhaPresenca { id: string; categoria: string; valorDevido: number; pago: boolean; jogadorPelada: { jogador: { nome: string } } }
interface Resenha { id: string; presencas: ResenhaPresenca[] }
interface Partida { id: string; data: string; status: string }

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default function PortalFinanceiroPage() {
  const { usuario } = useAuth();
  const [tab, setTab] = useState<"mensalidades" | "diarias" | "resenha">("mensalidades");
  const [mensalidades, setMensalidades] = useState<Pagamento[]>([]);
  const [diarias, setDiarias] = useState<Pagamento[]>([]);
  const [partidas, setPartidas] = useState<Partida[]>([]);
  const [resenhaPartidaId, setResenhaPartidaId] = useState("");
  const [resenha, setResenha] = useState<Resenha | null>(null);
  const [loading, setLoading] = useState(true);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano] = useState(new Date().getFullYear());

  useEffect(() => {
    if (!usuario) return;
    carregarTudo();
  }, [usuario, mes]);

  async function carregarTudo() {
    setLoading(true);
    try {
      const [m, d, p] = await Promise.all([
        api.get(`/portal/financeiro/mensalidades?mes=${mes}&ano=${ano}`),
        api.get(`/portal/financeiro/diarias?mes=${mes}&ano=${ano}`),
        api.get("/portal/partidas"),
      ]);
      setMensalidades(m.data);
      setDiarias(d.data);
      const ok = p.data.filter((x: Partida) => ["EM_ANDAMENTO", "REALIZADA"].includes(x.status));
      setPartidas(ok);
      if (ok.length > 0 && !resenhaPartidaId) {
        setResenhaPartidaId(ok[ok.length - 1].id);
      }
    } finally { setLoading(false); }
  }

  async function marcarPagamento(id: string, tipo: "mensalidade" | "diaria", pago: boolean) {
    try {
      if (tipo === "mensalidade") {
        await api.patch(`/portal/financeiro/mensalidades/${id}`, { pago });
        setMensalidades(ms => ms.map(m => m.id === id ? { ...m, pago } : m));
      } else {
        await api.patch(`/portal/financeiro/diarias/${id}`, { pago });
        setDiarias(ds => ds.map(d => d.id === id ? { ...d, pago } : d));
      }
      toast.success(pago ? "Pagamento registrado!" : "Pagamento removido");
    } catch { toast.error("Erro ao atualizar pagamento"); }
  }

  async function carregarResenha(partidaId: string) {
    if (!partidaId) return;
    try {
      const r = await api.get(`/portal/partidas/${partidaId}/resenha`);
      setResenha(r.data);
    } catch { setResenha(null); }
  }

  async function marcarResenha(id: string, pago: boolean) {
    try {
      await api.patch(`/portal/resenha/participantes/${id}`, { pago });
      if (resenhaPartidaId) carregarResenha(resenhaPartidaId);
      toast.success(pago ? "Pagamento registrado!" : "Pagamento removido");
    } catch { toast.error("Erro ao atualizar pagamento"); }
  }

  useEffect(() => {
    if (resenhaPartidaId) carregarResenha(resenhaPartidaId);
  }, [resenhaPartidaId]);

  function formatData(d: string) {
    return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  }

  const CAT_LABEL: Record<string, string> = { BEBE: "Bebe", NAO_BEBE: "Não bebe", GOLEIRO_BEBE: "Goleiro/Bebe" };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-slate-900 mb-1">Financeiro</h1>
      <p className="text-sm text-slate-500 mb-4">Lançamento de pagamentos</p>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {(["mensalidades", "diarias", "resenha"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${tab === t ? "bg-green-600 text-white" : "bg-white text-slate-600 border border-slate-200"}`}>
            {t === "mensalidades" ? "Mensalidades" : t === "diarias" ? "Diárias" : "Resenha"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Carregando...</div>
      ) : tab === "mensalidades" || tab === "diarias" ? (
        <>
          {/* Filtro de mês */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            {MESES.map((m, i) => (
              <button key={i} onClick={() => setMes(i + 1)} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${mes === i + 1 ? "bg-green-600 text-white" : "bg-white text-slate-600 border border-slate-200"}`}>
                {m}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {(tab === "mensalidades" ? mensalidades : diarias).map(p => (
              <div key={p.id} className="bg-white border border-slate-100 rounded-xl p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 text-sm truncate">{p.jogadorPelada.jogador.nome}</p>
                  <p className="text-xs text-slate-400">R$ {p.valor.toFixed(2)}</p>
                </div>
                <button
                  onClick={() => marcarPagamento(p.id, tab === "mensalidades" ? "mensalidade" : "diaria", !p.pago)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${p.pago ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                >
                  {p.pago ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                  {p.pago ? "Pago" : "Pendente"}
                </button>
              </div>
            ))}
            {(tab === "mensalidades" ? mensalidades : diarias).length === 0 && (
              <p className="text-center text-slate-400 py-8 text-sm">Nenhum registro para {MESES[mes - 1]} {ano}.</p>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Resenha */}
          {partidas.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">Nenhuma partida disponível.</div>
          ) : (
            <>
              <div className="mb-4">
                <Select value={resenhaPartidaId} onValueChange={setResenhaPartidaId}>
                  <SelectTrigger className="bg-white"><SelectValue placeholder="Selecione a partida" /></SelectTrigger>
                  <SelectContent>
                    {partidas.map(p => (
                      <SelectItem key={p.id} value={p.id}>{formatData(p.data)} — {p.status === "EM_ANDAMENTO" ? "Em andamento" : "Realizada"}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {resenha ? (
                <div className="space-y-2">
                  {resenha.presencas.map(rp => (
                    <div key={rp.id} className="bg-white border border-slate-100 rounded-xl p-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 text-sm truncate">{rp.jogadorPelada.jogador.nome}</p>
                        <p className="text-xs text-slate-400">{CAT_LABEL[rp.categoria]} · R$ {rp.valorDevido.toFixed(2)}</p>
                      </div>
                      <button
                        onClick={() => marcarResenha(rp.id, !rp.pago)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${rp.pago ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                      >
                        {rp.pago ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                        {rp.pago ? "Pago" : "Pendente"}
                      </button>
                    </div>
                  ))}
                  {resenha.presencas.length === 0 && <p className="text-center text-slate-400 py-8 text-sm">Sem participantes na resenha.</p>}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <Utensils className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Resenha não criada para esta partida.</p>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
