"use client";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { CalendarCheck, Clock, Users, CheckCircle2, X, Loader2 } from "lucide-react";

interface Presenca { id: string; status: string; jogadorPelada: { id: string; jogador: { nome: string } } }
interface Partida { id: string; data: string; status: string; presencas?: Presenca[] }

// Partidas ainda abertas para confirmação
const STATUS_ABERTO = ["AGENDADA", "CONFIRMADA"];
const CANCELAMENTO_LIMITE_MS = 2 * 60 * 60 * 1000;

export default function PortalPeladasPage() {
  const { usuario } = useAuth();
  const meuJpId = usuario?.jogadorPelada?.id;
  const [partidas, setPartidas] = useState<Partida[]>([]);
  const [loading, setLoading] = useState(true);
  const [acaoId, setAcaoId] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const r = await api.get("/portal/partidas");
      const abertas = (r.data as Partida[])
        .filter(p => STATUS_ABERTO.includes(p.status))
        .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
      setPartidas(abertas);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (usuario) carregar(); }, [usuario, carregar]);

  function minhaPresenca(p: Partida): Presenca | undefined {
    return p.presencas?.find(pr => pr.jogadorPelada.id === meuJpId);
  }

  function confirmadosCount(p: Partida) {
    return p.presencas?.filter(pr => pr.status === "CONFIRMADO").length || 0;
  }

  // Pode cancelar até 2h antes do início
  function podeCancelar(p: Partida) {
    return Date.now() <= new Date(p.data).getTime() - CANCELAMENTO_LIMITE_MS;
  }

  async function confirmar(p: Partida) {
    setAcaoId(p.id);
    try {
      await api.post(`/portal/partidas/${p.id}/minha-presenca`);
      toast.success("Presença confirmada!");
      await carregar();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "Erro ao confirmar presença");
    } finally { setAcaoId(null); }
  }

  async function cancelar(p: Partida) {
    setAcaoId(p.id);
    try {
      await api.delete(`/portal/partidas/${p.id}/minha-presenca`);
      toast.success("Presença cancelada");
      await carregar();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "Erro ao cancelar presença");
    } finally { setAcaoId(null); }
  }

  function formatData(d: string) {
    return new Date(d).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
  }
  function formatHora(d: string) {
    return new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

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
            const pres = minhaPresenca(p);
            const confirmado = pres?.status === "CONFIRMADO";
            const listaEspera = pres?.status === "LISTA_ESPERA";
            const cancelavel = podeCancelar(p);
            const carregando = acaoId === p.id;

            return (
              <div key={p.id} className="bg-white rounded-xl border border-slate-100 p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-semibold text-slate-900 capitalize">{formatData(p.data)}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {formatHora(p.data)}</span>
                      <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {confirmadosCount(p)} confirmados</span>
                    </div>
                  </div>
                  {confirmado && <span className="shrink-0 text-xs font-medium bg-green-100 text-green-700 px-2 py-1 rounded-full">✅ Confirmado</span>}
                  {listaEspera && <span className="shrink-0 text-xs font-medium bg-amber-100 text-amber-700 px-2 py-1 rounded-full">Lista de espera</span>}
                </div>

                {!pres ? (
                  <button onClick={() => confirmar(p)} disabled={carregando}
                    className="w-full py-2.5 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                    {carregando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Confirmar presença
                  </button>
                ) : (
                  <div>
                    <button onClick={() => cancelar(p)} disabled={carregando || !cancelavel}
                      className="w-full py-2.5 rounded-lg text-sm font-semibold border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                      {carregando ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                      Cancelar presença
                    </button>
                    {!cancelavel && (
                      <p className="text-xs text-slate-400 text-center mt-1.5">O cancelamento só é permitido até 2 horas antes do início.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
