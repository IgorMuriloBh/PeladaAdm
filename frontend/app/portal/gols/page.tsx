"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Minus, Search, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Partida { id: string; data: string; status: string; presencas?: Presenca[] }
interface Presenca { id: string; status: string; time: string | null; jogadorPelada: { id: string; jogador: { nome: string; fotoNormal: string | null } } }
interface Gol { id: string; jogadorPeladaId: string }

const STATUS_OK = ["EM_ANDAMENTO", "REALIZADA"];

export default function PortalGolsPage() {
  const { usuario } = useAuth();
  const [partidas, setPartidas] = useState<Partida[]>([]);
  const [selectedPartida, setSelectedPartida] = useState<Partida | null>(null);
  const [presencas, setPresencas] = useState<Presenca[]>([]);
  const [gols, setGols] = useState<Gol[]>([]);
  const [busca, setBusca] = useState("");
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
    const [golesR, partR] = await Promise.all([
      api.get(`/portal/partidas/${p.id}/gols`),
      api.get("/portal/partidas"),
    ]);
    const found = partR.data.find((x: any) => x.id === p.id);
    setPresencas(found?.presencas?.filter((pr: any) => pr.status === "CONFIRMADO") || []);
    setGols(golesR.data);
  }

  async function addGol(jogadorPeladaId: string, time: string | null) {
    if (!selectedPartida) return;
    try {
      await api.post(`/portal/partidas/${selectedPartida.id}/gols`, { jogadorPeladaId, time });
      const r = await api.get(`/portal/partidas/${selectedPartida.id}/gols`);
      setGols(r.data);
    } catch { toast.error("Erro ao registrar gol"); }
  }

  async function removeGol(jogadorPeladaId: string) {
    if (!selectedPartida) return;
    const golsJp = gols.filter(g => g.jogadorPeladaId === jogadorPeladaId);
    if (golsJp.length === 0) return;
    try {
      await api.delete(`/portal/partidas/${selectedPartida.id}/gols/${golsJp[golsJp.length - 1].id}`);
      const r = await api.get(`/portal/partidas/${selectedPartida.id}/gols`);
      setGols(r.data);
    } catch { toast.error("Erro ao remover gol"); }
  }

  const filtrados = presencas
    .filter(p => p.jogadorPelada.jogador.nome.toLowerCase().includes(busca.toLowerCase()))
    .sort((a, b) => a.jogadorPelada.jogador.nome.localeCompare(b.jogadorPelada.jogador.nome, "pt-BR"));

  const showSearch = presencas.length > 8;
  const BASE = "http://localhost:3001";

  function formatData(d: string) {
    return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-slate-900 mb-1">Lançar Gols</h1>
      <p className="text-sm text-slate-500 mb-4">Registre os gols de cada atleta</p>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Carregando...</div>
      ) : partidas.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">Nenhuma partida em andamento.</div>
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

          {showSearch && (
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Buscar atleta..." className="pl-9 bg-white" value={busca} onChange={e => setBusca(e.target.value)} />
            </div>
          )}

          <div className="space-y-2">
            {filtrados.map(pr => {
              const jp = pr.jogadorPelada;
              const count = gols.filter(g => g.jogadorPeladaId === jp.id).length;
              return (
                <div key={pr.id} className="bg-white border border-slate-100 rounded-xl p-3 flex items-center gap-3">
                  {jp.jogador.fotoNormal ? (
                    <img src={`${BASE}${jp.jogador.fotoNormal}`} alt={jp.jogador.nome} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <span className="font-bold text-green-700 text-sm">{jp.jogador.nome[0]}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 text-sm truncate">{jp.jogador.nome}</p>
                    {pr.time && (
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${pr.time === "A" ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"}`}>
                        Time {pr.time}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => removeGol(jp.id)}
                      disabled={count === 0}
                      className="w-8 h-8 rounded-full bg-slate-100 hover:bg-red-100 flex items-center justify-center disabled:opacity-30 transition-colors"
                    >
                      <Minus className="w-4 h-4 text-slate-600" />
                    </button>
                    <span className="w-8 text-center font-bold text-slate-900">{count}</span>
                    <button
                      onClick={() => addGol(jp.id, pr.time)}
                      className="w-8 h-8 rounded-full bg-green-100 hover:bg-green-200 flex items-center justify-center transition-colors"
                    >
                      <Plus className="w-4 h-4 text-green-700" />
                    </button>
                  </div>
                </div>
              );
            })}
            {filtrados.length === 0 && <p className="text-center text-slate-400 py-8 text-sm">Nenhum jogador encontrado.</p>}
          </div>
        </>
      )}
    </div>
  );
}
