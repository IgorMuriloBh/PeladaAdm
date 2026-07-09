"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Settings, Bell, DollarSign, FileSpreadsheet, Download, Upload, QrCode, Trash2, Plus } from "lucide-react";

interface ConfigFinanceira {
  mensalistaValor: number; diaristaValor: number;
  resenhaBebe: number; resenhaNaoBebe: number; resenhaGoleiro: number;
  pontoPresenca: number; pontoVitoria: number; pontoGol: number;
  pontoDestaque: number; pontoAguaSalsicha: number;
  criarResenhaComPelada: boolean;
}
interface ConfigAlerta {
  ativo: boolean; smtpHost: string; smtpPort: number; smtpUser: string; smtpPass: string;
  emailRemetente: string; nomeRemetente: string;
  alertaNovaPartida: boolean; alertaEncerramentoPelada: boolean;
}
interface Pelada { id: string; nome: string; horario: string; maxJogadores: number; horaAbreLista: string; horaFechaLista: string }

const TAB_LABELS = [
  { key: "geral", label: "Geral", icon: Settings },
  { key: "financeiro", label: "Financeiro", icon: DollarSign },
  { key: "alertas", label: "Alertas", icon: Bell },
  { key: "pix", label: "PIX", icon: QrCode },
  { key: "importar", label: "Importar", icon: FileSpreadsheet },
] as const;
type Tab = "geral" | "financeiro" | "alertas" | "pix" | "importar";

interface ResultadoImportacao {
  processados: number; jogadoresCriados: number; usuariosCriados: number;
  presencasLancadas: number; golsLancados: number; destaquesLancados: number; aguasLancadas: number;
  erros: string[];
}

interface ChavePix {
  id: string; tipo: string; valor: string | null; imagem: string | null; descricao: string | null;
}
const PIX_TIPOS = [
  { value: "TELEFONE", label: "Telefone" },
  { value: "CPF_CNPJ", label: "CPF/CNPJ" },
  { value: "EMAIL", label: "E-mail" },
  { value: "ALEATORIA", label: "Chave aleatória" },
  { value: "QRCODE", label: "QR Code (imagem)" },
];
const PIX_LABEL: Record<string, string> = Object.fromEntries(PIX_TIPOS.map(t => [t.value, t.label]));

