"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, ASSET_BASE } from "@/lib/api";
import { toast } from "sonner";
import { CheckCircle2, Circle, Utensils, Plus, Trash2, FileCheck } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const BASE = ASSET_BASE;
interface Pagamento { id: string; mes: number | null; ano: number | null; valor: number; pago: boolean; comprovante?: string | null; jogadorPelada: { jogador: { nome: string } } }
interface ResenhaPresenca { id: string; categoria: string; valorDevido: number; pago: boolean; comprovante?: string | null; jogadorPelada: { id: string; jogador: { nome: string } } }
interface Resenha { id: string; presencas: ResenhaPresenca[] }
interface Partida { id: string; data: string; status: string; presencas?: { jogadorPelada: { id: string; jogador: { nome: string } } }[] }

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const CAT_LABEL: Record<string, string> = { BEBE: "Bebe", NAO_BEBE: "Não bebe", GOLEIRO_BEBE: "Goleiro/Bebe" };

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
  // Modal adicionar participante
  const [addOpen, setAddOpen] = useState(false);
  const [addJpId, setAddJpId] = useState("");
  const [addCategoria, setAddCategoria] = useState("BEBE");
  const [addValor, setAddValor] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  useEffect(() => { if (usuario) carregarTudo(); }, [usuario, mes]);

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
      if (ok.length > 0 && !resenhaPartidaId) setResenhaPartidaId(ok[ok.length - 1].id);
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

  async function criarResenha() {
    if (!resenhaPartidaId) return;
    try {
      await api.post(`/portal/partidas/${resenhaPartidaId}/resenha`, {});
      await carregarResenha(resenhaPartidaId);
      toast.success("Resenha criada!");
    } catch (e: any) { toast.error(e?.response?.data?.error || "Erro ao criar resenha"); }
  }

  async function marcarResenha(id: string, pago: boolean) {
    try {
      await api.patch(`/portal/resenha/participantes/${id}`, { pago });
      await carregarResenha(resenhaPartidaId);
      toast.success(pago ? "Pagamento registrado!" : "Pagamento removido");
    } catch { toast.error("Erro ao atualizar pagamento"); }
  }

  async function removerParticipante(id: string) {
    try {
      await api.delete(`/portal/resenha/participantes/${id}`);
      await carregarResenha(resenhaPartidaId);
      toast.success("Participante removido");
    } catch { toast.error("Erro ao remover participante"); }
  }

  async function adicionarParticipante() {
    if (!addJpId || !addCategoria || !addValor) { toast.error("Preencha todos os campos"); return; }
    if (!resenha) return;
    setAddLoading(true);
    try {
      await api.post(`/portal/resenha/${resenha.id}/participantes`, {
        jogadorPeladaId: addJpId,
        categoria: addCategoria,
        valorDevido: Number(addValor),
      });
      await carregarResenha(resenhaPartidaId);
      setAddOpen(false);
      setAddJpId(""); setAddValor("");
      toast.success("Participante adicionado!");
    } catch (e: any) { toast.error(e?.response?.data?.error || "Erro ao adicionar participante"); }
    finally { setAddLoading(false); }
  }

  useEffect(() => { if (resenhaPartidaId) carregarResenha(resenhaPartidaId); }, [resenhaPartidaId]);

  function formatData(d: string) {
    return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  }

  // Jogadores confirmados na partida selecionada (para adicionar na resenha)
  const partidaSelecionada = partidas.find(p => p.id === resenhaPartidaId);
  const jpResenha = resenha?.presencas.map(rp => rp.jogadorPelada.id) || [];
  const jogadoresDisponiveis = (partidaSelecionada?.presencas || []).filter(pr => !jpResenha.includes(pr.jogadorPelada.id));

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-slate-900 mb-1">Financeiro</h1>
      <p className="text-sm text-slate-500 mb-4">Lançamento de pagamentos</p>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {(["mensalidades", "diarias", "resenha"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${tab === t ? "bg-green-600 text-white" : "bg-white text-slate-600 border border-slate-200"}`}>
            {t === "mensalidades" ? "Mensalidades" : t === "diarias" ? "Diárias" : "Resenha"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Carregando...</div>
      ) : tab === "mensalidades" || tab === "diarias" ? (
        <>
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            {MESES.map((m, i) => (
              <button key={i} onClick={() => setMes(i + 1)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${mes === i + 1 ? "bg-green-600 text-white" : "bg-white text-slate-600 border border-slate-200"}`}>
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
                  {p.comprovante && (
                    <a href={`${BASE}${p.comprovante}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-green-700 hover:underline mt-0.5">
                      <FileCheck className="w-3.5 h-3.5" /> Ver comprovante
                    </a>
                  )}
                </div>
                <button
                  onClick={() => marcarPagamento(p.id, tab === "mensalidades" ? "mensalidade" : "diaria", !p.pago)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${p.pago ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
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
                <>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-slate-700">Participantes da Resenha</p>
                    <Button size="sm" variant="outline" onClick={() => setAddOpen(true)} className="h-8 text-xs">
                      <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {resenha.presencas.map(rp => (
                      <div key={rp.id} className="bg-white border border-slate-100 rounded-xl p-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-800 text-sm truncate">{rp.jogadorPelada.jogador.nome}</p>
                          <p className="text-xs text-slate-400">{CAT_LABEL[rp.categoria]} · R$ {rp.valorDevido.toFixed(2)}</p>
                          {rp.comprovante && (
                            <a href={`${BASE}${rp.comprovante}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-green-700 hover:underline mt-0.5">
                              <FileCheck className="w-3.5 h-3.5" /> Ver comprovante
                            </a>
                          )}
                        </div>
                        <button
                          onClick={() => marcarResenha(rp.id, !rp.pago)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${rp.pago ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                          {rp.pago ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                          {rp.pago ? "Pago" : "Pendente"}
                        </button>
                        <button onClick={() => removerParticipante(rp.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {resenha.presencas.length === 0 && (
                      <p className="text-center text-slate-400 py-6 text-sm">Sem participantes. Adicione os jogadores da resenha.</p>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <Utensils className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm mb-3">Resenha ainda não criada para esta partida.</p>
                  <Button onClick={criarResenha} className="bg-green-600 hover:bg-green-700 text-white text-sm">
                    <Plus className="w-4 h-4 mr-1" /> Criar Resenha
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Modal — Adicionar participante */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Adicionar Participante</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-600">Jogador</p>
              <Select value={addJpId} onValueChange={setAddJpId}>
                <SelectTrigger className="bg-white"><SelectValue placeholder="Selecione o jogador" /></SelectTrigger>
                <SelectContent>
                  {jogadoresDisponiveis.map(pr => (
                    <SelectItem key={pr.jogadorPelada.id} value={pr.jogadorPelada.id}>{pr.jogadorPelada.jogador.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-600">Categoria</p>
              <Select value={addCategoria} onValueChange={setAddCategoria}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BEBE">Bebe</SelectItem>
                  <SelectItem value="NAO_BEBE">Não bebe</SelectItem>
                  <SelectItem value="GOLEIRO_BEBE">Goleiro/Bebe</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-600">Valor (R$)</p>
              <input
                type="number" step="0.01" placeholder="0,00" value={addValor}
                onChange={e => setAddValor(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={adicionarParticipante} disabled={addLoading}>
                {addLoading ? "Salvando..." : "Adicionar"}
              </Button>
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
