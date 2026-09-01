"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight, BookOpen, HelpCircle, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { TOPICOS, buscar, resolverRota, MANUAL_VERSAO, type Contexto } from "@/lib/manual";

// Sugestões rápidas de busca (chips)
const SUGESTOES = ["pagar", "pix", "confirmar presença", "resenha", "votar", "comprovante", "ranking", "convidado"];

export function Manual({ contexto, papel }: { contexto: Contexto; papel?: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const resultados = useMemo(() => buscar(q), [q]);
  const buscando = q.trim().length > 0;

  async function baixarPdf() {
    setGerandoPdf(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 48;
      const maxW = pageW - margin * 2;
      let y = margin;

      const quebra = (altura: number) => {
        if (y + altura > pageH - margin) { doc.addPage(); y = margin; }
      };
      const escreve = (texto: string, size: number, style: "normal" | "bold" | "italic", cor: [number, number, number], espacoDepois = 4) => {
        doc.setFont("helvetica", style);
        doc.setFontSize(size);
        doc.setTextColor(cor[0], cor[1], cor[2]);
        const linhas = doc.splitTextToSize(texto, maxW) as string[];
        for (const linha of linhas) {
          quebra(size + 4);
          doc.text(linha, margin, y);
          y += size + 4;
        }
        y += espacoDepois;
      };

      // Capa / cabeçalho
      doc.setFillColor(17, 17, 17);
      doc.roundedRect(margin, y, 34, 34, 6, 6, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(233, 179, 0);
      doc.text("ADM", margin + 17, y + 22, { align: "center" });
      doc.setTextColor(20, 20, 20); doc.setFontSize(20);
      doc.text("Manual do Pelada ADM", margin + 46, y + 16);
      doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(110, 110, 100);
      doc.text(`Guia de uso e regras · v${MANUAL_VERSAO}`, margin + 46, y + 32);
      y += 34 + 22;

      // Tópicos
      for (const t of TOPICOS) {
        quebra(40);
        escreve(t.titulo, 13.5, "bold", [18, 130, 76], 2);
        escreve(t.resumo, 10.5, "italic", [110, 110, 100], 4);
        for (const linha of t.corpo) {
          escreve("•  " + linha, 10.5, "normal", [40, 40, 40], 2);
        }
        y += 8;
      }

      // Rodapé com numeração
      const total = doc.getNumberOfPages();
      for (let i = 1; i <= total; i++) {
        doc.setPage(i);
        doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(150, 150, 140);
        doc.text(`Pelada ADM · Manual v${MANUAL_VERSAO}`, margin, pageH - 24);
        doc.text(`${i} / ${total}`, pageW - margin, pageH - 24, { align: "right" });
      }

      doc.save(`Manual-Pelada-ADM-v${MANUAL_VERSAO}.pdf`);
    } catch {
      toast.error("Não foi possível gerar o PDF");
    } finally {
      setGerandoPdf(false);
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-green-600" />
          <h1 className="text-xl font-bold text-slate-900">Ajuda & Manual</h1>
        </div>
        <button onClick={baixarPdf} disabled={gerandoPdf}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white text-slate-700 hover:border-green-300 hover:text-green-700 disabled:opacity-60 transition-colors">
          {gerandoPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          {gerandoPdf ? "Gerando..." : "Baixar PDF"}
        </button>
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
