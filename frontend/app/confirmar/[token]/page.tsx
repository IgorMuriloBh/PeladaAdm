"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface DadosToken {
  jogadorNome: string;
  peladaNome: string;
  corPrimaria: string;
  corTexto: string;
  data: string;
  horario: string;
  usado: boolean;
  respostaAtual: {
    status: string;
    interesseResenha: boolean | null;
    categoriaResenha: string | null;
  } | null;
}

const CAT_LABEL: Record<string, string> = { BEBE: "Bebo 🍺", NAO_BEBE: "Não bebo 🥤", GOLEIRO_BEBE: "Goleiro/Bebo 🥅" };

export default function ConfirmarPresencaPage() {
  const { token } = useParams<{ token: string }>();
  const [dados, setDados] = useState<DadosToken | null>(null);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [confirmado, setConfirmado] = useState(false);

  // Seleções do jogador
  const [presenca, setPresenca] = useState<"CONFIRMADO" | "AUSENTE" | null>(null);
  const [resenha, setResenha] = useState<boolean | null>(null);
  const [categoria, setCategoria] = useState<string | null>(null);

  useEffect(() => {
    api.get(`/confirmar/${token}`)
      .then(r => {
        setDados(r.data);
        // Pré-preenche se já respondeu
        if (r.data.respostaAtual) {
          setPresenca(r.data.respostaAtual.status);
          setResenha(r.data.respostaAtual.interesseResenha);
          setCategoria(r.data.respostaAtual.categoriaResenha);
        }
      })
      .catch(e => setErro(e.response?.data?.error || "Link inválido ou expirado"))
      .finally(() => setLoading(false));
  }, [token]);

  async function confirmar() {
    if (presenca === null) { toast.error("Confirme se vai ou não à pelada"); return; }
    if (presenca === "CONFIRMADO" && resenha === null) { toast.error("Informe se vai participar da resenha"); return; }
    if (presenca === "CONFIRMADO" && resenha === true && !categoria) { toast.error("Informe se vai beber na resenha"); return; }

    setSalvando(true);
    try {
      await api.post(`/confirmar/${token}`, {
        presenca,
        interesseResenha: presenca === "CONFIRMADO" ? resenha : false,
        categoriaResenha: presenca === "CONFIRMADO" && resenha ? categoria : null,
      });
      setConfirmado(true);
      toast.success("Resposta enviada com sucesso!");
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "Erro ao enviar resposta");
    } finally {
      setSalvando(false);
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 animate-spin text-green-600" />
    </div>
  );

  if (erro) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white rounded-2xl shadow-sm p-8 max-w-sm w-full text-center">
        <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <h2 className="font-bold text-slate-800 text-lg mb-1">Link inválido</h2>
        <p className="text-slate-500 text-sm">{erro}</p>
      </div>
    </div>
  );

  if (!dados) return null;

  const dataFormatada = new Date(dados.data).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });

  if (confirmado) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white rounded-2xl shadow-sm p-8 max-w-sm w-full text-center">
        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
        <h2 className="font-bold text-slate-800 text-lg mb-1">Resposta registrada!</h2>
        <p className="text-slate-500 text-sm">
          {presenca === "CONFIRMADO"
            ? `Ótimo, ${dados.jogadorNome.split(" ")[0]}! Até ${dataFormatada} 🎉`
            : `Tudo bem, ${dados.jogadorNome.split(" ")[0]}. Quem sabe na próxima!`}
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm w-full max-w-sm overflow-hidden">
        {/* Header com cor da pelada */}
        <div style={{ background: dados.corPrimaria }} className="p-6 text-center">
          <span className="text-4xl">⚽</span>
          <h1 className="font-bold text-lg mt-2" style={{ color: dados.corTexto }}>{dados.peladaNome}</h1>
          <p className="text-sm mt-1 opacity-80" style={{ color: dados.corTexto }}>{dataFormatada} às {dados.horario}</p>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <p className="text-slate-500 text-sm mb-1">Olá, <strong>{dados.jogadorNome}</strong>!</p>
            <p className="text-slate-700 text-sm">Você vai à pelada?</p>
          </div>

          {/* Presença */}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => { setPresenca("CONFIRMADO"); if (resenha === null) {} }}
              className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all ${presenca === "CONFIRMADO" ? "border-green-500 bg-green-50 text-green-700" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}>
              ✅ Vou!
            </button>
            <button onClick={() => { setPresenca("AUSENTE"); setResenha(null); setCategoria(null); }}
              className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all ${presenca === "AUSENTE" ? "border-red-400 bg-red-50 text-red-600" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}>
              ❌ Não vou
            </button>
          </div>

          {/* Resenha — só aparece se confirmou presença */}
          {presenca === "CONFIRMADO" && (
            <div className="space-y-3 border-t pt-4">
              <p className="text-slate-700 text-sm font-medium">Vai na resenha depois da pelada?</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => { setResenha(true); }}
                  className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${resenha === true ? "border-green-500 bg-green-50 text-green-700" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}>
                  🍻 Vou!
                </button>
                <button onClick={() => { setResenha(false); setCategoria(null); }}
                  className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${resenha === false ? "border-slate-400 bg-slate-50 text-slate-600" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}>
                  👋 Não vou
                </button>
              </div>

              {/* Categoria — só aparece se confirmou resenha */}
              {resenha === true && (
                <div className="space-y-2 border-t pt-3">
                  <p className="text-slate-700 text-sm font-medium">Categoria na resenha:</p>
                  <div className="space-y-2">
                    {(["BEBE", "NAO_BEBE", "GOLEIRO_BEBE"] as const).map(cat => (
                      <button key={cat} onClick={() => setCategoria(cat)}
                        className={`w-full py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${categoria === cat ? "border-green-500 bg-green-50 text-green-700" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}>
                        {CAT_LABEL[cat]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <button onClick={confirmar} disabled={salvando}
            className="w-full py-3 rounded-xl text-sm font-bold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors">
            {salvando ? "Enviando..." : "Confirmar resposta"}
          </button>

          {dados.respostaAtual && (
            <p className="text-center text-xs text-slate-400">Você já respondeu antes — pode alterar sua resposta.</p>
          )}
        </div>
      </div>
    </div>
  );
}
