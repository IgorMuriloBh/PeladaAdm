"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Trophy, BarChart3, Target, Star } from "lucide-react";

interface Stat {
  jogadorPeladaId: string;
  nome: string;
  foto: string | null;
  posicao: string;
  tipo: string;
  presencas: number;
  vitorias: number;
  gols: number;
  pontos: number;
}

export default function PortalEstatisticasPage() {
  const { usuario } = useAuth();
  const [stats, setStats] = useState<Stat[]>([]);
  const [artilharia, setArtilharia] = useState<{ posicao: number; nome: string; gols: number; foto: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"ranking" | "artilharia">("ranking");

  useEffect(() => {
    if (!usuario) return;
    Promise.all([
      api.get("/portal/estatisticas"),
      api.get("/portal/artilharia"),
    ]).then(([s, a]) => {
      setStats(s.data);
      setArtilharia(a.data);
    }).finally(() => setLoading(false));
  }, [usuario]);

  const BASE = "http://localhost:3001";

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-slate-900 mb-1">Estatísticas</h1>
      <p className="text-sm text-slate-500 mb-4">{usuario?.pelada.nome}</p>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab("ranking")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "ranking" ? "bg-green-600 text-white" : "bg-white text-slate-600 border border-slate-200"}`}>
          Ranking
        </button>
        <button onClick={() => setTab("artilharia")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "artilharia" ? "bg-green-600 text-white" : "bg-white text-slate-600 border border-slate-200"}`}>
          Artilharia
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-400">Carregando...</div>
      ) : tab === "ranking" ? (
        <div className="space-y-2">
          {stats.map((s, i) => (
            <div key={s.jogadorPeladaId} className="bg-white rounded-xl border border-slate-100 p-3 flex items-center gap-3">
              <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm ${i === 0 ? "bg-yellow-400 text-white" : i === 1 ? "bg-slate-300 text-slate-700" : i === 2 ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-500"}`}>
                {i + 1}
              </div>
              {s.foto ? (
                <img src={`${BASE}${s.foto}`} alt={s.nome} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="font-bold text-green-700 text-sm">{s.nome[0]}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 text-sm truncate">{s.nome}</p>
                <p className="text-xs text-slate-400">{s.presencas} presenças · {s.vitorias} vitórias · {s.gols} gols</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-green-700 text-lg">{s.pontos}</p>
                <p className="text-xs text-slate-400">pts</p>
              </div>
            </div>
          ))}
          {stats.length === 0 && <p className="text-center text-slate-400 py-8">Nenhum dado disponível.</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {artilharia.map((a) => (
            <div key={a.posicao} className="bg-white rounded-xl border border-slate-100 p-3 flex items-center gap-3">
              <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm ${a.posicao === 1 ? "bg-yellow-400 text-white" : a.posicao === 2 ? "bg-slate-300 text-slate-700" : a.posicao === 3 ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-500"}`}>
                {a.posicao}
              </div>
              {a.foto ? (
                <img src={`${BASE}${a.foto}`} alt={a.nome} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="font-bold text-green-700 text-sm">{a.nome[0]}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 text-sm truncate">{a.nome}</p>
              </div>
              <div className="flex items-center gap-1">
                <Target className="w-4 h-4 text-green-600" />
                <span className="font-bold text-green-700 text-lg">{a.gols}</span>
                <span className="text-xs text-slate-400 ml-0.5">gols</span>
              </div>
            </div>
          ))}
          {artilharia.length === 0 && <p className="text-center text-slate-400 py-8">Nenhum gol registrado.</p>}
        </div>
      )}
    </div>
  );
}
