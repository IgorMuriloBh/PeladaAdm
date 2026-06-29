"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface Pelada { id: string; nome: string; corPrimaria: string }
interface Partida { id: string; data: string; status: string }
interface Votacao { tipo: string; partida: { data: string }; jogadorPelada: { jogador: { nome: string; fotoNormal: string | null } } }
interface Artilheiro { posicao: number; nome: string; foto: string | null; gols: number }

function fmtData(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

const TIPOS = [
  { value: "destaque", label: "⭐ Destaque da Pelada" },
  { value: "agua", label: "💧 Água de Salsicha" },
  { value: "artilharia", label: "🏆 Artilharia" },
];

export default function ArtePage() {
  const [peladas, setPeladas] = useState<Pelada[]>([]);
  const [peladaId, setPeladaId] = useState("");
  const [pelada, setPelada] = useState<Pelada | null>(null);
  const [tipo, setTipo] = useState("destaque");
  const [partidas, setPartidas] = useState<Partida[]>([]);
  const [partidaSel, setPartidaSel] = useState("");
  const [votacoes, setVotacoes] = useState<Votacao[]>([]);
  const [artilharia, setArtilharia] = useState<Artilheiro[]>([]);
  const [gerando, setGerando] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get("/peladas").then(r => {
      setPeladas(r.data);
      if (r.data.length) { setPeladaId(r.data[0].id); setPelada(r.data[0]); }
    });
  }, []);

  useEffect(() => {
    if (!peladaId) return;
    const p = peladas.find(p => p.id === peladaId);
    setPelada(p || null);
    api.get(`/peladas/${peladaId}/partidas`).then(r => {
      const validas = r.data.filter((p: Partida) => ["EM_ANDAMENTO","REALIZADA"].includes(p.status));
      setPartidas(validas);
      if (validas.length) setPartidaSel(validas[0].id);
    }).catch(() => {});
    api.get(`/peladas/${peladaId}/artilharia`).then(r => setArtilharia(r.data.slice(0, 5))).catch(() => {});
  }, [peladaId]);

  useEffect(() => {
    if (!peladaId || !partidaSel) return;
    api.get(`/peladas/${peladaId}/partidas/${partidaSel}/votacoes`).then(r => setVotacoes(r.data)).catch(() => {});
  }, [peladaId, partidaSel]);

  async function baixar() {
    if (!cardRef.current) return;
    setGerando(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(cardRef.current, { scale: 2, useCORS: true, backgroundColor: null });
      const link = document.createElement("a");
      link.download = `pelada-${tipo}-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Arte baixada!");
    } catch { toast.error("Erro ao gerar imagem"); }
    finally { setGerando(false); }
  }

  const destaqueVoto = votacoes.find(v => v.tipo === "DESTAQUE");
  const aguaVoto = votacoes.find(v => v.tipo === "AGUA_SALSICHA");
  const partidaData = partidas.find(p => p.id === partidaSel)?.data;
  const cor = pelada?.corPrimaria || "#16a34a";

  function CardDestaque({ voto, emoji, titulo, bgClass }: { voto: Votacao | undefined; emoji: string; titulo: string; bgClass: string }) {
    return (
      <div ref={cardRef} className={`w-[400px] h-[400px] ${bgClass} rounded-2xl flex flex-col items-center justify-center p-8 relative overflow-hidden select-none`}
        style={{ background: `linear-gradient(135deg, ${cor} 0%, ${cor}cc 100%)` }}>
        {/* fundo decorativo */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="absolute top-4 left-0 right-0 text-center">
          <p className="text-white/70 text-sm font-semibold tracking-widest uppercase">{pelada?.nome}</p>
        </div>
        <div className="text-6xl mb-4 drop-shadow-lg">{emoji}</div>
        <p className="text-white/80 text-sm font-bold uppercase tracking-widest mb-2">{titulo}</p>
        {voto ? (
          <>
            {voto.jogadorPelada.jogador.fotoNormal ? (
              <img src={`http://localhost:3001${voto.jogadorPelada.jogador.fotoNormal}`} alt="" className="w-24 h-24 rounded-full object-cover border-4 border-white/60 mb-3 shadow-xl" crossOrigin="anonymous" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-white/20 border-4 border-white/60 flex items-center justify-center mb-3 shadow-xl">
                <span className="text-4xl font-bold text-white">{voto.jogadorPelada.jogador.nome[0]}</span>
              </div>
            )}
            <p className="text-white text-2xl font-bold text-center drop-shadow">{voto.jogadorPelada.jogador.nome}</p>
          </>
        ) : (
          <p className="text-white/60 text-lg italic">Não atribuído</p>
        )}
        {partidaData && (
          <div className="absolute bottom-4 left-0 right-0 text-center">
            <p className="text-white/60 text-xs">{fmtData(partidaData)}</p>
          </div>
        )}
      </div>
    );
  }

  function CardArtilharia() {
    return (
      <div ref={cardRef} className="w-[400px] rounded-2xl flex flex-col overflow-hidden select-none"
        style={{ background: `linear-gradient(135deg, ${cor} 0%, ${cor}cc 100%)` }}>
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 20% 80%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="p-6 pb-3 text-center relative">
          <p className="text-white/70 text-xs font-semibold tracking-widest uppercase mb-1">{pelada?.nome}</p>
          <p className="text-white text-xl font-bold">🏆 Artilharia</p>
        </div>
        <div className="px-5 pb-6 space-y-2.5 relative">
          {artilharia.length === 0 ? (
            <p className="text-white/60 text-center py-8 italic">Sem gols registrados</p>
          ) : artilharia.map((a, i) => (
            <div key={a.posicao} className="flex items-center gap-3 bg-white/15 rounded-xl px-4 py-2.5">
              <span className="text-xl w-7 text-center">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i+1}º`}</span>
              {a.foto ? (
                <img src={`http://localhost:3001${a.foto}`} alt="" className="w-9 h-9 rounded-full object-cover border-2 border-white/50" crossOrigin="anonymous" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-white/20 border-2 border-white/50 flex items-center justify-center">
                  <span className="text-sm font-bold text-white">{a.nome[0]}</span>
                </div>
              )}
              <span className="flex-1 text-white font-semibold text-sm truncate">{a.nome}</span>
              <span className="text-white font-bold text-lg">{a.gols} ⚽</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Arte para Instagram</h1>
        <p className="text-slate-500 mt-1">Gere cards visuais para compartilhar</p>
      </div>

      {/* Controles */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 flex flex-wrap gap-3 items-end">
          {peladas.length > 1 && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500">Pelada</label>
              <Select value={peladaId} onValueChange={setPeladaId}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>{peladas.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-500">Tipo de arte</label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
              <SelectContent>{TIPOS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {tipo !== "artilharia" && partidas.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500">Partida</label>
              <Select value={partidaSel} onValueChange={setPartidaSel}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>{partidas.map(p => <SelectItem key={p.id} value={p.id}>{fmtData(p.data)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <Button className="bg-green-600 hover:bg-green-700 gap-2" onClick={baixar} disabled={gerando}>
            <Download className="w-4 h-4" />
            {gerando ? "Gerando..." : "Baixar PNG"}
          </Button>
        </CardContent>
      </Card>

      {/* Preview */}
      <div className="flex flex-col items-center gap-4">
        <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Preview</p>
        <div className="relative">
          {tipo === "destaque" && (
            <CardDestaque voto={destaqueVoto} emoji="⭐" titulo="Destaque da Pelada" bgClass="" />
          )}
          {tipo === "agua" && (
            <CardDestaque voto={aguaVoto} emoji="💧" titulo="Água de Salsicha" bgClass="" />
          )}
          {tipo === "artilharia" && <CardArtilharia />}
        </div>
        {tipo !== "artilharia" && !destaqueVoto && tipo === "destaque" && (
          <p className="text-sm text-slate-400 italic">Atribua um destaque na página Destaques primeiro</p>
        )}
        {tipo === "agua" && !aguaVoto && (
          <p className="text-sm text-slate-400 italic">Atribua o Água de Salsicha na página Destaques primeiro</p>
        )}
      </div>

      {partidas.length === 0 && tipo !== "artilharia" && (
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col items-center py-10 text-center">
            <ImageIcon className="w-10 h-10 text-slate-300 mb-3" />
            <p className="text-sm text-slate-500">Nenhuma partida em andamento ou realizada</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
