"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, FileCheck } from "lucide-react";
import { toast } from "sonner";

interface Pagamento {
  id: string; mes: number; ano: number; valor: number; pago: boolean; comprovante?: string | null; dataPagamento: string | null;
  jogadorPelada: { jogador: { nome: string; fotoNormal: string | null } };
}
interface Resumo {
  mes: number; ano: number;
  mensalidades: { total: number; recebido: number; pendente: number; total_jogadores: number; pagos: number };
  diarias: { total: number; recebido: number; pendente: number; total_jogadores: number; pagos: number };
  resenha: { total: number; recebido: number; pendente: number; total_jogadores: number; pagos: number };
}
interface Pelada { id: string; nome: string }

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
function fmtBRL(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

export default function FinanceiroPage() {
  const [peladas, setPeladas] = useState<Pelada[]>([]);
  const [peladaId, setPeladaId] = useState("");
  const agora = new Date();
  const [filtroMes, setFiltroMes] = useState(agora.getMonth() + 1);
  const [filtroAno, setFiltroAno] = useState(agora.getFullYear());
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [mensalidades, setMensalidades] = useState<Pagamento[]>([]);
  const [diarias, setDiarias] = useState<Pagamento[]>([]);
  const [inadimplentes, setInadimplentes] = useState<Pagamento[]>([]);

  useEffect(() => {
    api.get("/peladas").then(r => { setPeladas(r.data); if (r.data.length) setPeladaId(r.data[0].id); });
  }, []);

  const loadAll = () => {
    if (!peladaId) return;
    const p = `mes=${filtroMes}&ano=${filtroAno}`;
    api.get(`/peladas/${peladaId}/financeiro/resumo?${p}`).then(r => setResumo(r.data)).catch(() => {});
    api.get(`/peladas/${peladaId}/financeiro/mensalidades?${p}`).then(r => setMensalidades(r.data)).catch(() => {});
    api.get(`/peladas/${peladaId}/financeiro/diarias?${p}`).then(r => setDiarias(r.data)).catch(() => {});
    api.get(`/peladas/${peladaId}/financeiro/inadimplentes?${p}`).then(r => setInadimplentes(r.data)).catch(() => {});
  };

  useEffect(() => { loadAll(); }, [peladaId, filtroMes, filtroAno]);

  async function gerarMensalidades() {
    try {
      const { data } = await api.post(`/peladas/${peladaId}/financeiro/mensalidades/gerar`, { mes: filtroMes, ano: filtroAno });
      toast.success(`${data.criados} mensalidade(s) gerada(s)`);
      loadAll();
    } catch (e: any) { toast.error(e.response?.data?.error || "Erro ao gerar mensalidades"); }
  }

  async function togglePago(tipo: "mensalidade" | "diaria", id: string, pago: boolean) {
    const endpoint = tipo === "mensalidade"
      ? `/peladas/${peladaId}/financeiro/mensalidades/${id}`
      : `/peladas/${peladaId}/financeiro/diarias/${id}`;
    try {
      await api.patch(endpoint, { pago: !pago });
      loadAll();
    } catch { toast.error("Erro ao atualizar"); }
  }

  function Avatar({ nome, foto }: { nome: string; foto: string | null }) {
    if (foto) return <img src={`http://localhost:3001${foto}`} alt={nome} className="w-8 h-8 rounded-full object-cover" />;
    return <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm">{nome[0].toUpperCase()}</div>;
  }

  function PagamentoRow({ p, tipo }: { p: Pagamento; tipo: "mensalidade" | "diaria" }) {
    return (
      <div className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
        <Avatar nome={p.jogadorPelada.jogador.nome} foto={p.jogadorPelada.jogador.fotoNormal} />
        <div className="flex-1 min-w-0">
          <span className="block text-sm font-medium text-slate-800 truncate">{p.jogadorPelada.jogador.nome}</span>
          {p.comprovante && (
            <a href={`http://localhost:3001${p.comprovante}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-green-700 hover:underline">
              <FileCheck className="w-3.5 h-3.5" /> Ver comprovante
            </a>
          )}
        </div>
        <span className="text-sm text-slate-500">{fmtBRL(p.valor)}</span>
        <button onClick={() => togglePago(tipo, p.id, p.pago)}
          className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium transition-colors
            ${p.pago ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-red-50 text-red-600 hover:bg-red-100"}`}>
          {p.pago ? <><CheckCircle className="w-3.5 h-3.5" /> Pago</> : <><XCircle className="w-3.5 h-3.5" /> Pendente</>}
        </button>
      </div>
    );
  }

  const anos = [filtroAno - 1, filtroAno, filtroAno + 1];

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Financeiro</h1>
          <p className="text-slate-500 mt-1">Mensalidades e diárias</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {peladas.length > 1 && (
            <Select value={peladaId} onValueChange={setPeladaId}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>{peladas.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
            </Select>
          )}
          <Select value={String(filtroMes)} onValueChange={v => setFiltroMes(Number(v))}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>{MESES.map((m, i) => <SelectItem key={i+1} value={String(i+1)}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={String(filtroAno)} onValueChange={v => setFiltroAno(Number(v))}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>{anos.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {resumo && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Mensalidades", data: resumo.mensalidades },
            { label: "Diárias", data: resumo.diarias },
            { label: "Resenha", data: resumo.resenha },
          ].map(({ label, data }) => (
            <Card key={label} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">{label}</p>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Total previsto</span>
                    <span className="font-semibold">{fmtBRL(data.total)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600">Recebido</span>
                    <span className="text-green-700 font-semibold">{fmtBRL(data.recebido)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-red-500">Pendente</span>
                    <span className="text-red-600 font-semibold">{fmtBRL(data.pendente)}</span>
                  </div>
                  <div className="pt-1 border-t border-slate-100 flex justify-between text-xs text-slate-400">
                    <span>{data.pagos}/{data.total_jogadores} pagos</span>
                    <span>{data.total_jogadores > 0 ? Math.round(data.pagos / data.total_jogadores * 100) : 0}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Tabs defaultValue="mensalidades">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="mensalidades">Mensalidades</TabsTrigger>
          <TabsTrigger value="diarias">Diárias</TabsTrigger>
          <TabsTrigger value="inadimplentes">
            Inadimplentes
            {inadimplentes.length > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">{inadimplentes.length}</span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mensalidades" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Mensalidades — {MESES[filtroMes-1]}/{filtroAno}</CardTitle>
                <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={gerarMensalidades}>
                  <RefreshCw className="w-3.5 h-3.5" /> Gerar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {mensalidades.length === 0 ? (
                <p className="text-sm text-slate-400 italic py-4 text-center">Nenhuma mensalidade. Clique em "Gerar" para criar.</p>
              ) : (
                mensalidades.map(p => <PagamentoRow key={p.id} p={p} tipo="mensalidade" />)
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="diarias" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Diárias — {MESES[filtroMes-1]}/{filtroAno}</CardTitle>
            </CardHeader>
            <CardContent>
              {diarias.length === 0 ? (
                <p className="text-sm text-slate-400 italic py-4 text-center">
                  Nenhuma diária registrada. As diárias são geradas na página de cada partida.
                </p>
              ) : (
                diarias.map(p => <PagamentoRow key={p.id} p={p} tipo="diaria" />)
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inadimplentes" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <CardTitle className="text-base">Inadimplentes — {MESES[filtroMes-1]}/{filtroAno}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {inadimplentes.length === 0 ? (
                <p className="text-sm text-slate-400 italic py-4 text-center">Nenhum inadimplente neste período. 🎉</p>
              ) : (
                inadimplentes.map(p => (
                  <div key={p.id} className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
                    <Avatar nome={p.jogadorPelada.jogador.nome} foto={p.jogadorPelada.jogador.fotoNormal} />
                    <span className="flex-1 text-sm font-medium text-slate-800 truncate">{p.jogadorPelada.jogador.nome}</span>
                    <Badge variant="outline" className="text-red-600 border-red-200">{fmtBRL(p.valor)}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
