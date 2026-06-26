"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy } from "lucide-react";

interface Artilheiro { posicao: number; jogadorPeladaId: string; nome: string; foto: string | null; gols: number }
interface Pelada { id: string; nome: string }

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

export default function ArtilhariaPage() {
  const agora = new Date();
  const [peladas, setPeladas] = useState<Pelada[]>([]);
  const [peladaId, setPeladaId] = useState("");
  const [filtroMes, setFiltroMes] = useState<string>("todos");
  const [filtroAno, setFiltroAno] = useState<string>("todos");
  const [lista, setLista] = useState<Artilheiro[]>([]);

  useEffect(() => {
    api.get("/peladas").then(r => { setPeladas(r.data); if (r.data.length) setPeladaId(r.data[0].id); });
  }, []);

  useEffect(() => {
    if (!peladaId) return;
    const params = new URLSearchParams();
    if (filtroAno !== "todos") params.set("ano", filtroAno);
    if (filtroMes !== "todos" && filtroAno !== "todos") params.set("mes", filtroMes);
    api.get(`/peladas/${peladaId}/artilharia?${params}`).then(r => setLista(r.data)).catch(() => {});
  }, [peladaId, filtroMes, filtroAno]);

  const anos = [String(agora.getFullYear() - 1), String(agora.getFullYear()), String(agora.getFullYear() + 1)];
  const maxGols = lista[0]?.gols || 1;

  const medalha = (pos: number) => pos === 1 ? "🥇" : pos === 2 ? "🥈" : pos === 3 ? "🥉" : `${pos}º`;

  function Avatar({ nome, foto }: { nome: string; foto: string | null }) {
    if (foto) return <img src={`http://localhost:3001${foto}`} alt={nome} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />;
    return <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold flex-shrink-0">{nome[0].toUpperCase()}</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Artilharia</h1>
          <p className="text-slate-500 mt-1">Ranking de gols</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {peladas.length > 1 && (
            <Select value={peladaId} onValueChange={setPeladaId}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>{peladas.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
            </Select>
          )}
          <Select value={filtroAno} onValueChange={v => { setFiltroAno(v); if (v === "todos") setFiltroMes("todos"); }}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Geral</SelectItem>
              {anos.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          {filtroAno !== "todos" && (
            <Select value={filtroMes} onValueChange={setFiltroMes}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Ano todo</SelectItem>
                {MESES.map((m, i) => <SelectItem key={i+1} value={String(i+1)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {lista.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col items-center py-14 text-center">
            <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mb-4">
              <Trophy className="w-7 h-7 text-amber-400" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-1">Nenhum gol registrado</h3>
            <p className="text-sm text-slate-500">Registre gols nas partidas para ver o ranking</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Top 3 destaque */}
          {lista.length >= 3 && (
            <div className="grid grid-cols-3 gap-3 mb-2">
              {[lista[1], lista[0], lista[2]].map((art, idx) => {
                if (!art) return <div key={idx} />;
                const heights = ["h-24", "h-32", "h-20"];
                return (
                  <Card key={art.jogadorPeladaId} className={`border-0 shadow-sm ${idx === 1 ? "ring-2 ring-amber-400" : ""}`}>
                    <CardContent className={`flex flex-col items-center justify-end p-3 ${heights[idx]}`}>
                      <Avatar nome={art.nome} foto={art.foto} />
                      <p className="text-xs font-semibold text-slate-700 mt-1.5 truncate max-w-full text-center">{art.nome.split(" ")[0]}</p>
                      <p className="text-lg font-bold text-amber-500">{art.gols} ⚽</p>
                      <span className="text-base">{medalha(art.posicao)}</span>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Lista completa */}
          <div className="space-y-2">
            {lista.map(art => (
              <Card key={art.jogadorPeladaId} className="border-0 shadow-sm">
                <CardContent className="p-3 flex items-center gap-3">
                  <span className="w-8 text-center text-sm font-bold text-slate-400">{medalha(art.posicao)}</span>
                  <Avatar nome={art.nome} foto={art.foto} />
                  <p className="flex-1 font-medium text-slate-800 text-sm truncate">{art.nome}</p>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="w-24 bg-slate-100 rounded-full h-1.5 hidden sm:block">
                      <div className="bg-amber-400 h-1.5 rounded-full" style={{ width: `${(art.gols / maxGols) * 100}%` }} />
                    </div>
                    <span className="text-lg font-bold text-amber-500 w-12 text-right">{art.gols} ⚽</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