export default function ConfiguracoesPage() {
  const [peladas, setPeladas] = useState<Pelada[]>([]);
  const [peladaId, setPeladaId] = useState("");
  const [tab, setTab] = useState<Tab>("geral");
  const [cfg, setCfg] = useState<ConfigFinanceira>({
    mensalistaValor: 90, diaristaValor: 30,
    resenhaBebe: 85, resenhaNaoBebe: 40, resenhaGoleiro: 40,
    pontoPresenca: 1, pontoVitoria: 3, pontoGol: 1, pontoDestaque: 5, pontoAguaSalsicha: -3,
    criarResenhaComPelada: false,
  });
  const [formPelada, setFormPelada] = useState({ horario: "", maxJogadores: "", horaAbreLista: "", horaFechaLista: "", senhaPadrao: "senha001" });
  const [arquivoImport, setArquivoImport] = useState<File | null>(null);
  const [loadingImport, setLoadingImport] = useState(false);
  const [resultadoImport, setResultadoImport] = useState<ResultadoImportacao | null>(null);
  const [alertaCfg, setAlertaCfg] = useState<ConfigAlerta>({
    ativo: false, smtpHost: "", smtpPort: 587, smtpUser: "", smtpPass: "",
    emailRemetente: "", nomeRemetente: "Pelada ADM",
    alertaNovaPartida: true, alertaEncerramentoPelada: true,
  });
  const [emailTeste, setEmailTeste] = useState("");
  const [loadingCfg, setLoadingCfg] = useState(false);
  const [loadingPelada, setLoadingPelada] = useState(false);
  const [loadingAlerta, setLoadingAlerta] = useState(false);
  const [loadingTeste, setLoadingTeste] = useState(false);
  // PIX
  const [chavesPix, setChavesPix] = useState<ChavePix[]>([]);
  const [pixTipo, setPixTipo] = useState("TELEFONE");
  const [pixValor, setPixValor] = useState("");
  const [pixDescricao, setPixDescricao] = useState("");
  const [pixImagem, setPixImagem] = useState<File | null>(null);
  const [loadingPix, setLoadingPix] = useState(false);

  useEffect(() => {
    api.get("/peladas").then(r => { setPeladas(r.data); if (r.data.length) setPeladaId(r.data[0].id); });
  }, []);

  useEffect(() => {
    if (!peladaId) return;
    api.get(`/peladas/${peladaId}`).then(r => {
      setFormPelada({ horario: r.data.horario, maxJogadores: String(r.data.maxJogadores), horaAbreLista: r.data.horaAbreLista, horaFechaLista: r.data.horaFechaLista, senhaPadrao: r.data.senhaPadrao || "senha001" });
      if (r.data.configuracaoFinanceira) {
        const c = r.data.configuracaoFinanceira;
        setCfg({ mensalistaValor: c.mensalistaValor, diaristaValor: c.diaristaValor, resenhaBebe: c.resenhaBebe, resenhaNaoBebe: c.resenhaNaoBebe, resenhaGoleiro: c.resenhaGoleiro, pontoPresenca: c.pontoPresenca, pontoVitoria: c.pontoVitoria, pontoGol: c.pontoGol, pontoDestaque: c.pontoDestaque, pontoAguaSalsicha: c.pontoAguaSalsicha, criarResenhaComPelada: !!c.criarResenhaComPelada });
      }
    }).catch(() => {});
    api.get(`/peladas/${peladaId}/alertas`).then(r => setAlertaCfg(r.data)).catch(() => {});
    api.get(`/peladas/${peladaId}/pix`).then(r => setChavesPix(r.data)).catch(() => {});
  }, [peladaId]);

  async function adicionarPix(e: React.FormEvent) {
    e.preventDefault();
    if (pixTipo === "QRCODE" && !pixImagem) { toast.error("Envie a imagem do QR Code"); return; }
    if (pixTipo !== "QRCODE" && !pixValor.trim()) { toast.error("Informe o valor da chave"); return; }
    setLoadingPix(true);
    try {
      const fd = new FormData();
      fd.append("tipo", pixTipo);
      if (pixDescricao.trim()) fd.append("descricao", pixDescricao.trim());
      if (pixTipo === "QRCODE") fd.append("imagem", pixImagem as File);
      else fd.append("valor", pixValor.trim());
      await api.post(`/peladas/${peladaId}/pix`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      const r = await api.get(`/peladas/${peladaId}/pix`);
      setChavesPix(r.data);
      setPixValor(""); setPixDescricao(""); setPixImagem(null);
      toast.success("Chave PIX adicionada!");
    } catch (err: any) { toast.error(err.response?.data?.error || "Erro ao adicionar chave"); }
    finally { setLoadingPix(false); }
  }

  async function removerPix(id: string) {
    try {
      await api.delete(`/peladas/${peladaId}/pix/${id}`);
      setChavesPix(cs => cs.filter(c => c.id !== id));
      toast.success("Chave removida");
    } catch { toast.error("Erro ao remover chave"); }
  }

  async function salvarFinanceiro(e: React.FormEvent) {
    e.preventDefault();
    setLoadingCfg(true);
    try { await api.put(`/peladas/${peladaId}/financeiro`, cfg); toast.success("Valores financeiros salvos!"); }
    catch (err: any) { toast.error(err.response?.data?.error || "Erro ao salvar"); }
    finally { setLoadingCfg(false); }
  }

  async function salvarPelada(e: React.FormEvent) {
    e.preventDefault();
    setLoadingPelada(true);
    try { await api.put(`/peladas/${peladaId}`, { horario: formPelada.horario, maxJogadores: Number(formPelada.maxJogadores), horaAbreLista: formPelada.horaAbreLista, horaFechaLista: formPelada.horaFechaLista, senhaPadrao: formPelada.senhaPadrao.trim() }); toast.success("Configurações gerais salvas!"); }
    catch (err: any) { toast.error(err.response?.data?.error || "Erro ao salvar"); }
    finally { setLoadingPelada(false); }
  }

  async function baixarModelo() {
    try {
      const r = await api.get(`/peladas/${peladaId}/importacao/modelo`, { responseType: "blob" });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = "modelo-importacao-jogadores.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error("Erro ao baixar modelo"); }
  }

  async function importarPlanilha() {
    if (!arquivoImport) { toast.error("Selecione o arquivo da planilha"); return; }
    setLoadingImport(true);
    setResultadoImport(null);
    try {
      const fd = new FormData();
      fd.append("planilha", arquivoImport);
      const r = await api.post(`/peladas/${peladaId}/importacao`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      setResultadoImport(r.data);
      if (r.data.erros.length === 0) toast.success(`Importação concluída: ${r.data.processados} jogadores processados!`);
      else toast.warning(`Importação com ${r.data.erros.length} erro(s). Veja os detalhes abaixo.`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro ao importar planilha");
    } finally { setLoadingImport(false); }
  }

  async function salvarAlerta(e: React.FormEvent) {
    e.preventDefault();
    setLoadingAlerta(true);
    // Trim preventivo em todos os campos de texto
    const payload = {
      ...alertaCfg,
      smtpHost: alertaCfg.smtpHost.trim(),
      smtpUser: alertaCfg.smtpUser.trim(),
      smtpPass: alertaCfg.smtpPass.trim(),
      emailRemetente: alertaCfg.emailRemetente.trim(),
      nomeRemetente: alertaCfg.nomeRemetente.trim(),
    };
    try { await api.put(`/peladas/${peladaId}/alertas`, payload); toast.success("Configuração de alertas salva!"); }
    catch (err: any) { toast.error(err.response?.data?.error || "Erro ao salvar"); }
    finally { setLoadingAlerta(false); }
  }

  async function testarEmail() {
    if (!emailTeste) { toast.error("Informe um email para teste"); return; }
    setLoadingTeste(true);
    try {
      await api.post(`/peladas/${peladaId}/alertas/testar`, { emailDestino: emailTeste });
      toast.success("Email de teste enviado com sucesso! Verifique a caixa de entrada.");
    } catch (err: any) {
      const msg = err.response?.data?.error || "Erro ao enviar email de teste";
      const detalhe = err.response?.data?.detalhe;
      toast.error(msg, { description: detalhe ? `Detalhe: ${detalhe}` : undefined, duration: 8000 });
    }
    finally { setLoadingTeste(false); }
  }

  function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
      <button type="button" onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${checked ? "bg-green-600" : "bg-slate-200"}`}>
        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    );
  }

  type CampoNumerico = { [K in keyof ConfigFinanceira]: ConfigFinanceira[K] extends number ? K : never }[keyof ConfigFinanceira];
  function Campo({ label, campo, prefixo }: { label: string; campo: CampoNumerico; prefixo?: string }) {
    return (
      <div className="space-y-1.5">
        <Label className="text-sm">{label}</Label>
        <div className="flex items-center gap-1.5">
          {prefixo && <span className="text-sm text-slate-500">{prefixo}</span>}
          <Input type="number" value={cfg[campo]} onChange={e => setCfg(c => ({ ...c, [campo]: Number(e.target.value) }))} className="w-28" />
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

      {/* Tabs */}
      <div className="flex gap-2">
        {TAB_LABELS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === key ? "bg-green-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:border-green-300"}`}>
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>

      {/* ── Aba Geral ──────────────────────────────────────────────────────── */}
      {tab === "geral" && (
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-5">
            <form onSubmit={salvarPelada} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Horário da pelada</Label><Input type="time" value={formPelada.horario} onChange={e => setFormPelada(f => ({ ...f, horario: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label>Máx. jogadores</Label><Input type="number" min="1" value={formPelada.maxJogadores} onChange={e => setFormPelada(f => ({ ...f, maxJogadores: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label>Abre lista</Label><Input type="time" value={formPelada.horaAbreLista} onChange={e => setFormPelada(f => ({ ...f, horaAbreLista: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label>Fecha lista</Label><Input type="time" value={formPelada.horaFechaLista} onChange={e => setFormPelada(f => ({ ...f, horaFechaLista: e.target.value }))} /></div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Senha padrão para novos usuários</Label>
                  <Input value={formPelada.senhaPadrao} onChange={e => setFormPelada(f => ({ ...f, senhaPadrao: e.target.value }))} placeholder="senha001" />
                  <p className="text-xs text-slate-400">Atribuída automaticamente a novos usuários. No primeiro login, o sistema obriga a criação de uma senha pessoal.</p>
                </div>
              </div>
              <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={loadingPelada}>{loadingPelada ? "Salvando..." : "Salvar configurações gerais"}</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ── Aba Financeiro ─────────────────────────────────────────────────── */}
      {tab === "financeiro" && (
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-5">
            <form onSubmit={salvarFinanceiro} className="space-y-5">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Mensalidade / Diária</p>
                <div className="flex flex-wrap gap-4"><Campo label="Mensalista" campo="mensalistaValor" prefixo="R$" /><Campo label="Diarista" campo="diaristaValor" prefixo="R$" /></div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Resenha</p>
                <div className="flex flex-wrap gap-4"><Campo label="Bebe 🍺" campo="resenhaBebe" prefixo="R$" /><Campo label="Não bebe 🥤" campo="resenhaNaoBebe" prefixo="R$" /><Campo label="Goleiro 🥅" campo="resenhaGoleiro" prefixo="R$" /></div>
                <div className="flex items-center justify-between bg-slate-50 rounded-lg p-3 mt-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">Criar resenha junto com a pelada</p>
                    <p className="text-xs text-slate-400 mt-0.5">Ao confirmar a pelada, gera a resenha automaticamente já listando todos os confirmados</p>
                  </div>
                  <Toggle checked={cfg.criarResenhaComPelada} onChange={v => setCfg(c => ({ ...c, criarResenhaComPelada: v }))} />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Pontuação do ranking</p>
                <div className="flex flex-wrap gap-4"><Campo label="Presença" campo="pontoPresenca" /><Campo label="Vitória" campo="pontoVitoria" /><Campo label="Gol" campo="pontoGol" /><Campo label="Destaque" campo="pontoDestaque" /><Campo label="Água de Salsicha" campo="pontoAguaSalsicha" /></div>
              </div>
              <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={loadingCfg}>{loadingCfg ? "Salvando..." : "Salvar valores"}</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ── Aba Alertas ────────────────────────────────────────────────────── */}
      {tab === "alertas" && (
        <form onSubmit={salvarAlerta} className="space-y-4">
          {/* Ativar alertas */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Bell className="w-4 h-4 text-slate-500" /> Alertas por email</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-800">Ativar sistema de alertas</p>
                  <p className="text-xs text-slate-400 mt-0.5">Habilita o envio de emails automáticos aos jogadores</p>
                </div>
                <Toggle checked={alertaCfg.ativo} onChange={v => setAlertaCfg(a => ({ ...a, ativo: v }))} />
              </div>

              {alertaCfg.ativo && (
                <div className="border-t pt-4 space-y-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Tipos de alerta</p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Toggle checked={alertaCfg.alertaNovaPartida} onChange={v => setAlertaCfg(a => ({ ...a, alertaNovaPartida: v }))} />
                      <div>
                        <p className="text-sm font-medium text-slate-800">Nova pelada marcada / Lista aberta</p>
                        <p className="text-xs text-slate-400 mt-0.5">Envia email aos mensalistas ativos e adimplentes com link para confirmar presença e interesse na resenha</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Toggle checked={alertaCfg.alertaEncerramentoPelada} onChange={v => setAlertaCfg(a => ({ ...a, alertaEncerramentoPelada: v }))} />
                      <div>
                        <p className="text-sm font-medium text-slate-800">Encerramento da pelada</p>
                        <p className="text-xs text-slate-400 mt-0.5">Ao encerrar a pelada, envia para todos os presentes o destaque, água de salsicha e ranking de artilharia</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Configuração SMTP */}
          {alertaCfg.ativo && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">⚙️ Configuração SMTP</CardTitle>
                <p className="text-xs text-slate-400">Configure o servidor de email para envio dos alertas. Compatível com Gmail, Outlook, SendGrid, etc.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <Label className="text-xs">Nome do remetente</Label>
                    <Input placeholder="Pelada ADM" value={alertaCfg.nomeRemetente} onChange={e => setAlertaCfg(a => ({ ...a, nomeRemetente: e.target.value }))} />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label className="text-xs">Email remetente (exibido no "De:")</Label>
                    <Input type="email" placeholder="noreply@suapelada.com" value={alertaCfg.emailRemetente} onChange={e => setAlertaCfg(a => ({ ...a, emailRemetente: e.target.value }))} />
                    <p className="text-xs text-slate-400">Deixe em branco para usar o email de autenticação SMTP</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Host SMTP</Label>
                    <Input placeholder="smtp.gmail.com" value={alertaCfg.smtpHost} onChange={e => setAlertaCfg(a => ({ ...a, smtpHost: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Porta</Label>
                    <Input type="number" placeholder="587" value={alertaCfg.smtpPort} onChange={e => setAlertaCfg(a => ({ ...a, smtpPort: Number(e.target.value) }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Usuário (email)</Label>
                    <Input type="email" placeholder="seu@gmail.com" value={alertaCfg.smtpUser} onChange={e => setAlertaCfg(a => ({ ...a, smtpUser: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Senha / App Password</Label>
                    <Input type="password" placeholder="••••••••" value={alertaCfg.smtpPass} onChange={e => setAlertaCfg(a => ({ ...a, smtpPass: e.target.value }))} />
                  </div>
                </div>

                {/* Dica Gmail */}
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-blue-700 mb-1">💡 Usando Gmail?</p>
                  <p className="text-xs text-blue-600">Host: <code>smtp.gmail.com</code> · Porta: <code>587</code><br />Use uma <strong>Senha de App</strong> (não sua senha normal): Conta Google → Segurança → Senhas de app</p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2">
            <Button type="submit" className="bg-green-600 hover:bg-green-700 flex-1" disabled={loadingAlerta}>
              {loadingAlerta ? "Salvando..." : "Salvar configuração de alertas"}
            </Button>
          </div>

          {/* Teste de email */}
          {alertaCfg.ativo && (
            <Card className="border-0 shadow-sm border-dashed border border-slate-200">
              <CardContent className="pt-4">
                <p className="text-sm font-medium text-slate-800 mb-3">📧 Testar configuração</p>
                <div className="flex gap-2">
                  <Input type="email" placeholder="email@teste.com" value={emailTeste} onChange={e => setEmailTeste(e.target.value)} className="flex-1" />
                  <Button type="button" variant="outline" onClick={testarEmail} disabled={loadingTeste}>
                    {loadingTeste ? "Enviando..." : "Enviar teste"}
                  </Button>
                </div>
                <p className="text-xs text-slate-400 mt-2">Salve as configurações antes de testar</p>
              </CardContent>
            </Card>
          )}
        </form>
      )}

      {/* ── Aba PIX ─────────────────────────────────────────────────────────── */}
      {tab === "pix" && (
        <div className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><QrCode className="w-4 h-4 text-slate-500" /> Chaves PIX</CardTitle>
              <p className="text-xs text-slate-400">As chaves cadastradas aqui ficam visíveis para os jogadores no menu PIX, para facilitar os pagamentos.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Form nova chave */}
              <form onSubmit={adicionarPix} className="bg-slate-50 rounded-lg p-4 space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tipo de chave</Label>
                    <Select value={pixTipo} onValueChange={v => { setPixTipo(v); setPixValor(""); setPixImagem(null); }}>
                      <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PIX_TIPOS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Descrição (opcional)</Label>
                    <Input placeholder="Ex: Conta do tesoureiro" value={pixDescricao} onChange={e => setPixDescricao(e.target.value)} className="bg-white" />
                  </div>
                </div>

                {pixTipo === "QRCODE" ? (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Imagem do QR Code</Label>
                    <input type="file" accept="image/*" onChange={e => setPixImagem(e.target.files?.[0] || null)}
                      className="w-full text-sm text-slate-600 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-green-50 file:text-green-700 file:text-xs file:font-semibold file:cursor-pointer border border-slate-200 rounded-lg p-1.5 bg-white" />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label className="text-xs">
                      {pixTipo === "TELEFONE" ? "Telefone" : pixTipo === "CPF_CNPJ" ? "CPF ou CNPJ" : pixTipo === "EMAIL" ? "E-mail" : "Chave aleatória"}
                    </Label>
                    <Input
                      value={pixValor} onChange={e => setPixValor(e.target.value)} className="bg-white"
                      placeholder={pixTipo === "TELEFONE" ? "+55 31 99999-9999" : pixTipo === "CPF_CNPJ" ? "000.000.000-00" : pixTipo === "EMAIL" ? "pix@email.com" : "chave-aleatoria-uuid"}
                    />
                  </div>
                )}

                <Button type="submit" className="bg-green-600 hover:bg-green-700 gap-2" disabled={loadingPix}>
                  <Plus className="w-4 h-4" /> {loadingPix ? "Adicionando..." : "Adicionar chave"}
                </Button>
              </form>

              {/* Lista de chaves */}
              {chavesPix.length === 0 ? (
                <p className="text-center text-slate-400 py-6 text-sm">Nenhuma chave PIX cadastrada.</p>
              ) : (
                <div className="space-y-2">
                  {chavesPix.map(c => (
                    <div key={c.id} className="flex items-center gap-3 border border-slate-100 rounded-xl p-3">
                      {c.tipo === "QRCODE" && c.imagem ? (
                        <img src={`http://localhost:3001${c.imagem}`} alt="QR Code" className="w-12 h-12 rounded object-cover border border-slate-100" />
                      ) : (
                        <div className="w-12 h-12 rounded bg-green-50 flex items-center justify-center flex-shrink-0">
                          <QrCode className="w-5 h-5 text-green-600" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500">{PIX_LABEL[c.tipo]}{c.descricao ? ` · ${c.descricao}` : ""}</p>
                        <p className="text-sm font-medium text-slate-800 truncate">{c.tipo === "QRCODE" ? "Imagem do QR Code" : c.valor}</p>
                      </div>
                      <button onClick={() => removerPix(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Aba Importar ───────────────────────────────────────────────────── */}
      {tab === "importar" && (
        <div className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-slate-500" /> Importação de jogadores em massa
              </CardTitle>
              <p className="text-xs text-slate-400">
                Importe uma planilha com os jogadores e o histórico do ano (gols, destaques e águas de salsicha).
                O histórico é lançado em uma pelada com data 01/01 do ano corrente.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Passo 1: baixar modelo */}
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm font-semibold text-slate-700 mb-1">1. Baixe o modelo padrão</p>
                <p className="text-xs text-slate-400 mb-3">Use este modelo como base. Colunas: Nome, Email, Celular, Tipo (MENSALISTA/DIARISTA), Posicao (LINHA/GOLEIRO), Presenca, Gols, Destaques, AguaSalsicha.</p>
                <Button type="button" variant="outline" onClick={baixarModelo} className="gap-2">
                  <Download className="w-4 h-4" /> Baixar modelo (.xlsx)
                </Button>
              </div>

              {/* Passo 2: enviar planilha */}
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm font-semibold text-slate-700 mb-1">2. Envie a planilha preenchida</p>
                <p className="text-xs text-slate-400 mb-3">
                  Jogadores não cadastrados serão criados automaticamente com usuário e senha padrão ({formPelada.senhaPadrao || "senha001"}).
                  Re-importar a mesma planilha atualiza o histórico sem duplicar.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="file" accept=".xlsx,.xls,.csv"
                    onChange={e => setArquivoImport(e.target.files?.[0] || null)}
                    className="flex-1 text-sm text-slate-600 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-green-50 file:text-green-700 file:text-xs file:font-semibold file:cursor-pointer border border-slate-200 rounded-lg p-1.5 bg-white"
                  />
                  <Button type="button" onClick={importarPlanilha} disabled={loadingImport || !arquivoImport} className="bg-green-600 hover:bg-green-700 gap-2">
                    <Upload className="w-4 h-4" /> {loadingImport ? "Importando..." : "Importar"}
                  </Button>
                </div>
              </div>

              {/* Resultado */}
              {resultadoImport && (
                <div className="border border-slate-200 rounded-lg p-4 space-y-3">
                  <p className="text-sm font-semibold text-slate-700">Resultado da importação</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { label: "Processados", valor: resultadoImport.processados, cor: "text-green-600" },
                      { label: "Jogadores criados", valor: resultadoImport.jogadoresCriados, cor: "text-blue-600" },
                      { label: "Usuários criados", valor: resultadoImport.usuariosCriados, cor: "text-purple-600" },
                      { label: "Presenças lançadas", valor: resultadoImport.presencasLancadas, cor: "text-blue-600" },
                      { label: "Gols lançados", valor: resultadoImport.golsLancados, cor: "text-slate-700" },
                      { label: "Destaques", valor: resultadoImport.destaquesLancados, cor: "text-amber-600" },
                      { label: "Águas de salsicha", valor: resultadoImport.aguasLancadas, cor: "text-orange-600" },
                    ].map(({ label, valor, cor }) => (
                      <div key={label} className="bg-slate-50 rounded-lg p-3 text-center">
                        <p className={`text-xl font-bold ${cor}`}>{valor}</p>
                        <p className="text-xs text-slate-400">{label}</p>
                      </div>
                    ))}
                  </div>
                  {resultadoImport.erros.length > 0 && (
                    <div className="bg-red-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-red-600 mb-1.5">⚠️ Erros ({resultadoImport.erros.length}):</p>
                      <ul className="text-xs text-red-500 space-y-0.5 max-h-32 overflow-y-auto">
                        {resultadoImport.erros.map((erro, i) => <li key={i}>• {erro}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
