"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface Pelada {
  id: string; nome: string; slug: string; corPrimaria: string; corSecundaria: string;
  corTexto: string; ativa: boolean; diaSemana: number[]; horario: string; maxJogadores: number;
  _count: { jogadores: number };
}

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function PeladasPage() {
  const [peladas, setPeladas] = useState<Pelada[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ nome: "", slug: "", corPrimaria: "#16a34a", corSecundaria: "#15803d", corTexto: "#ffffff", horario: "20:00", maxJogadores: "20", diaSemana: [3] });

  const load = () => api.get("/peladas").then(r => setPeladas(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  function toggleDia(dia: number) {
    setForm(f => ({ ...f, diaSemana: f.diaSemana.includes(dia) ? f.diaSemana.filter(d => d !== dia) : [...f.diaSemana, dia] }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.diaSemana.length === 0) { toast.error("Selecione pelo menos um dia da semana"); return; }
    setLoading(true);
    try {
      await api.post("/peladas", { ...form, maxJogadores: Number(form.maxJogadores) });
      toast.success("Pelada criada com sucesso!");
      setOpen(false);
      setForm({ nome: "", slug: "", corPrimaria: "#16a34a", corSecundaria: "#15803d", corTexto: "#ffffff", horario: "20:00", maxJogadores: "20", diaSemana: [3] });
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro ao criar pelada");
    } finally {
      setLoading(false);
    }
  }

  function gerarSlug(nome: string) {
    return nome.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Peladas</h1>
          <p className="text-slate-500 mt-1">Gerencie todas as suas peladas</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700 gap-2">
              <Plus className="w-4 h-4" /> Nova Pelada
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Criar nova pelada</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Nome da pelada</Label>
                <Input placeholder="Ex: Pelada ADM" value={form.nome} onChange={e => { const v = e.target.value; setForm(f => ({ ...f, nome: v, slug: gerarSlug(v) })); }} required />
              </div>
              <div className="space-y-1.5">
                <Label>Slug (identificador único)</Label>
                <Input placeholder="pelada-adm" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Dias da semana</Label>
                <div className="flex gap-1.5 flex-wrap">
                  {DIAS.map((d, i) => (
                    <button type="button" key={i} onClick={() => toggleDia(i)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${form.diaSemana.includes(i) ? "bg-green-600 text-white border-green-600" : "bg-white text-slate-600 border-slate-200 hover:border-green-300"}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Horário</Label>
                  <Input type="time" value={form.horario} onChange={e => setForm(f => ({ ...f, horario: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Máx. jogadores</Label>
                  <Input type="number" min="4" max="100" value={form.maxJogadores} onChange={e => setForm(f => ({ ...f, maxJogadores: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cores da pelada (white-label)</Label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Cor primária", key: "corPrimaria" },
                    { label: "Cor secundária", key: "corSecundaria" },
                    { label: "Cor do texto", key: "corTexto" },
                  ].map(({ label, key }) => (
                    <div key={key} className="space-y-1.5">
                      <Label className="text-xs">{label}</Label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={form[key as keyof typeof form] as string} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} className="w-8 h-8 rounded cursor-pointer border-0 p-0.5 bg-white" />
                        <Input value={form[key as keyof typeof form] as string} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} className="text-xs h-8 font-mono" maxLength={7} />
                      </div>
                    </div>
                  ))}
                </div>
                {/* Preview */}
                <div className="rounded-lg p-3 flex items-center gap-2 mt-2" style={{ backgroundColor: form.corPrimaria }}>
                  <span className="text-xl">⚽</span>
                  <span className="font-semibold text-sm" style={{ color: form.corTexto }}>{form.nome || "Nome da Pelada"}</span>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700" disabled={loading}>
                  {loading ? "Criando..." : "Criar Pelada"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {peladas.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mb-4">
              <span className="text-4xl">⚽</span>
            </div>
            <h3 className="font-semibold text-slate-900 mb-1">Nenhuma pelada cadastrada</h3>
            <p className="text-sm text-slate-500">Clique em "Nova Pelada" para começar</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {peladas.map(p => (
            <Card key={p.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              {/* Header colorido */}
              <div className="h-2 rounded-t-lg" style={{ backgroundColor: p.corPrimaria }} />
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: p.corPrimaria }}>
                      <span style={{ color: p.corTexto }}>⚽</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{p.nome}</h3>
                      <p className="text-xs text-slate-400 font-mono">/{p.slug}</p>
                    </div>
                  </div>
                  <Badge variant={p.ativa ? "default" : "secondary"} className={p.ativa ? "bg-green-100 text-green-700 hover:bg-green-100 border-0" : ""}>
                    {p.ativa ? "Ativa" : "Inativa"}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    {p._count.jogadores}/{p.maxJogadores}
                  </span>
                  <span>{p.diaSemana.map(d => DIAS[d]).join(", ")}</span>
                  <span>{p.horario}</span>
                </div>
                <div className="flex gap-2">
                  <Link href={`/dashboard/peladas/${p.id}`} className="flex-1">
                    <Button variant="outline" className="w-full gap-2 h-9 text-sm">
                      <Pencil className="w-3.5 h-3.5" /> Gerenciar
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
