"use client";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api, ASSET_BASE } from "@/lib/api";
import { Download, Star, Droplets, Trophy } from "lucide-react";
import { toast } from "sonner";

interface VotacaoItem { tipo: string; jogadorPelada: { jogador: { nome: string; fotoNormal: string | null; fotoFeliz: string | null; fotoTriste: string | null } } }
interface ArtilhariaItem { posicao: number; nome: string; gols: number; foto: string | null }

const BASE = ASSET_BASE;

export default function PortalArtePage() {
  const { usuario } = useAuth();
  const [votacoes, setVotacoes] = useState<VotacaoItem[]>([]);
  const [artilharia, setArtilharia] = useState<ArtilhariaItem[]>([]);
  const [tipo, setTipo] = useState<"destaque" | "agua" | "artilharia">("destaque");
  const destaqueRef = useRef<HTMLDivElement>(null);
  const aguaRef = useRef<HTMLDivElement>(null);
  const artRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!usuario) return;
    Promise.all([
      api.get("/portal/destaques"),
      api.get("/portal/artilharia"),
    ]).then(([v, a]) => {
      setVotacoes(v.data);
      setArtilharia(a.data);
    });
  }, [usuario]);

  const destaque = votacoes.find(v => v.tipo === "DESTAQUE");
  const agua = votacoes.find(v => v.tipo === "AGUA_SALSICHA");
  const artilheiro = artilharia[0];
  const pelada = usuario?.pelada;
  const cor = pelada?.corPrimaria || "#16a34a";

  async function baixar(ref: React.RefObject<HTMLDivElement | null>, nome: string) {
    if (!ref.current) return;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(ref.current, { scale: 2, useCORS: true, backgroundColor: null });
      const a = document.createElement("a");
      a.download = `${nome}-${Date.now()}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
      toast.success("Arte baixada!");
    } catch { toast.error("Erro ao gerar arte"); }
  }

  const Card = ({ src, nome, subtitulo, emoji }: { src: string | null; nome: string; subtitulo: string; emoji: string }) => (
    <div
      className="w-64 h-64 rounded-2xl flex flex-col items-center justify-center text-white relative overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${cor} 0%, ${cor}cc 100%)` }}
    >
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 30% 30%, white 1px, transparent 1px), radial-gradient(circle at 70% 70%, white 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
      <div className="relative z-10 flex flex-col items-center gap-2 p-4">
        {src ? (
          <img src={`${BASE}${src}`} alt={nome} className="w-24 h-24 rounded-full object-cover border-4 border-white/30" crossOrigin="anonymous" />
        ) : (
          <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center text-4xl">{emoji}</div>
        )}
        <p className="text-xs font-medium opacity-70 uppercase tracking-wider">{subtitulo}</p>
        <p className="font-bold text-lg text-center leading-tight">{nome}</p>
        <p className="text-sm opacity-70">{pelada?.nome}</p>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-slate-900 mb-1">Arte Instagram</h1>
      <p className="text-sm text-slate-500 mb-4">Gere artes para compartilhar nas redes sociais</p>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setTipo("destaque")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tipo === "destaque" ? "bg-green-600 text-white" : "bg-white text-slate-600 border border-slate-200"}`}>
          <Star className="w-3.5 h-3.5 inline mr-1" />Destaque
        </button>
        <button onClick={() => setTipo("agua")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tipo === "agua" ? "bg-green-600 text-white" : "bg-white text-slate-600 border border-slate-200"}`}>
          <Droplets className="w-3.5 h-3.5 inline mr-1" />Água
        </button>
        <button onClick={() => setTipo("artilharia")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tipo === "artilharia" ? "bg-green-600 text-white" : "bg-white text-slate-600 border border-slate-200"}`}>
          <Trophy className="w-3.5 h-3.5 inline mr-1" />Artilharia
        </button>
      </div>

      {tipo === "destaque" && (
        <div className="flex flex-col items-center gap-4">
          <div ref={destaqueRef}>
            <Card
              src={destaque?.jogadorPelada.jogador.fotoFeliz || destaque?.jogadorPelada.jogador.fotoNormal || null}
              nome={destaque?.jogadorPelada.jogador.nome || "Destaque do Jogo"}
              subtitulo="⭐ Destaque do Jogo"
              emoji="⭐"
            />
          </div>
          <button onClick={() => baixar(destaqueRef, "destaque")} className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors">
            <Download className="w-4 h-4" /> Baixar PNG
          </button>
        </div>
      )}

      {tipo === "agua" && (
        <div className="flex flex-col items-center gap-4">
          <div ref={aguaRef}>
            <Card
              src={agua?.jogadorPelada.jogador.fotoTriste || agua?.jogadorPelada.jogador.fotoNormal || null}
              nome={agua?.jogadorPelada.jogador.nome || "Água de Salsicha"}
              subtitulo="💧 Água de Salsicha"
              emoji="💧"
            />
          </div>
          <button onClick={() => baixar(aguaRef, "agua")} className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors">
            <Download className="w-4 h-4" /> Baixar PNG
          </button>
        </div>
      )}

      {tipo === "artilharia" && (
        <div className="flex flex-col items-center gap-4">
          <div ref={artRef}>
            <Card
              src={artilheiro?.foto || null}
              nome={artilheiro ? `${artilheiro.nome} (${artilheiro.gols} gols)` : "Artilheiro"}
              subtitulo="🏆 Artilharia"
              emoji="🏆"
            />
          </div>
          <button onClick={() => baixar(artRef, "artilharia")} className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors">
            <Download className="w-4 h-4" /> Baixar PNG
          </button>
        </div>
      )}
    </div>
  );
}
