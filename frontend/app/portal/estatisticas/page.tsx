"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

interface Stat {
  jogadorPeladaId: string;
  nome: string;
  foto: string | null;
  posicao: string;
  tipo: string;
  presencas: number;
  vitorias: number;
  gols: number;
  destaques: number;
  aguas: number;
  pontos: number;
}

type OrdenarPor = "pontos" | "presencas" | "gols" | "destaques" | "aguas";

const ORDENAR_OPCOES: { valor: OrdenarPor; label: string }[] = [
  { valor: "pontos", label: "Pontos" },
  { valor: "presencas", label: "Presença" },
  { valor: "gols", label: "Gols" },
  { valor: "destaques", label: "Destaque" },
  { valor: "aguas", label: "Água de salsicha" },
];

const ORDENAR_META: Record<OrdenarPor, { sufixo: string; cor: string }> = {
  pontos: { sufixo: "pts", cor: "text-green-700" },
  presencas: { sufixo: "presenças", cor: "text-blue-600" },
  gols: { sufixo: "gols", cor: "text-green-700" },
  destaques: { sufixo: "🏆", cor: "text-amber-500" },
  aguas: { sufixo: "🧅", cor: "text-orange-500" },
};

export default function PortalEstatisticasPage() {
  const { usuario } = useAuth();
  const [stats, setStats] = useState<Stat[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordenarPor, setOrdenarPor] = useState<OrdenarPor>("pontos");

  useEffect(() => {
    if (!usuario) return;
    api.get("/portal/estatisticas")
      .then(s => setStats(s.data))
      .finally(() => setLoading(false));
  }, [usuario]);

  const BASE = "http://localhost:3001";

  const statsOrdenados = [...stats].sort(
    (a, b) => b[ordenarPor] - a[ordenarPor] || b.pontos - a.pontos || b.gols - a.gols
  );

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-slate-900 mb-1">Estatísticas</h1>
      <p className="text-sm text-slate-500 mb-4">{usuario?.pelada.nome}</p>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-400">Carregando...</div>
      ) : (
        <div className="space-y-2">
          {/* Ordenação */}
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
            {ORDENAR_OPCOES.map(op => (
              <button key={op.valor} onClick={() => setOrdenarPor(op.valor)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${ordenarPor === op.valor ? "bg-green-600 text-white" : "bg-white text-slate-600 border border-slate-200"}`}>
                {op.label}
              </button>
            ))}
          </div>
          {statsOrdenados.map((s, i) => (
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
                <p className="text-xs text-slate-400">{s.presencas} presenças · {s.gols} gols · {s.destaques} 🏆 · {s.aguas} 🧅</p>
              </div>
              <div className="text-right">
                <p className={`font-bold text-lg ${ORDENAR_META[ordenarPor].cor}`}>{s[ordenarPor]}</p>
                <p className="text-xs text-slate-400">{ORDENAR_META[ordenarPor].sufixo}</p>
              </div>
            </div>
          ))}
          {stats.length === 0 && <p className="text-center text-slate-400 py-8">Nenhum dado disponível.</p>}
        </div>
      )}
    </div>
  );
}
