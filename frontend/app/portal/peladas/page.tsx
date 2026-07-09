"use client";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { CalendarCheck, Clock, Users, CheckCircle2, X, Loader2, Beer, Bell } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Presenca { id: string; status: string; jogadorPelada: { id: string; jogador: { nome: string } } }
interface Partida { id: string; data: string; status: string; presencas?: Presenca[] }
interface Confirmacao { naPelada: boolean; statusPelada: string | null; naResenha: boolean; categoriaResenha: string | null }

const STATUS_ABERTO = ["AGENDADA", "CONFIRMADA"];
const CANCELAMENTO_LIMITE_MS = 2 * 60 * 60 * 1000;

type Opcao = "AMBOS" | "PELADA" | "RESENHA";

export default function PortalPeladasPage() {
  const { usuario } = useAuth();
  const meuJpId = usuario?.jogadorPelada?.id;
  const isGoleiro = usuario?.jogadorPelada?.posicao === "GOLEIRO";
  const [partidas, setPartidas] = useState<Partida[]>([]);
  const [confirmacoes, setConfirmacoes] = useState<Record<string, Confirmacao>>({});
  const [loading, setLoading] = useState(true);
  const [acaoId, setAcaoId] = useState<string | null>(null);

  // Modal
  const [modalPartida, setModalPartida] = useState<Partida | null>(null);
  const [opcao, setOpcao] = useState<Opcao | null>(null);
  const [bebe, setBebe] = useState<boolean | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const r = await api.get("/portal/partidas");
      const abertas = (r.data as Partida[])
        .filter(p => STATUS_ABERTO.includes(p.status))
        .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
      setPartidas(abertas);
      // Estado de confirmação (pelada + resenha) de cada partida
      const pares = await Promise.all(abertas.map(async p => {
        try { const c = await api.get(`/portal/partidas/${p.id}/minha-confirmacao`); return [p.id, c.data] as const; }
        catch { return [p.id, { naPelada: false, statusPelada: null, naResenha: false, categoriaResenha: null }] as const; }
      }));
      setConfirmacoes(Object.fromEntries(pares));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (usuario) carregar(); }, [usuario, carregar]);

  function confirmadosCount(p: Partida) {
    return p.presencas?.filter(pr => pr.status === "CONFIRMADO").length || 0;
  }
  function podeCancelar(p: Partida) {
    return Date.now() <= new Date(p.data).getTime() - CANCELAMENTO_LIMITE_MS;
  }

  function abrirModal(p: Partida) {
    const c = confirmacoes[p.id];
    setModalPartida(p);
    // Pré-seleciona conforme estado atual
    if (c?.naPelada && c?.naResenha) setOpcao("AMBOS");
    else if (c?.naPelada) setOpcao("PELADA");
    else if (c?.naResenha) setOpcao("RESENHA");
    else setOpcao(null);
    setBebe(c?.categoriaResenha === "BEBE" ? true : c?.categoriaResenha === "NAO_BEBE" ? false : null);
    setSalvando(false);
  }

  const envolveResenha = opcao === "AMBOS" || opcao === "RESENHA";
  const precisaBebe = envolveResenha && !isGoleiro;

  async function confirmar() {
    if (!modalPartida || !opcao) return;
    if (precisaBebe && bebe === null) { toast.error("Informe se você bebe ou não na resenha"); return; }
    setSalvando(true);
    try {
      await api.post(`/portal/partidas/${modalPartida.id}/confirmar`, {
        pelada: opcao === "AMBOS" || opcao === "PELADA",
        resenha: opcao === "AMBOS" || opcao === "RESENHA",
        bebe: precisaBebe ? bebe : undefined,
      });
      toast.success("Presença confirmada!");
      setModalPartida(null);
      await carregar();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "Erro ao confirmar");
    } finally { setSalvando(false); }
  }

  async function cancelar(p: Partida) {
    setAcaoId(p.id);
    try {
      await api.delete(`/portal/partidas/${p.id}/confirmar`);
      toast.success("Presença cancelada");
      await carregar();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "Erro ao cancelar");
    } finally { setAcaoId(null); }
  }

  const formatData = (d: string) => new Date(d).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
  const formatHora = (d: string) => new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  if (!meuJpId) {
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <h1 className="text-xl font-bold text-slate-900 mb-1">Peladas</h1>
        <div className="mt-8 text-center text-slate-400">
          <CalendarCheck className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Seu usuário não está vinculado a um jogador.<br />Fale com o administrador da pelada.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-slate-900 mb-1">Peladas</h1>
      <p className="text-sm text-slate-500 mb-4">Confirme sua presença nas próximas peladas</p>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : partidas.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <CalendarCheck className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nenhuma pelada agendada no momento.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {partidas.map(p => {
            const c = confirmacoes[p.id];
            const respondeu = c?.naPelada || c?.naResenha;
            const confirmadoPelada = c?.statusPelada === "CONFIRMADO";
            const listaEspera = c?.statusPelada === "LISTA_ESPERA";
            const cancelavel = podeCancelar(p);
            const carregando = acaoId === p.id;
            // Notificação: pelada confirmada e ainda sem resposta do jogador
            const novaConfirmada = p.status === "CONFIRMADA" && !respondeu;

            return (
              <div key={p.id} className={`bg-white rounded-xl border p-4 ${novaConfirmada ? "border-green-300 ring-1 ring-green-200" : "border-slate-100"}`}>
                {novaConfirmada && (
                  <div className="flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-lg px-2.5 py-1.5 mb-3">
                    <Bell className="w-3.5 h-3.5" /> Nova pelada confirmada — confirme sua presença!
                  </div>
                )}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-semibold text-slate-900 capitalize">{formatData(p.data)}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {formatHora(p.data)}</span>
                      <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {confirmadosCount(p)} confirmados</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {confirmadoPelada && <span className="text-xs font-medium bg-green-100 text-green-700 px-2 py-1 rounded-full">✅ Na pelada</span>}
                    {listaEspera && <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2 py-1 rounded-full">Lista de espera</span>}
                    {c?.naResenha && <span className="text-xs font-medium bg-orange-100 text-orange-700 px-2 py-1 rounded-full flex items-center gap-1"><Beer className="w-3 h-3" /> Resenha</span>}
                  </div>
                </div>

                {!respondeu ? (
                  <button onClick={() => abrirModal(p)}
                    className="w-full py-2.5 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Confirmar presença
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => abrirModal(p)}
                      className="flex-1 py-2.5 rounded-lg text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                      Alterar
                    </button>
                    <button onClick={() => cancelar(p)} disabled={carregando || !cancelavel}
                      className="flex-1 py-2.5 rounded-lg text-sm font-semibold border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                      {carregando ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />} Cancelar
                    </button>
                  </div>
                )}
                {respondeu && !cancelavel && (
                  <p className="text-xs text-slate-400 text-center mt-1.5">O cancelamento só é permitido até 2 horas antes do início.</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de confirmação */}
      <Dialog open={!!modalPartida} onOpenChange={o => !o && setModalPartida(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Confirmar presença</DialogTitle></DialogHeader>
          {modalPartida && (
            <div className="space-y-4 mt-1">
              <p className="text-sm text-slate-500 capitalize">{formatData(modalPartida.data)}</p>

              {/* Opções */}
              <div className="space-y-2">
                {([
                  { key: "AMBOS", titulo: "Pelada + Resenha", desc: "Confirmado na pelada e na resenha do dia" },
                  { key: "PELADA", titulo: "Somente Pelada", desc: "Confirmado só na pelada (sem resenha)" },
                  { key: "RESENHA", titulo: "Somente Resenha", desc: "Confirmado só na resenha (fora da pelada)" },
                ] as const).map(o => (
                  <button key={o.key} onClick={() => setOpcao(o.key)}
                    className={`w-full text-left p-3 rounded-xl border-2 transition-colors ${opcao === o.key ? "border-green-500 bg-green-50" : "border-slate-200 hover:border-slate-300"}`}>
                    <p className="text-sm font-semibold text-slate-800">{o.titulo}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{o.desc}</p>
                  </button>
                ))}
              </div>

              {/* Categoria da resenha */}
              {envolveResenha && (
                isGoleiro ? (
                  <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
                    🥅 Você é goleiro — será aplicado o valor de resenha de goleiro.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-700">Na resenha, você vai beber?</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => setBebe(true)}
                        className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors ${bebe === true ? "border-green-500 bg-green-50 text-green-700" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}>
                        🍺 Bebo
                      </button>
                      <button onClick={() => setBebe(false)}
                        className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors ${bebe === false ? "border-green-500 bg-green-50 text-green-700" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}>
                        🥤 Não bebo
                      </button>
                    </div>
                  </div>
                )
              )}

              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setModalPartida(null)}>Cancelar</Button>
                <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={confirmar} disabled={!opcao || salvando}>
                  {salvando ? "Salvando..." : "Confirmar"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
