"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight, BookOpen, HelpCircle } from "lucide-react";
import { TOPICOS, buscar, resolverRota, MANUAL_VERSAO, type Contexto } from "@/lib/manual";

// Sugestões rápidas de busca (chips)
const SUGESTOES = ["pagar", "pix", "confirmar presença", "resenha", "votar", "comprovante", "ranking", "convidado"];

export function Manual({ contexto, papel }: { contexto: Contexto; papel?: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const resultados = useMemo(() => buscar(q), [q]);
  const buscando = q.trim().length > 0;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-center gap-2 mb-1">
        <BookOpen className="w-5 h-5 text-green-600" />
        <h1 className="text-xl font-bold text-slate-900">Ajuda & Manual</h1>
      </div>
      <p className="text-sm text-slate-500 mb-4">Pesquise um tema e vá direto para a função no sistema.</p>

      {/* Busca */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          autoFocus
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="O que você procura? Ex.: como pagar, confirmar presença, PIX..."
          className="w-full pl-10 pr-9 py-3 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        {q && (
          <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
        )}
      </div>

      {/* Sugestões */}
      {!buscando && (
        <div className="flex flex-wrap gap-2 mb-5">
          {SUGESTOES.map(s => (
            <button key={s} onClick={() => setQ(s)}
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-white text-slate-600 border border-slate-200 hover:border-green-300 hover:text-green-700 transition-colors">
              {s}
            </button>
          ))}
        </div>
      )}

      {buscando && (
        <p className="text-xs text-slate-400 mb-3">
          {resultados.length === 0 ? "Nada encontrado — tente outra palavra." : `${resultados.length} resultado(s) para “${q}”`}
        </p>
      )}

      {/* Resultados / tópicos */}
      {resultados.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <HelpCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Não achamos esse tema. Tente “pagamento”, “presença”, “votação”...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {resultados.map(t => {
            const rota = resolverRota(t, contexto, papel);
            return (
              <div key={t.id} className="bg-white border border-slate-100 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-semibold text-slate-900">{t.titulo}</h2>
                    <p className="text-sm text-slate-500 mt-0.5">{t.resumo}</p>
                  </div>
                  {rota && (
                    <button onClick={() => router.push(rota)}
                      className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors">
                      {t.acaoLabel || "Ir para a função"} <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <ul className="mt-3 space-y-1.5">
                  {t.corpo.map((linha, i) => (
                    <li key={i} className="text-sm text-slate-600 flex gap-2">
                      <span className="text-green-500 mt-1.5 w-1 h-1 rounded-full bg-green-500 shrink-0" />
                      <span>{linha}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-center text-xs text-slate-400 mt-8">
        Manual do Pelada ADM · v{MANUAL_VERSAO} · atualizado automaticamente a cada versão do sistema
      </p>
    </div>
  );
}
