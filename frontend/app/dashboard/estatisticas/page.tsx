"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BarChart3 } from "lucide-react";

interface Stat {
  jogadorPeladaId: string; nome: string; foto: string | null;
  posicao: string; tipo: string;
  presencas: number; vitorias: number; gols: number; pontos: number;
}
interface Pelada { id: string; nome: string }

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

export default function EstatisticasPage() {
  const agora = new Date();
  const [peladas, setPeladas] = useState<Pelada[]>([]);
  const [peladaId, setPeladaId] = useState("");
  const [filtroMes, setFiltroMes] = useState<string>("todos");
  const [filtroAno, setFiltroAno] = useState(agora.getFullYear());
  const [stats, setStats] = useState<Stat[]>([]);

  useEffect(() => {
    api.get("/peladas").then(r => { setPeladas(r.data); if (r.data.length) setPeladaId(r.data[0].id); });
  }, []);

  useEffect(() => {
    if (!peladaId) return;
    const params = new URLSearchParams({ ano: String(filtroAno) });
    if (filtroMes !== "todos") params.set("mes", filtroMes);
    api.get(`/peladas/${peladaId}/estatisticas?${params}`).then(r => setStats(r.data)).catch(() => {});
  }, [peladaId, filtroMes, filtroAno]);

  const anos = [filtroAno - 1, filtroAno, filtroAno + 1];
  const maxPontos = stats[0]?.pontos || 1;

  function Avatar({ nome, foto }: { nome: string; foto: string | null }) {
    if (foto) return <img src={`http://localhost:3001${foto}`} alt={nome} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />;
    return <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold flex-shrink-0">{nome[0].toUpperCase()}</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Estatísticas</h1>
          <p className="text-slate-500 mt-1">Ranking de pontos dos jogadores</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {peladas.length > 1 && (
            <Select value={peladaId} onValueChange={setPeladaId}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>{peladas.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
            </Select>
          )}
          <Select value={filtroMes} onValueChange={setFiltroMes}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {MESES.map((m, i) => <SelectItem key={i+1} value={String(i+1)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={String(filtroAno)} onValueChange={v => setFiltroAno(Number(v))}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>{anos.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {stats.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col items-center py-14 text-center">
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
              <BarChart3 className="w-7 h-7 text-blue-400" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-1">Sem dados ainda</h3>
            <p className="text-sm text-slate-500">Jogue partidas e registre presenças para ver as estatísticas</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {stats.map((s, i) => (
            <Card key={s.jogadorPeladaId} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <span className={`w-7 text-center font-bold text-sm flex-shrink-0 ${i === 0 ? "text-amber-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-orange-400" : "text-slate-400"}`}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i+1}º`}
                  </span>
                  <Avatar nome={s.nome} foto={s.foto} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900 text-sm">{s.nome}</p>
                      <Badge variant="outline" className="text-xs">{s.posicao === "GOLEIRO" ? "🥅 Goleiro" : "⚽ Linha"}</Badge>
                    </div>
                    <div className="mt-1.5 w-full bg-slate-100 rounded-full h-1.5">
                      <div className="bg-green-500 h-1.5 rounded-full transition-all" style={{ width: `${(s.pontos / maxPontos) * 100}%` }} />
                    </div>
                    <div className="flex gap-3 mt-1.5 text-xs text-slate-500">
                      <span>{s.presencas} jogos</span>
                      <span>{s.vitorias} vitórias</span>
                      <span>{s.gols} gols</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-2xl font-bold text-green-600">{s.pontos}</p>
                    <p className="text-xs text-slate-400">pontos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Legenda de pontuação */}
      <Card className="border-0 shadow-sm bg-slate-50">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Tabela de pontos</p>
          <div className="flex flex-wrap gap-3 text-xs text-slate-600">
            <span className="bg-white px-2 py-1 rounded border border-slate-200">Presença +1</span>
            <span className="bg-white px-2 py-1 rounded border border-slate-200">Vitória +3</span>
            <span className="bg-white px-2 py-1 rounded border border-slate-200">Gol +1</span>
            <span className="bg-white px-2 py-1 rounded border border-slate-200">Destaque +5</span>
            <span className="bg-white px-2 py-1 rounded border border-slate-200">Água de Salsicha -3</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
