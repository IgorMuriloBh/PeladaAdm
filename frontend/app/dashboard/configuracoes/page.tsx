"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Settings } from "lucide-react";

interface ConfigFinanceira {
  mensalistaValor: number; diaristaValor: number;
  resenhaBebe: number; resenhaNaoBebe: number; resenhaGoleiro: number;
  pontoPresenca: number; pontoVitoria: number; pontoGol: number;
  pontoDestaque: number; pontoAguaSalsicha: number;
}
interface Pelada { id: string; nome: string; horario: string; maxJogadores: number; horaAbreLista: string; horaFechaLista: string }

export default function ConfiguracoesPage() {
  const [peladas, setPeladas] = useState<Pelada[]>([]);
  const [peladaId, setPeladaId] = useState("");
  const [pelada, setPelada] = useState<Pelada | null>(null);
  const [cfg, setCfg] = useState<ConfigFinanceira>({
    mensalistaValor: 90, diaristaValor: 30,
    resenhaBebe: 85, resenhaNaoBebe: 40, resenhaGoleiro: 40,
    pontoPresenca: 1, pontoVitoria: 3, pontoGol: 1, pontoDestaque: 5, pontoAguaSalsicha: -3,
  });
  const [loadingCfg, setLoadingCfg] = useState(false);
  const [loadingPelada, setLoadingPelada] = useState(false);
  const [formPelada, setFormPelada] = useState({ horario: "", maxJogadores: "", horaAbreLista: "", horaFechaLista: "" });

  useEffect(() => {
    api.get("/peladas").then(r => { setPeladas(r.data); if (r.data.length) setPeladaId(r.data[0].id); });
  }, []);

  useEffect(() => {
    if (!peladaId) return;
    api.get(`/peladas/${peladaId}`).then(r => {
      setPelada(r.data);
      setFormPelada({
        horario: r.data.horario,
        maxJogadores: String(r.data.maxJogadores),
        horaAbreLista: r.data.horaAbreLista,
        horaFechaLista: r.data.horaFechaLista,
      });
      if (r.data.configuracaoFinanceira) {
        const c = r.data.configuracaoFinanceira;
        setCfg({
          mensalistaValor: c.mensalistaValor,
          diaristaValor: c.diaristaValor,
          resenhaBebe: c.resenhaBebe,
          resenhaNaoBebe: c.resenhaNaoBebe,
          resenhaGoleiro: c.resenhaGoleiro,
          pontoPresenca: c.pontoPresenca,
          pontoVitoria: c.pontoVitoria,
          pontoGol: c.pontoGol,
          pontoDestaque: c.pontoDestaque,
          pontoAguaSalsicha: c.pontoAguaSalsicha,
        });
      }
    }).catch(() => {});
  }, [peladaId]);

  async function salvarFinanceiro(e: React.FormEvent) {
    e.preventDefault();
    setLoadingCfg(true);
    try {
      await api.put(`/peladas/${peladaId}/financeiro`, cfg);
      toast.success("Configurações financeiras salvas!");
    } catch (err: any) { toast.error(err.response?.data?.error || "Erro ao salvar"); }
    finally { setLoadingCfg(false); }
  }

  async function salvarPelada(e: React.FormEvent) {
    e.preventDefault();
    setLoadingPelada(true);
    try {
      await api.put(`/peladas/${peladaId}`, {
        horario: formPelada.horario,
        maxJogadores: Number(formPelada.maxJogadores),
        horaAbreLista: formPelada.horaAbreLista,
        horaFechaLista: formPelada.horaFechaLista,
      });
      toast.success("Configurações da pelada salvas!");
    } catch (err: any) { toast.error(err.response?.data?.error || "Erro ao salvar"); }
    finally { setLoadingPelada(false); }
  }

  function Campo({ label, campo, prefixo }: { label: string; campo: keyof ConfigFinanceira; prefixo?: string }) {
    return (
      <div className="space-y-1.5">
        <Label className="text-sm">{label}</Label>
        <div className="flex items-center gap-1.5">
          {prefixo && <span className="text-sm text-slate-500">{prefixo}</span>}
          <Input
            type="number"
            value={cfg[campo]}
            onChange={e => setCfg(c => ({ ...c, [campo]: Number(e.target.value) }))}
            className="w-28"
          />
        </div>
      </div>
    );
  }

  if (!peladaId) return <div className="flex items-center justify-center h-48 text-slate-400">Nenhuma pelada cadastrada</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Configurações</h1>
          <p className="text-slate-500 mt-1">Ajuste os parâmetros da pelada</p>
        </div>
        {peladas.length > 1 && (
          <Select value={peladaId} onValueChange={setPeladaId}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>{peladas.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
          </Select>
        )}
      </div>

      {/* Configurações da Pelada */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="w-4 h-4 text-slate-500" /> Configurações gerais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={salvarPelada} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Horário da pelada</Label>
                <Input type="time" value={formPelada.horario} onChange={e => setFormPelada(f => ({ ...f, horario: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Máx. jogadores</Label>
                <Input type="number" min="1" value={formPelada.maxJogadores} onChange={e => setFormPelada(f => ({ ...f, maxJogadores: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Abre lista (hora)</Label>
                <Input type="time" value={formPelada.horaAbreLista} onChange={e => setFormPelada(f => ({ ...f, horaAbreLista: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Fecha lista (hora)</Label>
                <Input type="time" value={formPelada.horaFechaLista} onChange={e => setFormPelada(f => ({ ...f, horaFechaLista: e.target.value }))} />
              </div>
            </div>
            <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={loadingPelada}>
              {loadingPelada ? "Salvando..." : "Salvar configurações gerais"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Valores financeiros */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">💰 Valores financeiros</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={salvarFinanceiro} className="space-y-5">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Mensalidade / Diária</p>
              <div className="flex flex-wrap gap-4">
                <Campo label="Mensalista (R$)" campo="mensalistaValor" prefixo="R$" />
                <Campo label="Diarista (R$)" campo="diaristaValor" prefixo="R$" />
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Resenha</p>
              <div className="flex flex-wrap gap-4">
                <Campo label="Bebe 🍺" campo="resenhaBebe" prefixo="R$" />
                <Campo label="Não bebe 🥤" campo="resenhaNaoBebe" prefixo="R$" />
                <Campo label="Goleiro 🥅" campo="resenhaGoleiro" prefixo="R$" />
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Pontuação</p>
              <div className="flex flex-wrap gap-4">
                <Campo label="Presença" campo="pontoPresenca" />
                <Campo label="Vitória" campo="pontoVitoria" />
                <Campo label="Gol" campo="pontoGol" />
                <Campo label="Destaque" campo="pontoDestaque" />
                <Campo label="Água de Salsicha" campo="pontoAguaSalsicha" />
              </div>
            </div>
            <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={loadingCfg}>
              {loadingCfg ? "Salvando..." : "Salvar valores financeiros"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
