"use client";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { UserPlus, Trash2, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface Presenca { id: string; status: string; convidado?: boolean; jogadorPelada: { id: string; jogador: { nome: string; fotoNormal: string | null } } }
interface Partida { id: string; data: string; status: string; presencas?: Presenca[] }
interface JogadorPelada { id: string; posicao: string; tipo: string; jogador: { nome: string } }

const BASE = "http://localhost:3001";

export default function PortalConvidadosPage() {
  const { usuario } = useAuth();
  const [partidas, setPartidas] = useState<Partida[]>([]);
  const [jogadores, setJogadores] = useState<JogadorPelada[]>([]);
  const [partidaId, setPartidaId] = useState("");
  const [jogadorSel, setJogadorSel] = useState("");
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    const [p, j] = await Promise.all([
      api.get("/portal/partidas"),
      api.get("/portal/jogadores").catch(() => ({ data: [] })),
    ]);
    // Convidados só em peladas confirmadas
    const confirmadas = (p.data as Partida[]).filter(x => x.status === "CONFIRMADA")
      .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
    setPartidas(confirmadas);
    setJogadores(j.data);
    setPartidaId(prev => prev && confirmadas.some(x => x.id === prev) ? prev : (confirmadas[0]?.id || ""));
    setLoading(false);
  }, []);

  useEffect(() => { if (usuario) carregar(); }, [usuario, carregar]);

  const partida = partidas.find(p => p.id === partidaId);
  const presencas = partida?.presencas || [];
  const naPelada = new Set(presencas.map(pr => pr.jogadorPelada.id));
  const disponiveis = jogadores.filter(j => !naPelada.has(j.id));
  const convidados = presencas.filter(pr => pr.convidado);

  async function adicionar() {
    if (!partidaId || !jogadorSel) { toast.error("Selecione a pelada e o jogador"); return; }
    setSalvando(true);
    try {
      await api.post(`/portal/partidas/${partidaId}/convidado`, { jogadorPeladaId: jogadorSel });
      setJogadorSel("");
      await carregar();
      toast.success("Convidado incluído!");
    } catch (e: any) { toast.error(e?.response?.data?.error || "Erro ao incluir convidado"); }
    finally { setSalvando(false); }
  }

  async function remover(presencaId: string) {
    try {
      await api.delete(`/portal/partidas/${partidaId}/convidado/${presencaId}`);
      await carregar();
      toast.success("Convidado removido");
    } catch (e: any) { toast.error(e?.response?.data?.error || "Erro ao remover"); }
  }

  const fmt = (d: string) => new Date(d).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-slate-900 mb-1">Convidados</h1>
      <p className="text-sm text-slate-500 mb-4">Inclua convidados nas peladas confirmadas</p>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : partidas.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <UserPlus className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nenhuma pelada confirmada no momento.</p>
        </div>
      ) : (
        <>
          {/* Seletor de partida */}
          <div className="mb-4">
            <Select value={partidaId} onValueChange={setPartidaId}>
              <SelectTrigger className="bg-white"><SelectValue placeholder="Selecione a pelada" /></SelectTrigger>
              <SelectContent>
                {partidas.map(p => <SelectItem key={p.id} value={p.id} className="capitalize">{fmt(p.data)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Incluir convidado */}
          <div className="bg-white border border-slate-100 rounded-xl p-4 mb-4">
            <p className="text-sm font-semibold text-slate-700 mb-3">Incluir convidado</p>
            <div className="flex gap-2">
              <Select value={jogadorSel} onValueChange={setJogadorSel}>
                <SelectTrigger className="flex-1 bg-white"><SelectValue placeholder="Selecionar jogador cadastrado..." /></SelectTrigger>
                <SelectContent>
                  {disponiveis.map(j => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.jogador.nome} {j.posicao === "GOLEIRO" ? "🥅" : ""} ({j.tipo === "MENSALISTA" ? "Mensalista" : "Diarista"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button className="bg-green-600 hover:bg-green-700 px-4" onClick={adicionar} disabled={salvando || !jogadorSel}>
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              </Button>
            </div>
            {disponiveis.length === 0 && <p className="text-xs text-slate-400 mt-2">Todos os jogadores cadastrados já estão nesta pelada.</p>}
          </div>

          {/* Lista de convidados */}
          <p className="text-sm font-semibold text-slate-700 mb-2">Convidados nesta pelada ({convidados.length})</p>
          {convidados.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">Nenhum convidado incluído.</p>
          ) : (
            <div className="space-y-2">
              {convidados.map(pr => (
                <div key={pr.id} className="bg-white border border-slate-100 rounded-xl p-3 flex items-center gap-3">
                  {pr.jogadorPelada.jogador.fotoNormal ? (
                    <img src={`${BASE}${pr.jogadorPelada.jogador.fotoNormal}`} alt="" className="w-9 h-9 rounded-full object-cover" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center font-bold text-green-700 text-sm">{pr.jogadorPelada.jogador.nome[0]}</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{pr.jogadorPelada.jogador.nome}</p>
                    <span className="text-xs font-medium text-purple-600">Convidado{pr.status === "LISTA_ESPERA" ? " · lista de espera" : ""}</span>
                  </div>
                  <button onClick={() => remover(pr.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
