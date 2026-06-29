"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Star, Droplets, ChevronDown, ChevronUp, Check } from "lucide-react";

interface Partida { id: string; data: string; status: string }
interface Presenca { id: string; status: string; jogadorPelada: { id: string; jogador: { nome: string; fotoNormal: string | null } } }
interface Votacao { id: string; tipo: string; jogadorPeladaId: string; jogadorPelada: { jogador: { nome: string } } }

const STATUS_OK = ["EM_ANDAMENTO", "REALIZADA"];

export default function PortalVotacaoPage() {
  const { usuario } = useAuth();
  const [partidas, setPartidas] = useState<Partida[]>([]);
  const [selectedPartida, setSelectedPartida] = useState<Partida | null>(null);
  const [presencas, setPresencas] = useState<Presenca[]>([]);
  const [votacoes, setVotacoes] = useState<Votacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPartidas, setShowPartidas] = useState(false);

  useEffect(() => {
    if (!usuario) return;
    api.get("/portal/partidas").then(r => {
      const ok = r.data.filter((p: Partida) => STATUS_OK.includes(p.status));
      setPartidas(ok);
      if (ok.length > 0) selectPartida(ok[ok.length - 1]);
    }).finally(() => setLoading(false));
  }, [usuario]);

  async function selectPartida(p: Partida) {
    setSelectedPartida(p);
    setShowPartidas(false);
    const [pres, vot] = await Promise.all([
      api.get(`/portal/partidas/${p.id}/gols`).catch(() => ({ data: [] })),
      api.get(`/portal/partidas/${p.id}/votacoes`),
    ]);
    // Get presencas from partidas list
    const partidaFull = await api.get("/portal/partidas").catch(() => ({ data: [] }));
    const found = partidaFull.data.find((x: any) => x.id === p.id);
    setPresencas(found?.presencas?.filter((pr: any) => pr.status === "CONFIRMADO") || []);
    setVotacoes(vot.data);
  }

  async function votar(jogadorPeladaId: string, tipo: "DESTAQUE" | "AGUA_SALSICHA") {
    if (!selectedPartida) return;
    try {
      await api.post(`/portal/partidas/${selectedPartida.id}/votacoes`, { jogadorPeladaId, tipo });
      const r = await api.get(`/portal/partidas/${selectedPartida.id}/votacoes`);
      setVotacoes(r.data);
      toast.success(tipo === "DESTAQUE" ? "⭐ Destaque votado!" : "💧 Água de salsicha votado!");
    } catch {
      toast.error("Erro ao votar");
    }
  }

  const destaque = votacoes.find(v => v.tipo === "DESTAQUE");
  const agua = votacoes.find(v => v.tipo === "AGUA_SALSICHA");
  const BASE = "http://localhost:3001";

  function formatData(d: string) {
    return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-slate-900 mb-1">Votação</h1>
      <p className="text-sm text-slate-500 mb-4">Vote no destaque e na água de salsicha da pelada</p>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Carregando...</div>
      ) : partidas.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Star className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>Nenhuma partida em andamento ou realizada.</p>
        </div>
      ) : (
        <>
          {/* Seletor de partida */}
          <div className="mb-4 relative">
            <button
              onClick={() => setShowPartidas(v => !v)}
              className="w-full flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700"
            >
              <span>{selectedPartida ? formatData(selectedPartida.data) : "Selecione a partida"}</span>
              {showPartidas ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            {showPartidas && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-10 overflow-hidden">
                {partidas.map(p => (
                  <button key={p.id} onClick={() => selectPartida(p)} className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 border-b border-slate-50 last:border-0">
                    {formatData(p.data)} · {p.status === "EM_ANDAMENTO" ? "Em andamento" : "Realizada"}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Votações atuais */}
          {(destaque || agua) && (
            <div className="bg-slate-50 rounded-xl p-3 mb-4 flex gap-3">
              {destaque && (
                <div className="flex-1 bg-yellow-50 border border-yellow-100 rounded-lg p-2 text-center">
                  <p className="text-xs text-yellow-600 font-medium">⭐ Destaque</p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5 truncate">{destaque.jogadorPelada.jogador.nome}</p>
                </div>
              )}
              {agua && (
                <div className="flex-1 bg-blue-50 border border-blue-100 rounded-lg p-2 text-center">
                  <p className="text-xs text-blue-600 font-medium">💧 Água</p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5 truncate">{agua.jogadorPelada.jogador.nome}</p>
                </div>
              )}
            </div>
          )}

          {/* Lista de jogadores */}
          <div className="space-y-2">
            {presencas.sort((a, b) => a.jogadorPelada.jogador.nome.localeCompare(b.jogadorPelada.jogador.nome, "pt-BR")).map(pr => {
              const jp = pr.jogadorPelada;
              const isDestaque = destaque?.jogadorPeladaId === jp.id;
              const isAgua = agua?.jogadorPeladaId === jp.id;
              return (
                <div key={pr.id} className="bg-white border border-slate-100 rounded-xl p-3 flex items-center gap-3">
                  {jp.jogador.fotoNormal ? (
                    <img src={`${BASE}${jp.jogador.fotoNormal}`} alt={jp.jogador.nome} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <span className="font-bold text-green-700 text-sm">{jp.jogador.nome[0]}</span>
                    </div>
                  )}
                  <p className="flex-1 font-medium text-slate-800 text-sm truncate">{jp.jogador.nome}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => votar(jp.id, "DESTAQUE")}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isDestaque ? "bg-yellow-400 text-white" : "bg-yellow-50 text-yellow-700 hover:bg-yellow-100"}`}
                    >
                      {isDestaque && <Check className="w-3 h-3" />}
                      <Star className="w-3 h-3" />
                      Destaque
                    </button>
                    <button
                      onClick={() => votar(jp.id, "AGUA_SALSICHA")}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isAgua ? "bg-blue-400 text-white" : "bg-blue-50 text-blue-700 hover:bg-blue-100"}`}
                    >
                      {isAgua && <Check className="w-3 h-3" />}
                      <Droplets className="w-3 h-3" />
                      Água
                    </button>
                  </div>
                </div>
              );
            })}
            {presencas.length === 0 && <p className="text-center text-slate-400 py-8 text-sm">Nenhum jogador confirmado nesta partida.</p>}
          </div>
        </>
      )}
    </div>
  );
}
