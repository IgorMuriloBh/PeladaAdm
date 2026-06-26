"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, XCircle, Plus, Trash2, Utensils } from "lucide-react";
import { toast } from "sonner";

interface Jogador { id: string; nome: string; fotoNormal: string | null }
interface JogadorPelada { id: string; posicao: string; tipo: string; jogador: Jogador }
interface ResenhaPresenca {
  id: string; categoria: string; valorDevido: number; pago: boolean; dataPagamento: string | null;
  jogadorPelada: { jogador: Jogador };
}
interface Resenha { id: string; partidaId: string; presencas: ResenhaPresenca[] }
interface Partida { id: string; data: string; status: string; resenha?: Resenha | null }
interface Pelada { id: string; nome: string }

const CATEGORIAS: Record<string, { label: string; color: string }> = {
  BEBE: { label: "Bebe 🍺", color: "bg-amber-100 text-amber-700" },
  NAO_BEBE: { label: "Não bebe 🥤", color: "bg-blue-100 text-blue-700" },
  GOLEIRO_BEBE: { label: "Goleiro 🥅", color: "bg-purple-100 text-purple-700" },
};

function fmtBRL(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function fmtData(d: string) { return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }); }

export default function ResenhaPage() {
  const [peladas, setPeladas] = useState<Pelada[]>([]);
  const [peladaId, setPeladaId] = useState("");
  const [partidas, setPartidas] = useState<Partida[]>([]);
  const [partidaSel, setPartidaSel] = useState<Partida | null>(null);
  const [resenha, setResenha] = useState<Resenha | null>(null);
  const [jogadores, setJogadores] = useState<JogadorPelada[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ jogadorPeladaId: "", categoria: "NAO_BEBE" });

  useEffect(() => {
    api.get("/peladas").then(r => { setPeladas(r.data); if (r.data.length) setPeladaId(r.data[0].id); });
  }, []);

  useEffect(() => {
    if (!peladaId) return;
    api.get(`/peladas/${peladaId}/partidas?status=REALIZADA`).then(r => {
      setPartidas(r.data);
      if (r.data.length) setPartidaSel(r.data[0]);
    }).catch(() => {});
    api.get(`/peladas/${peladaId}/jogadores`).then(r => setJogadores(r.data)).catch(() => {});
  }, [peladaId]);

  useEffect(() => {
    if (!partidaSel || !peladaId) return;
    api.get(`/peladas/${peladaId}/partidas/${partidaSel.id}/resenha`)
      .then(r => setResenha(r.data))
      .catch(() => setResenha(null));
  }, [partidaSel, peladaId]);

  async function criarResenha() {
    if (!partidaSel) return;
    try {
      await api.post(`/peladas/${peladaId}/partidas/${partidaSel.id}/resenha`);
      toast.success("Resenha criada!");
      refreshResenha();
    } catch (e: any) { toast.error(e.response?.data?.error || "Erro ao criar resenha"); }
  }

  async function adicionarParticipante() {
    if (!resenha || !addForm.jogadorPeladaId) return;
    try {
      await api.post(`/peladas/${peladaId}/resenha/${resenha.id}/participantes`, addForm);
      toast.success("Participante adicionado");
      setAddOpen(false);
      setAddForm({ jogadorPeladaId: "", categoria: "NAO_BEBE" });
      refreshResenha();
    } catch (e: any) { toast.error(e.response?.data?.error || "Erro ao adicionar"); }
  }

  async function togglePago(id: string, pago: boolean) {
    try {
      await api.patch(`/peladas/${peladaId}/resenha/participantes/${id}`, { pago: !pago });
      refreshResenha();
    } catch { toast.error("Erro ao atualizar"); }
  }

  async function remover(id: string) {
    try {
      await api.delete(`/peladas/${peladaId}/resenha/participantes/${id}`);
      refreshResenha();
    } catch { toast.error("Erro ao remover"); }
  }

  function refreshResenha() {
    if (!partidaSel) return;
    api.get(`/peladas/${peladaId}/partidas/${partidaSel.id}/resenha`)
      .then(r => setResenha(r.data))
      .catch(() => setResenha(null));
  }

  const jaAdicionados = resenha?.presencas.map(p => p.jogadorPelada.jogador.id) ?? [];
  const disponiveis = jogadores.filter(j => !jaAdicionados.includes(j.jogador.id));
  const totalDevido = resenha?.presencas.reduce((s, p) => s + p.valorDevido, 0) ?? 0;
  const totalRecebido = resenha?.presencas.filter(p => p.pago).reduce((s, p) => s + p.valorDevido, 0) ?? 0;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Resenha</h1>
          <p className="text-slate-500 mt-1">Controle do churras/bebida pós-jogo</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {peladas.length > 1 && (
            <Select value={peladaId} onValueChange={setPeladaId}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>{peladas.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
            </Select>
          )}
          {partidas.length > 0 && (
            <Select value={partidaSel?.id ?? ""} onValueChange={id => setPartidaSel(partidas.find(p => p.id === id) ?? null)}>
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
            <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center mb-4">
              <Utensils className="w-7 h-7 text-orange-400" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-1">Nenhuma partida realizada</h3>
            <p className="text-sm text-slate-500">As resenhas aparecem para partidas com status "Realizada"</p>
          </CardContent>
        </Card>
      ) : !resenha ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col items-center py-14 text-center">
            <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center mb-4">
              <Utensils className="w-7 h-7 text-orange-400" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-1">Sem resenha para esta partida</h3>
            <p className="text-sm text-slate-500 mb-4">Crie uma resenha para começar a registrar participantes</p>
            <Button className="bg-orange-500 hover:bg-orange-600" onClick={criarResenha}>
              Criar resenha
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Resumo financeiro */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Participantes", value: resenha.presencas.length, color: "text-slate-700" },
              { label: "Total previsto", value: fmtBRL(totalDevido), color: "text-slate-700" },
              { label: "Recebido", value: fmtBRL(totalRecebido), color: "text-green-600" },
            ].map(({ label, value, color }) => (
              <Card key={label} className="border-0 shadow-sm">
                <CardContent className="p-3 text-center">
                  <p className={`text-lg font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Lista de participantes */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Participantes</CardTitle>
                <Button size="sm" className="bg-orange-500 hover:bg-orange-600 gap-1.5 h-8" onClick={() => setAddOpen(true)}>
                  <Plus className="w-3.5 h-3.5" /> Adicionar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {resenha.presencas.length === 0 ? (
                <p className="text-sm text-slate-400 italic py-4 text-center">Nenhum participante ainda.</p>
              ) : (
                resenha.presencas.map(p => (
                  <div key={p.id} className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm flex-shrink-0">
                      {p.jogadorPelada.jogador.nome[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{p.jogadorPelada.jogador.nome}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${CATEGORIAS[p.categoria]?.color}`}>
                        {CATEGORIAS[p.categoria]?.label}
                      </span>
                    </div>
                    <span className="text-sm text-slate-500">{fmtBRL(p.valorDevido)}</span>
                    <button onClick={() => togglePago(p.id, p.pago)}
                      className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium transition-colors
                        ${p.pago ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-red-50 text-red-600 hover:bg-red-100"}`}>
                      {p.pago ? <><CheckCircle className="w-3.5 h-3.5" /> Pago</> : <><XCircle className="w-3.5 h-3.5" /> Pendente</>}
                    </button>
                    <button onClick={() => remover(p.id)} className="p-1.5 rounded hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Dialog adicionar participante */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Adicionar participante</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Jogador</label>
              <Select value={addForm.jogadorPeladaId} onValueChange={v => setAddForm(f => ({ ...f, jogadorPeladaId: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar jogador..." /></SelectTrigger>
                <SelectContent>
                  {disponiveis.map(j => <SelectItem key={j.id} value={j.id}>{j.jogador.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Categoria</label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(CATEGORIAS).map(([key, { label, color }]) => (
                  <button key={key} type="button"
                    onClick={() => setAddForm(f => ({ ...f, categoria: key }))}
                    className={`p-2 rounded-lg border text-xs font-medium transition-colors text-center
                      ${addForm.categoria === key ? "border-orange-400 bg-orange-50 text-orange-700" : "border-slate-200 text-slate-500 hover:border-orange-200"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>Cancelar</Button>
              <Button className="flex-1 bg-orange-500 hover:bg-orange-600" onClick={adicionarParticipante} disabled={!addForm.jogadorPeladaId}>
                Adicionar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
