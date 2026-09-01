"use client";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { api, ASSET_BASE } from "@/lib/api";
import { toast } from "sonner";
import { Star, Droplets, ChevronDown, ChevronUp, Check, RotateCcw, Lock } from "lucide-react";

interface Partida { id: string; data: string; status: string; presencas?: Presenca[] }
interface Presenca { id: string; status: string; jogadorPelada: { id: string; jogador: { nome: string; fotoNormal: string | null } } }
interface Apurado { jogadorPeladaId: string; nome: string; votos: number }
interface VotoGestao { id: string; tipo: string; votanteId: string; votanteNome: string; jogadorPeladaId: string; jogadorNome: string }
interface Resultado {
  status: string;
  emAndamento: boolean;
  apuracao: { DESTAQUE: Apurado[]; AGUA_SALSICHA: Apurado[] };
  meusVotos: { DESTAQUE: string | null; AGUA_SALSICHA: string | null };
  votos: VotoGestao[];
}

const BASE = ASSET_BASE;

export default function PortalVotacaoPage() {
  const { usuario } = useAuth();
  const isGestor = usuario?.role === "ADMINISTRADOR" || usuario?.role === "OPERADOR";
  const [partidas, setPartidas] = useState<Partida[]>([]);
  const [selectedPartida, setSelectedPartida] = useState<Partida | null>(null);
  const [presencas, setPresencas] = useState<Presenca[]>([]);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPartidas, setShowPartidas] = useState(false);

  useEffect(() => {
    if (!usuario) return;
    api.get("/portal/partidas").then(r => {
      // Só peladas EM ANDAMENTO recebem votação
      const emAndamento = (r.data as Partida[]).filter(p => p.status === "EM_ANDAMENTO");
      setPartidas(emAndamento);
      if (emAndamento.length > 0) selectPartida(emAndamento[emAndamento.length - 1]);
    }).finally(() => setLoading(false));
  }, [usuario]);

  const carregarResultado = useCallback(async (partidaId: string) => {
    const r = await api.get(`/portal/partidas/${partidaId}/votos`);
    setResultado(r.data);
  }, []);

  async function selectPartida(p: Partida) {
    setSelectedPartida(p);
    setShowPartidas(false);
    setPresencas(p.presencas?.filter(pr => pr.status === "CONFIRMADO") || []);
    await carregarResultado(p.id).catch(() => setResultado(null));
  }

  async function votar(jogadorPeladaId: string, tipo: "DESTAQUE" | "AGUA_SALSICHA") {
    if (!selectedPartida) return;
    try {
      await api.post(`/portal/partidas/${selectedPartida.id}/votos`, { jogadorPeladaId, tipo });
      await carregarResultado(selectedPartida.id);
      toast.success(tipo === "DESTAQUE" ? "⭐ Voto de destaque registrado!" : "💧 Voto de água registrado!");
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "Erro ao votar");
    }
  }

  async function zerar(votanteId: string, tipo: string, votanteNome: string) {
    if (!selectedPartida) return;
    try {
      await api.delete(`/portal/partidas/${selectedPartida.id}/votos/${votanteId}?tipo=${tipo}`);
      await carregarResultado(selectedPartida.id);
      toast.success(`Voto de ${votanteNome} zerado`);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "Erro ao zerar voto");
    }
  }

  function formatData(d: string) {
    return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  }
  function votosDe(jpId: string, tipo: "DESTAQUE" | "AGUA_SALSICHA") {
    return resultado?.apuracao[tipo].find(a => a.jogadorPeladaId === jpId)?.votos || 0;
  }

  const meuDestaque = resultado?.meusVotos.DESTAQUE || null;
  const minhaAgua = resultado?.meusVotos.AGUA_SALSICHA || null;

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-slate-900 mb-1">Votação</h1>
      <p className="text-sm text-slate-500 mb-4">Vote no destaque e na água de salsicha da pelada</p>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Carregando...</div>
      ) : partidas.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Star className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>Nenhuma pelada em andamento para votação.</p>
        </div>
      ) : (
        <>
          {/* Seletor de partida */}
          <div className="mb-4 relative">
            <button onClick={() => setShowPartidas(v => !v)}
              className="w-full flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700">
              <span>{selectedPartida ? `${formatData(selectedPartida.data)} · Em andamento` : "Selecione a partida"}</span>
              {showPartidas ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            {showPartidas && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-10 overflow-hidden">
                {partidas.map(p => (
                  <button key={p.id} onClick={() => selectPartida(p)} className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 border-b border-slate-50 last:border-0">
                    {formatData(p.data)} · Em andamento
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Aviso de voto já registrado */}
          {(meuDestaque || minhaAgua) && (
            <div className="bg-green-50 border border-green-100 rounded-xl p-3 mb-4 text-xs text-green-700">
              Você já votou{meuDestaque && minhaAgua ? " nos dois temas" : meuDestaque ? " no destaque" : " na água de salsicha"}.
              Para trocar, peça a um administrador ou operador para zerar seu voto.
            </div>
          )}

          {/* Lista de jogadores */}
          <div className="space-y-2">
            {presencas.sort((a, b) => a.jogadorPelada.jogador.nome.localeCompare(b.jogadorPelada.jogador.nome, "pt-BR")).map(pr => {
              const jp = pr.jogadorPelada;
              const votouDestaque = meuDestaque === jp.id;
              const votouAgua = minhaAgua === jp.id;
              const nDestaque = votosDe(jp.id, "DESTAQUE");
              const nAgua = votosDe(jp.id, "AGUA_SALSICHA");
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
                      disabled={!!meuDestaque}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:cursor-not-allowed ${votouDestaque ? "bg-yellow-400 text-white" : meuDestaque ? "bg-slate-50 text-slate-300" : "bg-yellow-50 text-yellow-700 hover:bg-yellow-100"}`}
                    >
                      {votouDestaque ? <Check className="w-3 h-3" /> : <Star className="w-3 h-3" />}
                      Destaque{nDestaque > 0 && <span className="ml-0.5 opacity-80">({nDestaque})</span>}
                    </button>
                    <button
                      onClick={() => votar(jp.id, "AGUA_SALSICHA")}
                      disabled={!!minhaAgua}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:cursor-not-allowed ${votouAgua ? "bg-blue-400 text-white" : minhaAgua ? "bg-slate-50 text-slate-300" : "bg-blue-50 text-blue-700 hover:bg-blue-100"}`}
                    >
                      {votouAgua ? <Check className="w-3 h-3" /> : <Droplets className="w-3 h-3" />}
                      Água{nAgua > 0 && <span className="ml-0.5 opacity-80">({nAgua})</span>}
                    </button>
                  </div>
                </div>
              );
            })}
            {presencas.length === 0 && <p className="text-center text-slate-400 py-8 text-sm">Nenhum jogador confirmado nesta partida.</p>}
          </div>

          {/* Painel de gestão (Adm/Operador): zerar votos */}
          {isGestor && resultado && resultado.votos.length > 0 && (
            <div className="mt-6 bg-white border border-slate-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <RotateCcw className="w-4 h-4 text-slate-500" />
                <p className="text-sm font-semibold text-slate-700">Gestão de votos</p>
                {!resultado.emAndamento && <span className="ml-auto flex items-center gap-1 text-xs text-slate-400"><Lock className="w-3 h-3" /> Pelada finalizada</span>}
              </div>
              <div className="space-y-1.5">
                {resultado.votos.map(v => (
                  <div key={v.id} className="flex items-center gap-2 text-xs py-1.5 border-b border-slate-50 last:border-0">
                    <span className="text-sm">{v.tipo === "DESTAQUE" ? "⭐" : "💧"}</span>
                    <span className="font-medium text-slate-700">{v.votanteNome}</span>
                    <span className="text-slate-400">votou em</span>
                    <span className="font-medium text-slate-700 flex-1 truncate">{v.jogadorNome}</span>
                    <button
                      onClick={() => zerar(v.votanteId, v.tipo, v.votanteNome)}
                      disabled={!resultado.emAndamento}
                      className="px-2 py-1 rounded-md text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      Zerar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
