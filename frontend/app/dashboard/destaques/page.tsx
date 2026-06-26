"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Jogador { id: string; nome: string; fotoNormal: string | null }
interface JogadorPelada { id: string; posicao: string; tipo: string; ativo: boolean; jogador: Jogador }
interface Votacao {
  id: string; tipo: string; createdAt: string;
  partida: { data: string };
  jogadorPelada: { jogador: Jogador };
}
interface Partida { id: string; data: string; status: string }
interface Pelada { id: string; nome: string }

function fmtData(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function Avatar({ nome, foto }: { nome: string; foto: string | null }) {
  if (foto) return <img src={`http://localhost:3001${foto}`} alt={nome} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />;
  return <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold flex-shrink-0">{nome[0].toUpperCase()}</div>;
}

export default function DestaquesPage() {
  const [peladas, setPeladas] = useState<Pelada[]>([]);
  const [peladaId, setPeladaId] = useState("");
  const [partidas, setPartidas] = useState<Partida[]>([]);
  const [partidaSel, setPartidaSel] = useState("");
  const [jogadores, setJogadores] = useState<JogadorPelada[]>([]);
  const [votacoes, setVotacoes] = useState<Votacao[]>([]);
  const [historico, setHistorico] = useState<Votacao[]>([]);
  const [destaqueSel, setDestaqueSel] = useState("");
  const [aguaSel, setAguaSel] = useState("");

  useEffect(() => {
    api.get("/peladas").then(r => { setPeladas(r.data); if (r.data.length) setPeladaId(r.data[0].id); });
  }, []);

  useEffect(() => {
    if (!peladaId) return;
    api.get(`/peladas/${peladaId}/partidas`).then(r => {
      const realizadas = r.data.filter((p: Partida) => ["EM_ANDAMENTO", "REALIZADA"].includes(p.status));
      setPartidas(realizadas);
      if (realizadas.length) setPartidaSel(realizadas[0].id);
    }).catch(() => {});
    api.get(`/peladas/${peladaId}/destaques`).then(r => setHistorico(r.data)).catch(() => {});
  }, [peladaId]);

  useEffect(() => {
    if (!peladaId || !partidaSel) return;
    api.get(`/peladas/${peladaId}/jogadores`).then(r => setJogadores(r.data)).catch(() => {});
    api.get(`/peladas/${peladaId}/partidas/${partidaSel}/votacoes`).then(r => {
      setVotacoes(r.data);
      const d = r.data.find((v: any) => v.tipo === "DESTAQUE");
      const a = r.data.find((v: any) => v.tipo === "AGUA_SALSICHA");
      setDestaqueSel(d?.jogadorPelada?.jogador?.id ?? "");
      setAguaSel(a?.jogadorPelada?.jogador?.id ?? "");
    }).catch(() => {});
  }, [peladaId, partidaSel]);

  const loadVotacoes = () => {
    if (!peladaId || !partidaSel) return;
    api.get(`/peladas/${peladaId}/partidas/${partidaSel}/votacoes`).then(r => {
      setVotacoes(r.data);
      const d = r.data.find((v: any) => v.tipo === "DESTAQUE");
      const a = r.data.find((v: any) => v.tipo === "AGUA_SALSICHA");
      setDestaqueSel(d?.jogadorPelada?.jogador?.id ?? "");
      setAguaSel(a?.jogadorPelada?.jogador?.id ?? "");
    }).catch(() => {});
    api.get(`/peladas/${peladaId}/destaques`).then(r => setHistorico(r.data)).catch(() => {});
  };

  async function salvarDestaque(tipo: "DESTAQUE" | "AGUA_SALSICHA", jogadorId: string) {
    if (!jogadorId) return;
    const jp = jogadores.find(j => j.jogador.id === jogadorId);
    if (!jp) return;
    try {
      await api.post(`/peladas/${peladaId}/partidas/${partidaSel}/votacoes`, {
        jogadorPeladaId: jp.id,
        tipo,
      });
      toast.success(tipo === "DESTAQUE" ? "Destaque salvo! ⭐" : "Água de salsicha salvo! 💧");
      loadVotacoes();
    } catch (e: any) { toast.error(e.response?.data?.error || "Erro ao salvar"); }
  }

  async function remover(votacaoId: string) {
    try {
      await api.delete(`/peladas/${peladaId}/votacoes/${votacaoId}`);
      loadVotacoes();
    } catch { toast.error("Erro ao remover"); }
  }

  const destaqueAtual = votacoes.find(v => v.tipo === "DESTAQUE");
  const aguaAtual = votacoes.find(v => v.tipo === "AGUA_SALSICHA");

  const jogadoresAtivos = jogadores.filter(j => j.ativo !== false);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Destaques</h1>
          <p className="text-slate-500 mt-1">Destaque da pelada e Água de Salsicha</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {peladas.length > 1 && (
            <Select value={peladaId} onValueChange={setPeladaId}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>{peladas.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
            </Select>
          )}
          {partidas.length > 0 && (
            <Select value={partidaSel} onValueChange={setPartidaSel}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Selecionar partida" /></SelectTrigger>
              <SelectContent>
                {partidas.map(p => <SelectItem key={p.id} value={p.id}>{fmtData(p.data)}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {partidas.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col items-center py-14 text-center">
            <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mb-4">
              <Star className="w-7 h-7 text-amber-400" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-1">Nenhuma partida realizada</h3>
            <p className="text-sm text-slate-500">Os destaques são atribuídos a partidas "Em andamento" ou "Realizada"</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Destaque */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="text-xl">⭐</span> Destaque da Pelada
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {destaqueAtual ? (
                <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl">
                  <Avatar nome={destaqueAtual.jogadorPelada.jogador.nome} foto={destaqueAtual.jogadorPelada.jogador.fotoNormal} />
                  <p className="font-semibold text-slate-900 flex-1">{destaqueAtual.jogadorPelada.jogador.nome}</p>
                  <button onClick={() => remover(destaqueAtual.id)} className="p-1.5 rounded hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">Nenhum destaque atribuído</p>
              )}
              <div className="flex gap-2">
                <Select value={destaqueSel} onValueChange={setDestaqueSel}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Escolher jogador..." /></SelectTrigger>
                  <SelectContent>
                    {jogadoresAtivos.map(j => <SelectItem key={j.jogador.id} value={j.jogador.id}>{j.jogador.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="sm" className="bg-amber-500 hover:bg-amber-600 px-3"
                  onClick={() => salvarDestaque("DESTAQUE", destaqueSel)} disabled={!destaqueSel}>
                  ✓
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Água de Salsicha */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="text-xl">💧</span> Água de Salsicha
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {aguaAtual ? (
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                  <Avatar nome={aguaAtual.jogadorPelada.jogador.nome} foto={aguaAtual.jogadorPelada.jogador.fotoNormal} />
                  <p className="font-semibold text-slate-900 flex-1">{aguaAtual.jogadorPelada.jogador.nome}</p>
                  <button onClick={() => remover(aguaAtual.id)} className="p-1.5 rounded hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">Nenhum atribuído</p>
              )}
              <div className="flex gap-2">
                <Select value={aguaSel} onValueChange={setAguaSel}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Escolher jogador..." /></SelectTrigger>
                  <SelectContent>
                    {jogadoresAtivos.map(j => <SelectItem key={j.jogador.id} value={j.jogador.id}>{j.jogador.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="sm" className="bg-blue-500 hover:bg-blue-600 px-3"
                  onClick={() => salvarDestaque("AGUA_SALSICHA", aguaSel)} disabled={!aguaSel}>
                  ✓
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Histórico */}
      {historico.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Histórico</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {historico.map(v => (
                <div key={v.id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                  <span className="text-lg">{v.tipo === "DESTAQUE" ? "⭐" : "💧"}</span>
                  <Avatar nome={v.jogadorPelada.jogador.nome} foto={v.jogadorPelada.jogador.fotoNormal} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{v.jogadorPelada.jogador.nome}</p>
                    <p className="text-xs text-slate-400">{fmtData(v.partida.data)} · {v.tipo === "DESTAQUE" ? "Destaque" : "Água de Salsicha"}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
