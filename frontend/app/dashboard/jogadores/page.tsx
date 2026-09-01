"use client";
import { useEffect, useState } from "react";
import { api, ASSET_BASE } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Users, Plus, Pencil, Star } from "lucide-react";
import { toast } from "sonner";

interface Jogador { id: string; nome: string; email: string; celular: string | null; fotoNormal: string | null }
interface JogadorPelada { id: string; tipo: string; posicao: string; nivel: number; ativo: boolean; jogador: Jogador }
interface Pelada { id: string; nome: string; corPrimaria: string }

const NIVEIS = [1, 2, 3, 4, 5];

export default function JogadoresPage() {
  const [peladas, setPeladas] = useState<Pelada[]>([]);
  const [peladaId, setPeladaId] = useState("");
  const [jogadores, setJogadores] = useState<JogadorPelada[]>([]);
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<JogadorPelada | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ nome: "", email: "", celular: "", tipo: "DIARISTA", posicao: "LINHA", nivel: "3" });
  const [foto, setFoto] = useState<File | null>(null);

  useEffect(() => {
    api.get("/peladas").then(r => { setPeladas(r.data); if (r.data.length > 0) setPeladaId(r.data[0].id); });
  }, []);

  const load = () => { if (peladaId) api.get(`/peladas/${peladaId}/jogadores`).then(r => setJogadores(r.data)).catch(() => {}); };
  useEffect(() => { load(); }, [peladaId]);

  function abrirNovo() { setEditando(null); setForm({ nome: "", email: "", celular: "", tipo: "DIARISTA", posicao: "LINHA", nivel: "3" }); setFoto(null); setOpen(true); }
  function abrirEditar(jp: JogadorPelada) {
    setEditando(jp);
    setForm({ nome: jp.jogador.nome, email: jp.jogador.email, celular: jp.jogador.celular || "", tipo: jp.tipo, posicao: jp.posicao, nivel: String(jp.nivel) });
    setFoto(null);
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (foto) fd.append("fotoNormal", foto);
      const cfg = { headers: { "Content-Type": "multipart/form-data" } };
      if (editando) {
        await api.put(`/peladas/${peladaId}/jogadores/${editando.id}`, fd, cfg);
        toast.success("Jogador atualizado!");
      } else {
        await api.post(`/peladas/${peladaId}/jogadores`, fd, cfg);
        toast.success("Jogador adicionado!");
      }
      setOpen(false); load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro ao salvar jogador");
    } finally { setLoading(false); }
  }

  async function toggleAtivo(jp: JogadorPelada) {
    try {
      await api.put(`/peladas/${peladaId}/jogadores/${jp.id}`, { ativo: !jp.ativo });
      load();
    } catch { toast.error("Erro ao atualizar"); }
  }

  const ativos = jogadores.filter(j => j.ativo);
  const inativos = jogadores.filter(j => !j.ativo);

  function Avatar({ jp }: { jp: JogadorPelada }) {
    if (jp.jogador.fotoNormal)
      return <img src={`${ASSET_BASE}${jp.jogador.fotoNormal}`} alt={jp.jogador.nome} className="w-11 h-11 rounded-full object-cover" />;
    return (
      <div className="w-11 h-11 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-lg">
        {jp.jogador.nome[0].toUpperCase()}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Jogadores</h1>
          <p className="text-slate-500 mt-1">Gerencie os jogadores da pelada</p>
        </div>
        <div className="flex items-center gap-2">
          {peladas.length > 1 && (
            <Select value={peladaId} onValueChange={setPeladaId}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>{peladas.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
            </Select>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700 gap-2" onClick={abrirNovo} disabled={!peladaId}>
                <Plus className="w-4 h-4" /> Adicionar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>{editando ? "Editar jogador" : "Adicionar jogador"}</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <Label>Nome completo</Label>
                    <Input placeholder="João Silva" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label>E-mail</Label>
                    <Input type="email" placeholder="joao@email.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required disabled={!!editando} />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label>Celular</Label>
                    <Input placeholder="(11) 99999-9999" value={form.celular} onChange={e => setForm(f => ({ ...f, celular: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Foto de rosto (opcional)</Label>
                    {editando?.jogador.fotoNormal && !foto && (
                      <img src={`${ASSET_BASE}${editando.jogador.fotoNormal}`} alt="" className="w-14 h-14 rounded-full object-cover mb-1" />
                    )}
                    <input type="file" accept="image/*" onChange={e => setFoto(e.target.files?.[0] || null)}
                      className="w-full text-sm text-slate-600 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-green-50 file:text-green-700 file:text-xs file:font-semibold file:cursor-pointer border border-slate-200 rounded-lg p-1.5 bg-white" />
                    <p className="text-xs text-slate-400">Usada nas artes do Instagram (destaque / água de salsicha).</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tipo</Label>
                    <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MENSALISTA">Mensalista</SelectItem>
                        <SelectItem value="DIARISTA">Diarista</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Posição</Label>
                    <Select value={form.posicao} onValueChange={v => setForm(f => ({ ...f, posicao: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LINHA">Linha</SelectItem>
                        <SelectItem value="GOLEIRO">Goleiro 🥅</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label>Nível (para sorteio equilibrado)</Label>
                    <div className="flex gap-2">
                      {NIVEIS.map(n => (
                        <button type="button" key={n} onClick={() => setForm(f => ({ ...f, nivel: String(n) }))}
                          className={`flex-1 h-9 rounded-lg border text-sm font-medium transition-colors flex items-center justify-center gap-0.5
                            ${form.nivel === String(n) ? "bg-amber-500 border-amber-500 text-white" : "border-slate-200 text-slate-500 hover:border-amber-300"}`}>
                          {n}<Star className={`w-3 h-3 ${form.nivel === String(n) ? "fill-white" : ""}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700" disabled={loading}>
                    {loading ? "Salvando..." : editando ? "Salvar" : "Adicionar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {jogadores.length === 0 && peladaId ? (
        <Card className="border-0 shadow-sm"><CardContent className="flex flex-col items-center py-14 text-center">
          <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mb-4"><Users className="w-7 h-7 text-green-400" /></div>
          <h3 className="font-semibold text-slate-900 mb-1">Nenhum jogador cadastrado</h3>
          <p className="text-sm text-slate-500">Adicione o primeiro jogador para começar</p>
        </CardContent></Card>
      ) : (
        <>
          {ativos.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-slate-500 mb-3">Ativos ({ativos.length})</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {ativos.map(jp => (
                  <Card key={jp.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-center gap-3">
                      <Avatar jp={jp} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{jp.jogador.nome}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <Badge variant="outline" className="text-xs">{jp.posicao === "GOLEIRO" ? "🥅 Goleiro" : "⚽ Linha"}</Badge>
                          <Badge variant="outline" className="text-xs">{jp.tipo === "MENSALISTA" ? "Mensalista" : "Diarista"}</Badge>
                          <span className="text-xs text-amber-500">{"★".repeat(jp.nivel)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Switch checked={jp.ativo} onCheckedChange={() => toggleAtivo(jp)} className="scale-75" />
                        <button onClick={() => abrirEditar(jp)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}
          {inativos.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-slate-400 mb-3">Inativos ({inativos.length})</h2>
              <div className="grid sm:grid-cols-2 gap-3 opacity-60">
                {inativos.map(jp => (
                  <Card key={jp.id} className="border-0 shadow-sm">
                    <CardContent className="p-4 flex items-center gap-3">
                      <Avatar jp={jp} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-600 truncate">{jp.jogador.nome}</p>
                        <p className="text-xs text-slate-400">{jp.posicao} · {jp.tipo}</p>
                      </div>
                      <Switch checked={jp.ativo} onCheckedChange={() => toggleAtivo(jp)} className="scale-75" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
