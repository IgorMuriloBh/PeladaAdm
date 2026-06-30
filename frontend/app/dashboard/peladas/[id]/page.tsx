"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, Settings, DollarSign, Trophy } from "lucide-react";
import Link from "next/link";

interface ConfigFinanceira {
  mensalistaValor: number; diaristaValor: number;
  resenhaBebe: number; resenhaNaoBebe: number; resenhaGoleiro: number;
  pontoPresenca: number; pontoVitoria: number; pontoGol: number;
  pontoDestaque: number; pontoAguaSalsicha: number;
}

interface Pelada {
  id: string; nome: string; slug: string; logo: string | null;
  corPrimaria: string; corSecundaria: string; corTexto: string;
  diaSemana: number[]; horario: string; maxJogadores: number;
  horaAbreLista: string; horaFechaLista: string; ativa: boolean;
  configuracaoFinanceira: ConfigFinanceira | null;
  _count: { jogadores: number; partidas: number };
}

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function GerenciarPeladaPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<"geral" | "financeiro" | "pontuacao">("geral");
  const [pelada, setPelada] = useState<Pelada | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form geral
  const [form, setForm] = useState({
    nome: "", corPrimaria: "#16a34a", corSecundaria: "#15803d", corTexto: "#ffffff",
    horario: "20:00", maxJogadores: "20", horaAbreLista: "08:00", horaFechaLista: "18:00",
    diaSemana: [] as number[], ativa: true,
  });

  // Form financeiro
  const [fin, setFin] = useState({
    mensalistaValor: "90", diaristaValor: "30",
    resenhaBebe: "85", resenhaNaoBebe: "40", resenhaGoleiro: "40",
  });

  // Form pontuação
  const [pts, setPts] = useState({
    pontoPresenca: "1", pontoVitoria: "3", pontoGol: "1",
    pontoDestaque: "5", pontoAguaSalsicha: "-3",
  });

  useEffect(() => { carregarPelada(); }, [id]);

  async function carregarPelada() {
    setLoading(true);
    try {
      const r = await api.get(`/peladas/${id}`);
      const p: Pelada = r.data;
      setPelada(p);
      setForm({
        nome: p.nome, corPrimaria: p.corPrimaria, corSecundaria: p.corSecundaria,
        corTexto: p.corTexto, horario: p.horario, maxJogadores: String(p.maxJogadores),
        horaAbreLista: p.horaAbreLista, horaFechaLista: p.horaFechaLista,
        diaSemana: p.diaSemana, ativa: p.ativa,
      });
      if (p.configuracaoFinanceira) {
        const c = p.configuracaoFinanceira;
        setFin({
          mensalistaValor: String(c.mensalistaValor), diaristaValor: String(c.diaristaValor),
          resenhaBebe: String(c.resenhaBebe), resenhaNaoBebe: String(c.resenhaNaoBebe),
          resenhaGoleiro: String(c.resenhaGoleiro),
        });
        setPts({
          pontoPresenca: String(c.pontoPresenca), pontoVitoria: String(c.pontoVitoria),
          pontoGol: String(c.pontoGol), pontoDestaque: String(c.pontoDestaque),
          pontoAguaSalsicha: String(c.pontoAguaSalsicha),
        });
      }
    } catch {
      toast.error("Pelada não encontrada");
      router.push("/dashboard/peladas");
    } finally {
      setLoading(false);
    }
  }

  function toggleDia(dia: number) {
    setForm(f => ({
      ...f,
      diaSemana: f.diaSemana.includes(dia) ? f.diaSemana.filter(d => d !== dia) : [...f.diaSemana, dia],
    }));
  }

  async function salvarGeral() {
    if (form.diaSemana.length === 0) { toast.error("Selecione pelo menos um dia"); return; }
    setSaving(true);
    try {
      await api.put(`/peladas/${id}`, { ...form, maxJogadores: Number(form.maxJogadores), ativa: form.ativa });
      toast.success("Pelada atualizada!");
      carregarPelada();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "Erro ao salvar");
    } finally { setSaving(false); }
  }

  async function salvarFinanceiro() {
    setSaving(true);
    try {
      await api.put(`/peladas/${id}/financeiro`, {
        mensalistaValor: Number(fin.mensalistaValor),
        diaristaValor: Number(fin.diaristaValor),
        resenhaBebe: Number(fin.resenhaBebe),
        resenhaNaoBebe: Number(fin.resenhaNaoBebe),
        resenhaGoleiro: Number(fin.resenhaGoleiro),
      });
      toast.success("Configuração financeira salva!");
    } catch { toast.error("Erro ao salvar"); }
    finally { setSaving(false); }
  }

  async function salvarPontuacao() {
    setSaving(true);
    try {
      await api.put(`/peladas/${id}/financeiro`, {
        pontoPresenca: Number(pts.pontoPresenca),
        pontoVitoria: Number(pts.pontoVitoria),
        pontoGol: Number(pts.pontoGol),
        pontoDestaque: Number(pts.pontoDestaque),
        pontoAguaSalsicha: Number(pts.pontoAguaSalsicha),
      });
      toast.success("Pontuação salva!");
    } catch { toast.error("Erro ao salvar"); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="text-center py-16 text-slate-400">Carregando...</div>;
  if (!pelada) return null;

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/peladas">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: pelada.corPrimaria }}>
            <span style={{ color: pelada.corTexto }}>⚽</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{pelada.nome}</h1>
            <p className="text-xs text-slate-400 font-mono">/{pelada.slug} · {pelada._count.jogadores} jogadores · {pelada._count.partidas} partidas</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {([
          { key: "geral", label: "Geral", icon: Settings },
          { key: "financeiro", label: "Financeiro", icon: DollarSign },
          { key: "pontuacao", label: "Pontuação", icon: Trophy },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === key ? "bg-green-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:border-green-300"}`}>
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>

      {/* Aba Geral */}
      {tab === "geral" && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-5">
          <div className="space-y-1.5">
            <Label>Nome da pelada</Label>
            <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Horário</Label>
              <Input type="time" value={form.horario} onChange={e => setForm(f => ({ ...f, horario: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Máx. jogadores</Label>
              <Input type="number" min="4" max="100" value={form.maxJogadores} onChange={e => setForm(f => ({ ...f, maxJogadores: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Abre lista</Label>
              <Input type="time" value={form.horaAbreLista} onChange={e => setForm(f => ({ ...f, horaAbreLista: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha lista</Label>
              <Input type="time" value={form.horaFechaLista} onChange={e => setForm(f => ({ ...f, horaFechaLista: e.target.value }))} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Cores da pelada</Label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Cor primária", key: "corPrimaria" },
                { label: "Cor secundária", key: "corSecundaria" },
                { label: "Cor do texto", key: "corTexto" },
              ].map(({ label, key }) => (
                <div key={key} className="space-y-1.5">
                  <Label className="text-xs">{label}</Label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form[key as keyof typeof form] as string}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      className="w-8 h-8 rounded cursor-pointer border-0 p-0.5 bg-white" />
                    <Input value={form[key as keyof typeof form] as string}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      className="text-xs h-8 font-mono" maxLength={7} />
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-lg p-3 flex items-center gap-2 mt-1" style={{ backgroundColor: form.corPrimaria }}>
              <span className="text-xl">⚽</span>
              <span className="font-semibold text-sm" style={{ color: form.corTexto }}>{form.nome}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Label className="text-sm">Status</Label>
            <button type="button" onClick={() => setForm(f => ({ ...f, ativa: !f.ativa }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.ativa ? "bg-green-600" : "bg-slate-200"}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.ativa ? "translate-x-6" : "translate-x-1"}`} />
            </button>
            <span className="text-sm text-slate-500">{form.ativa ? "Ativa" : "Inativa"}</span>
          </div>

          <Button onClick={salvarGeral} disabled={saving} className="w-full bg-green-600 hover:bg-green-700">
            <Save className="w-4 h-4 mr-2" />{saving ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      )}

      {/* Aba Financeiro */}
      {tab === "financeiro" && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-5">
          <div>
            <h2 className="font-semibold text-slate-800 mb-4">Valores de pagamento</h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Mensalidade (mensalista)", key: "mensalistaValor" },
                { label: "Diária", key: "diaristaValor" },
                { label: "Resenha — Bebe", key: "resenhaBebe" },
                { label: "Resenha — Não bebe", key: "resenhaNaoBebe" },
                { label: "Resenha — Goleiro/Bebe", key: "resenhaGoleiro" },
              ].map(({ label, key }) => (
                <div key={key} className="space-y-1.5">
                  <Label className="text-xs">{label}</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">R$</span>
                    <Input type="number" step="0.01" min="0"
                      value={fin[key as keyof typeof fin]}
                      onChange={e => setFin(f => ({ ...f, [key]: e.target.value }))}
                      className="pl-9" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Button onClick={salvarFinanceiro} disabled={saving} className="w-full bg-green-600 hover:bg-green-700">
            <Save className="w-4 h-4 mr-2" />{saving ? "Salvando..." : "Salvar configuração"}
          </Button>
        </div>
      )}

      {/* Aba Pontuação */}
      {tab === "pontuacao" && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-5">
          <div>
            <h2 className="font-semibold text-slate-800 mb-1">Pontuação do ranking</h2>
            <p className="text-xs text-slate-400 mb-4">Defina quantos pontos cada ação vale no ranking de jogadores.</p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Por presença", key: "pontoPresenca" },
                { label: "Por vitória", key: "pontoVitoria" },
                { label: "Por gol", key: "pontoGol" },
                { label: "Destaque da pelada", key: "pontoDestaque" },
                { label: "Água de salsicha", key: "pontoAguaSalsicha" },
              ].map(({ label, key }) => (
                <div key={key} className="space-y-1.5">
                  <Label className="text-xs">{label}</Label>
                  <Input type="number"
                    value={pts[key as keyof typeof pts]}
                    onChange={e => setPts(p => ({ ...p, [key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          </div>

          <Button onClick={salvarPontuacao} disabled={saving} className="w-full bg-green-600 hover:bg-green-700">
            <Save className="w-4 h-4 mr-2" />{saving ? "Salvando..." : "Salvar pontuação"}
          </Button>
        </div>
      )}
    </div>
  );
}
