"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Users, Plus, Zap, ChevronRight, Clock } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface Pelada { id: string; nome: string; corPrimaria: string; corTexto: string }
interface Partida {
  id: string; data: string; status: string; peladaId: string;
  _count: { presencas: number };
  presencas: { status: string }[];
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  AGENDADA:     { label: "Agendada",     color: "bg-blue-100 text-blue-700" },
  CONFIRMADA:   { label: "Confirmada",   color: "bg-green-100 text-green-700" },
  EM_ANDAMENTO: { label: "Em andamento", color: "bg-orange-100 text-orange-700" },
  REALIZADA:    { label: "Realizada",    color: "bg-slate-100 text-slate-600" },
  CANCELADA:    { label: "Cancelada",    color: "bg-red-100 text-red-600" },
};

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function AgendaPage() {
  const [peladas, setPeladas] = useState<Pelada[]>([]);
  const [peladaId, setPeladaId] = useState("");
  const [partidas, setPartidas] = useState<Partida[]>([]);
  const [loadingGerar, setLoadingGerar] = useState(false);
  const [openNova, setOpenNova] = useState(false);
  const [novaData, setNovaData] = useState("");

  useEffect(() => {
    api.get("/peladas").then(r => {
      setPeladas(r.data);
      if (r.data.length > 0) setPeladaId(r.data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!peladaId) return;
    api.get(`/peladas/${peladaId}/partidas`).then(r => setPartidas(r.data)).catch(() => {});
  }, [peladaId]);

  const peladaAtual = peladas.find(p => p.id === peladaId);

  async function gerarProximas() {
    setLoadingGerar(true);
    try {
      const { data } = await api.post(`/peladas/${peladaId}/partidas/gerar?quantidade=4`);
      toast.success(`${data.criadas} partida(s) gerada(s)!`);
      api.get(`/peladas/${peladaId}/partidas`).then(r => setPartidas(r.data));
    } catch { toast.error("Erro ao gerar partidas"); }
    finally { setLoadingGerar(false); }
  }

  async function criarManual(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post(`/peladas/${peladaId}/partidas`, { data: novaData });
      toast.success("Partida criada!");
      setOpenNova(false); setNovaData("");
      api.get(`/peladas/${peladaId}/partidas`).then(r => setPartidas(r.data));
    } catch { toast.error("Erro ao criar partida"); }
  }

  const proximas = partidas.filter(p => new Date(p.data) >= new Date() && p.status !== "CANCELADA");
  const passadas = partidas.filter(p => new Date(p.data) < new Date() || p.status === "REALIZADA");

  function confirmados(p: Partida) { return p.presencas?.filter(x => x.status === "CONFIRMADO").length ?? 0; }
  function espera(p: Partida) { return p.presencas?.filter(x => x.status === "LISTA_ESPERA").length ?? 0; }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Agenda</h1>
          <p className="text-slate-500 mt-1">Gerencie as partidas e presenças</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {peladas.length > 1 && (
            <Select value={peladaId} onValueChange={setPeladaId}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Selecionar pelada" /></SelectTrigger>
              <SelectContent>
                {peladas.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" className="gap-2" onClick={gerarProximas} disabled={!peladaId || loadingGerar}>
            <Zap className="w-4 h-4 text-amber-500" />
            {loadingGerar ? "Gerando..." : "Gerar próximas"}
          </Button>
          <Dialog open={openNova} onOpenChange={setOpenNova}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700 gap-2" disabled={!peladaId}>
                <Plus className="w-4 h-4" /> Nova partida
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Criar partida manual</DialogTitle></DialogHeader>
              <form onSubmit={criarManual} className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <Label>Data e horário</Label>
                  <Input type="datetime-local" value={novaData} onChange={e => setNovaData(e.target.value)} required />
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setOpenNova(false)}>Cancelar</Button>
                  <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700">Criar</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {!peladaId ? (
        <Card className="border-0 shadow-sm"><CardContent className="py-12 text-center text-slate-500">Nenhuma pelada cadastrada</CardContent></Card>
      ) : (
        <>
          {/* Próximas */}
          <section>
            <h2 className="text-base font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-green-600" /> Próximas partidas
            </h2>
            {proximas.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="py-10 text-center">
                  <p className="text-slate-500 text-sm mb-3">Nenhuma partida agendada</p>
                  <Button variant="outline" size="sm" className="gap-2" onClick={gerarProximas} disabled={loadingGerar}>
                    <Zap className="w-3.5 h-3.5 text-amber-500" /> Gerar próximas automaticamente
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {proximas.map(p => {
                  const dt = new Date(p.data);
                  const conf = confirmados(p);
                  const fila = espera(p);
                  const st = STATUS_LABEL[p.status];
                  return (
                    <Link key={p.id} href={`/dashboard/agenda/${p.id}?peladaId=${peladaId}`}>
                      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                        <CardContent className="p-4 flex items-center gap-4">
                          <div className="w-14 h-14 rounded-xl flex-shrink-0 flex flex-col items-center justify-center text-white font-bold" style={{ backgroundColor: peladaAtual?.corPrimaria || "#16a34a" }}>
                            <span className="text-xs uppercase">{DIAS[dt.getDay()]}</span>
                            <span className="text-2xl leading-tight">{dt.getDate()}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-semibold text-slate-900">
                                {dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-slate-500">
                              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                              <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-green-500" />{conf} confirmados</span>
                              {fila > 0 && <span className="flex items-center gap-1 text-amber-600"><Users className="w-3.5 h-3.5" />{fila} na fila</span>}
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          {/* Passadas */}
          {passadas.length > 0 && (
            <section>
              <h2 className="text-base font-semibold text-slate-400 mb-3">Partidas anteriores</h2>
              <div className="space-y-2">
                {passadas.slice(0, 5).map(p => {
                  const dt = new Date(p.data);
                  return (
                    <Link key={p.id} href={`/dashboard/agenda/${p.id}?peladaId=${peladaId}`}>
                      <Card className="border-0 shadow-sm opacity-60 hover:opacity-100 hover:shadow-md transition-all cursor-pointer">
                        <CardContent className="p-3 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-bold flex-shrink-0">
                            {dt.getDate()}/{dt.getMonth() + 1}
                          </div>
                          <span className="text-sm text-slate-600">{dt.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</span>
                          <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${STATUS_LABEL[p.status]?.color}`}>{STATUS_LABEL[p.status]?.label}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
