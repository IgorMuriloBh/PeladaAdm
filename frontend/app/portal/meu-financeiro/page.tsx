"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { CheckCircle2, Clock, Copy, Check, Loader2, QrCode } from "lucide-react";

interface Item {
  id: string; tipo: string; descricao: string; categoria?: string;
  valor: number; pago: boolean; dataPagamento: string | null;
}
interface Financeiro {
  tipo: string; // MENSALISTA | DIARISTA
  valores: { mensalista: number; diarista: number; resenhaBebe: number; resenhaNaoBebe: number; resenhaGoleiro: number };
  pendentes: Item[];
  realizados: Item[];
}
interface ChavePix { id: string; tipo: string; valor: string | null; imagem: string | null; descricao: string | null }

const BASE = "http://localhost:3001";
const PIX_LABEL: Record<string, string> = { TELEFONE: "Telefone", CPF_CNPJ: "CPF/CNPJ", EMAIL: "E-mail", ALEATORIA: "Chave aleatória", QRCODE: "QR Code" };
const TIPO_BADGE: Record<string, string> = {
  MENSALIDADE: "bg-purple-100 text-purple-700",
  DIARIA: "bg-blue-100 text-blue-700",
  RESENHA: "bg-orange-100 text-orange-700",
};
const TIPO_LABEL: Record<string, string> = { MENSALIDADE: "Mensalidade", DIARIA: "Diária", RESENHA: "Resenha" };

export default function PortalMeuFinanceiroPage() {
  const { usuario } = useAuth();
  const [tab, setTab] = useState<"pendentes" | "realizados">("pendentes");
  const [dados, setDados] = useState<Financeiro | null>(null);
  const [chaves, setChaves] = useState<ChavePix[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  useEffect(() => {
    if (!usuario) return;
    Promise.all([
      api.get("/portal/meu-financeiro"),
      api.get("/portal/pix").catch(() => ({ data: [] })),
    ]).then(([f, p]) => { setDados(f.data); setChaves(p.data); })
      .catch(() => setDados(null))
      .finally(() => setLoading(false));
  }, [usuario]);

  async function copiar(c: ChavePix) {
    if (!c.valor) return;
    try {
      await navigator.clipboard.writeText(c.valor);
      setCopiadoId(c.id);
      toast.success("Chave copiada!");
      setTimeout(() => setCopiadoId(null), 2000);
    } catch { toast.error("Não foi possível copiar"); }
  }

  const money = (v: number) => `R$ ${v.toFixed(2)}`;

  if (loading) return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto flex items-center justify-center py-16 text-slate-400">
      <Loader2 className="w-6 h-6 animate-spin" />
    </div>
  );

  if (!dados) return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto text-center py-12 text-slate-400 text-sm">
      Seu usuário não está vinculado a um jogador. Fale com o administrador.
    </div>
  );

  const isMensalista = dados.tipo === "MENSALISTA";
  const lista = tab === "pendentes" ? dados.pendentes : dados.realizados;

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-slate-900 mb-1">Financeiro</h1>
      <p className="text-sm text-slate-500 mb-4">Seus pagamentos — {usuario?.pelada.nome}</p>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {([
          { key: "pendentes", label: `Pendentes${dados.pendentes.length ? ` (${dados.pendentes.length})` : ""}` },
          { key: "realizados", label: "Realizados" },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? "bg-green-600 text-white" : "bg-white text-slate-600 border border-slate-200"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Lista de pagamentos */}
      <div className="space-y-2">
        {lista.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">
            {tab === "pendentes" ? (
              <><CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-300" /><p>Você está em dia! Nenhum pagamento pendente.</p></>
            ) : (
              <p>Nenhum pagamento realizado ainda.</p>
            )}
          </div>
        ) : lista.map(item => (
          <div key={item.id} className="bg-white border border-slate-100 rounded-xl p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${TIPO_BADGE[item.tipo]}`}>{TIPO_LABEL[item.tipo]}</span>
                <p className="font-medium text-slate-800 text-sm truncate">{item.descricao}</p>
              </div>
              <p className="text-xs text-slate-400">
                {item.categoria ? `${item.categoria} · ` : ""}{money(item.valor)}
                {item.pago && item.dataPagamento ? ` · pago em ${new Date(item.dataPagamento).toLocaleDateString("pt-BR")}` : ""}
              </p>
            </div>
            {item.pago ? (
              <span className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-lg"><CheckCircle2 className="w-3.5 h-3.5" /> Pago</span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-100 px-2 py-1 rounded-lg"><Clock className="w-3.5 h-3.5" /> Pendente</span>
            )}
          </div>
        ))}
      </div>

      {/* Somente na aba pendentes: chaves PIX + tabela de valores */}
      {tab === "pendentes" && (
        <>
          {/* Chaves PIX */}
          <div className="mt-6 bg-white border border-slate-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <QrCode className="w-4 h-4 text-green-600" />
              <p className="text-sm font-semibold text-slate-700">Pague via PIX</p>
            </div>
            {chaves.length === 0 ? (
              <p className="text-sm text-slate-400">Nenhuma chave PIX cadastrada.</p>
            ) : (
              <div className="space-y-2">
                {chaves.map(c => (
                  <div key={c.id}>
                    <p className="text-xs font-semibold text-slate-500 mb-1">{PIX_LABEL[c.tipo]}{c.descricao ? ` · ${c.descricao}` : ""}</p>
                    {c.tipo === "QRCODE" && c.imagem ? (
                      <img src={`${BASE}${c.imagem}`} alt="QR Code PIX" className="w-44 h-44 object-contain rounded-lg border border-slate-100" />
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0 bg-slate-50 rounded-lg px-3 py-2"><p className="text-sm font-medium text-slate-800 break-all">{c.valor}</p></div>
                        <button onClick={() => copiar(c)}
                          className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium shrink-0 transition-colors ${copiadoId === c.id ? "bg-green-100 text-green-700" : "bg-green-600 text-white hover:bg-green-700"}`}>
                          {copiadoId === c.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiadoId === c.id ? "Copiado" : "Copiar"}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tabela de valores */}
          <div className="mt-4 bg-white border border-slate-100 rounded-xl p-4">
            <p className="text-sm font-semibold text-slate-700 mb-3">Tabela de valores</p>
            <div className="space-y-1.5 text-sm">
              {isMensalista ? (
                <div className="flex justify-between"><span className="text-slate-500">Mensalidade (mensalista)</span><span className="font-medium text-slate-800">{money(dados.valores.mensalista)}</span></div>
              ) : (
                <div className="flex justify-between"><span className="text-slate-500">Diária (diarista)</span><span className="font-medium text-slate-800">{money(dados.valores.diarista)}</span></div>
              )}
              <div className="border-t border-slate-100 my-2" />
              <p className="text-xs font-semibold text-slate-400 uppercase">Resenha</p>
              <div className="flex justify-between"><span className="text-slate-500">Bebe 🍺</span><span className="font-medium text-slate-800">{money(dados.valores.resenhaBebe)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Não bebe 🥤</span><span className="font-medium text-slate-800">{money(dados.valores.resenhaNaoBebe)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Goleiro 🥅</span><span className="font-medium text-slate-800">{money(dados.valores.resenhaGoleiro)}</span></div>
            </div>
          </div>

          <p className="text-xs text-slate-400 text-center mt-4">
            Após pagar, o operador ou administrador confirma o pagamento e ele passa para "Realizados".
          </p>
        </>
      )}
    </div>
  );
}
