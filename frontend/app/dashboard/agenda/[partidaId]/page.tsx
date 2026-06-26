"use client";
import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, UserCheck, Clock, Users, Bell, Trash2, DollarSign, Search } from "lucide-react";

interface Jogador { id: string; nome: string; fotoNormal: string | null; celular: string | null }
interface JogadorPelada { id: string; posicao: string; tipo: string; jogador: Jogador }
interface Presenca { id: string; status: string; posicaoFila: number | null; jogadorPelada: JogadorPelada }
interface Gol { id: string; jogadorPeladaId: string; jogadorPelada: { jogador: { nome: string } } }
interface Partida {
  id: string; data: string; status: string;
  presencas: Presenca[];
}

const STATUS_CORES: Record<string, string> = {
  AGENDADA: "bg-blue-100 text-blue-700",
  CONFIRMADA: "bg-green-100 text-green-700",
  REALIZADA: "bg-slate-100 text-slate-600",
  CANCELADA: "bg-red-100 text-red-600",
};

export default function PartidaPage() {
  const { partidaId } = useParams<{ partidaId: string }>();
  const searchParams = useSearchParams();
  const peladaId = searchParams.get("peladaId") || "";
  const router = useRouter();

  const [partida, setPartida] = useState<Partida | null>(null);
  const [jogadores, setJogadores] = useState<JogadorPelada[]>([]);
  const [jogadorSelecionado, setJogadorSelecionado] = useState("");
  const [loadingLembrete, setLoadingLembrete] = useState(false);
  const [gols, setGols] = useState<Gol[]>([]);
  const [buscaGol, setBuscaGol] = useState("");

  const load = () => {
    api.get(`/peladas/${peladaId}/partidas/${partidaId}`).then(r => setPartida(r.data)).catch(() => {});
  };
  const loadGols = () => {
    api.get(`/peladas/${peladaId}/partidas/${partidaId}/gols`).then(r => setGols(r.data)).catch(() => {});
  };

  useEffect(() => {
    if (!peladaId) return;
    load();
    loadGols();
    api.get(`/peladas/${peladaId}/jogadores`).then(r => setJogadores(r.data)).catch(() => {});
  }, [peladaId, partidaId]);

  async function confirmar() {
    if (!jogadorSelecionado) { toast.error("Selecione um jogador"); return; }
    try {
      const { data } = await api.post(`/peladas/${peladaId}/partidas/${partidaId}/presencas`, { jogadorPeladaId: jogadorSelecionado });
      if (data.status === "LISTA_ESPERA") toast.info(`Jogador na fila de espera — posição ${data.posicaoFila}`);
      else toast.success("Presença confirmada!");
      setJogadorSelecionado(""); load();
    } catch (e: any) { toast.error(e.response?.data?.error || "Erro ao confirmar"); }
  }

  async function remover(presencaId: string) {
    try {
      await api.delete(`/peladas/${peladaId}/partidas/${partidaId}/presencas/${presencaId}`);
      toast.success("Presença removida");
      load();
    } catch { toast.error("Erro ao remover"); }
  }

  async function atualizarStatus(status: string) {
    try {
      await api.put(`/peladas/${peladaId}/partidas/${partidaId}`, { status });
      toast.success("Status atualizado");
      load();
    } catch { toast.error("Erro ao atualizar status"); }
  }

  async function gerarDiaria() {
    try {
      const { data } = await api.post(`/peladas/${peladaId}/partidas/${partidaId}/diaria`);
      toast.success(`${data.criados} diária(s) gerada(s) no financeiro`);
    } catch { toast.error("Erro ao gerar diárias"); }
  }

  async function enviarLembretes() {
    setLoadingLembrete(true);
    try {
      const { data } = await api.post(`/peladas/${peladaId}/partidas/${partidaId}/lembretes`);
      toast.success(`${data.enviados} lembrete(s) enviado(s) por e-mail`);
    } catch { toast.error("Erro ao enviar lembretes (configure o SMTP no .env)"); }
    finally { setLoadingLembrete(false); }
  }

  async function registrarGol(jogadorPeladaId: string) {
    try {
      await api.post(`/peladas/${peladaId}/partidas/${partidaId}/gols`, { jogadorPeladaId });
      loadGols();
      toast.success("⚽ Gol registrado!");
    } catch { toast.error("Erro ao registrar gol"); }
  }

  async function removerGol(golId: string) {
    try {
      await api.delete(`/peladas/${peladaId}/partidas/${partidaId}/gols/${golId}`);
      loadGols();
    } catch { toast.error("Erro ao remover gol"); }
  }

  if (!partida) return (
    <div className="flex items-center justify-center h-48 text-slate-400">Carregando...</div>
  );

  const dt = new Date(partida.data);
  const confirmados = partida.presencas.filter(p => p.status === "CONFIRMADO");
  const listaEspera = partida.presencas.filter(p => p.status === "LISTA_ESPERA").sort((a, b) => (a.posicaoFila || 0) - (b.posicaoFila || 0));
  const goleiros = confirmados.filter(p => p.jogadorPelada.posicao === "GOLEIRO");
  const linha = confirmados.filter(p => p.jogadorPelada.posicao === "LINHA");
  const jogadoresDisponiveis = jogadores.filter(j => !partida.presencas.some(p => p.jogadorPelada.id === j.id));
  const podeRegistrar = partida.status !== "CANCELADA";

  // contagem de gols por jogadorPeladaId
  const golsPorJogador: Record<string, number> = {};
  for (const g of gols) {
    golsPorJogador[g.jogadorPeladaId] = (golsPorJogador[g.jogadorPeladaId] || 0) + 1;
  }

  const confirmadosOrdenados = [...confirmados].sort((a, b) =>
    a.jogadorPelada.jogador.nome.localeCompare(b.jogadorPelada.jogador.nome, "pt-BR")
  );
  const confirmadosFiltrados = buscaGol.trim()
    ? confirmadosOrdenados.filter(p =>
        p.jogadorPelada.jogador.nome.toLowerCase().includes(buscaGol.toLowerCase())
      )
    : confirmadosOrdenados;

  function Avatar({ nome, foto }: { nome: string; foto: string | null }) {
    if (foto) return <img src={`http://localhost:3001${foto}`} alt={nome} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />;
    return <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 text-green-700 font-bold text-sm">{nome[0].toUpperCase()}</div>;
  }

  function ListaPresenca({ titulo, lista, icon: Icon, cor }: { titulo: string; lista: Presenca[]; icon: any; cor: string }) {
    return (
      <div>
        <h3 className="text-sm font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
          <Icon className={`w-4 h-4 ${cor}`} /> {titulo} ({lista.length})
        </h3>
        {lista.length === 0 ? (
          <p className="text-sm text-slate-400 italic pl-1">Nenhum</p>
        ) : (
          <div className="space-y-1.5">
            {lista.map(p => (
              <div key={p.id} className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                <Avatar nome={p.jogadorPelada.jogador.nome} foto={p.jogadorPelada.jogador.fotoNormal} />
                <span className="text-sm font-medium text-slate-800 flex-1 truncate">{p.jogadorPelada.jogador.nome}</span>
                <Badge variant="outline" className="text-xs hidden sm:flex">{p.jogadorPelada.tipo === "MENSALISTA" ? "M" : "D"}</Badge>
                <button onClick={() => remover(p.id)} className="p-1 rounded hover:bg-red-50 hover:text-red-500 text-slate-300 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900">
            {dt.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-sm text-slate-500">{dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ml-1 ${STATUS_CORES[partida.status]}`}>{partida.status}</span>
          </div>
        </div>
      </div>

      {/* Ações */}
      <div className="flex flex-wrap gap-2">
        <Select onValueChange={atualizarStatus}>
          <SelectTrigger className="w-44 h-9"><SelectValue placeholder="Alterar status" /></SelectTrigger>
          <SelectContent>
            {["AGENDADA", "CONFIRMADA", "REALIZADA", "CANCELADA"].map(s => (
              <SelectItem key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {podeRegistrar && (
          <Button variant="outline" size="sm" className="gap-2 h-9" onClick={gerarDiaria}>
            <DollarSign className="w-3.5 h-3.5" /> Gerar diárias
          </Button>
        )}
        <Button variant="outline" size="sm" className="gap-2 h-9" onClick={enviarLembretes} disabled={loadingLembrete}>
          <Bell className="w-3.5 h-3.5" />
          {loadingLembrete ? "Enviando..." : "Enviar lembretes"}
        </Button>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Confirmados", value: confirmados.length, color: "text-green-600" },
          { label: "Goleiros", value: goleiros.length, color: "text-blue-600" },
          { label: "Fila de espera", value: listaEspera.length, color: "text-amber-600" },
        ].map(({ label, value, color }) => (
          <Card key={label} className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gols por atleta */}
      {podeRegistrar && confirmados.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">⚽ Gols por atleta</h3>
            {confirmados.length > 8 && (
              <div className="relative mb-3">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar atleta..."
                  value={buscaGol}
                  onChange={e => setBuscaGol(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300"
                />
              </div>
            )}
            <div className={`space-y-1.5 ${confirmados.length > 8 ? "max-h-80 overflow-y-auto pr-1" : ""}`}>
              {confirmadosFiltrados.map(p => {
                const qtd = golsPorJogador[p.jogadorPelada.id] || 0;
                const golsDoJogador = gols.filter(g => g.jogadorPeladaId === p.jogadorPelada.id);
                return (
                  <div key={p.id} className="flex items-center gap-3 py-1.5 border-b border-slate-50 last:border-0">
                    <Avatar nome={p.jogadorPelada.jogador.nome} foto={p.jogadorPelada.jogador.fotoNormal} />
                    <span className="text-sm font-medium text-slate-800 flex-1 truncate">{p.jogadorPelada.jogador.nome}</span>
                    {/* botão remover último gol */}
                    {qtd > 0 && (
                      <button
                        onClick={() => removerGol(golsDoJogador[golsDoJogador.length - 1].id)}
                        className="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:border-red-300 hover:text-red-500 transition-colors text-sm font-bold"
                      >
                        −
                      </button>
                    )}
                    <span className={`w-8 text-center font-bold text-lg ${qtd > 0 ? "text-green-600" : "text-slate-300"}`}>{qtd}</span>
                    {/* botão adicionar gol */}
                    <button
                      onClick={() => registrarGol(p.jogadorPelada.id)}
                      className="w-7 h-7 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center text-white text-sm font-bold transition-colors"
                    >
                      +
                    </button>
                  </div>
                );
              })}
            </div>
            {buscaGol && confirmadosFiltrados.length === 0 && (
              <p className="text-sm text-slate-400 italic text-center py-2">Nenhum atleta encontrado</p>
            )}
            {gols.length > 0 && (
              <p className="text-xs text-slate-400 mt-3 text-right">Total: {gols.length} gol{gols.length !== 1 ? "s" : ""}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Confirmar presença */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Confirmar presença</h3>
          <div className="flex gap-2">
            <Select value={jogadorSelecionado} onValueChange={setJogadorSelecionado}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="Selecionar jogador..." /></SelectTrigger>
              <SelectContent>
                {jogadoresDisponiveis.map(j => (
                  <SelectItem key={j.id} value={j.id}>
                    {j.jogador.nome} {j.posicao === "GOLEIRO" ? "🥅" : ""} ({j.tipo === "MENSALISTA" ? "Mensalista" : "Diarista"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="bg-green-600 hover:bg-green-700 px-5" onClick={confirmar}>
              <UserCheck className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Listas */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 space-y-4">
            <ListaPresenca titulo="Goleiros confirmados" lista={goleiros} icon={Users} cor="text-blue-500" />
            <ListaPresenca titulo="Jogadores de linha" lista={linha} icon={UserCheck} cor="text-green-500" />
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-500" /> Fila de espera ({listaEspera.length})
            </h3>
            {listaEspera.length === 0 ? (
              <p className="text-sm text-slate-400 italic">Nenhum na fila</p>
            ) : (
              <div className="space-y-1.5">
                {listaEspera.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-2.5 p-2 rounded-lg bg-amber-50">
                    <span className="w-6 h-6 rounded-full bg-amber-200 text-amber-800 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                    <Avatar nome={p.jogadorPelada.jogador.nome} foto={p.jogadorPelada.jogador.fotoNormal} />
                    <span className="text-sm font-medium text-slate-800 flex-1 truncate">{p.jogadorPelada.jogador.nome}</span>
                    <button onClick={() => remover(p.id)} className="p-1 rounded hover:bg-red-50 hover:text-red-500 text-slate-300 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
