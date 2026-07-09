"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { QrCode, Copy, Check, Loader2 } from "lucide-react";

interface ChavePix { id: string; tipo: string; valor: string | null; imagem: string | null; descricao: string | null }

const BASE = "http://localhost:3001";
const PIX_LABEL: Record<string, string> = {
  TELEFONE: "Telefone", CPF_CNPJ: "CPF/CNPJ", EMAIL: "E-mail", ALEATORIA: "Chave aleatória", QRCODE: "QR Code",
};

export default function PortalPixPage() {
  const { usuario } = useAuth();
  const [chaves, setChaves] = useState<ChavePix[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  useEffect(() => {
    if (!usuario) return;
    api.get("/portal/pix").then(r => setChaves(r.data)).catch(() => setChaves([])).finally(() => setLoading(false));
  }, [usuario]);

  async function copiar(c: ChavePix) {
    if (!c.valor) return;
    try {
      await navigator.clipboard.writeText(c.valor);
      setCopiadoId(c.id);
      toast.success("Chave copiada! Cole no app do seu banco.");
      setTimeout(() => setCopiadoId(null), 2000);
    } catch {
      toast.error("Não foi possível copiar");
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-slate-900 mb-1">PIX</h1>
      <p className="text-sm text-slate-500 mb-4">Chaves para pagamento — {usuario?.pelada.nome}</p>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : chaves.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <QrCode className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nenhuma chave PIX cadastrada.<br />Fale com o administrador da pelada.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {chaves.map(c => (
            <div key={c.id} className="bg-white border border-slate-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-2">
                {PIX_LABEL[c.tipo]}{c.descricao ? ` · ${c.descricao}` : ""}
              </p>

              {c.tipo === "QRCODE" && c.imagem ? (
                <div className="flex flex-col items-center">
                  <img src={`${BASE}${c.imagem}`} alt="QR Code PIX" className="w-56 h-56 object-contain rounded-lg border border-slate-100" />
                  <p className="text-xs text-slate-400 mt-2">Escaneie o QR Code no app do seu banco</p>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0 bg-slate-50 rounded-lg px-3 py-2.5">
                    <p className="text-sm font-medium text-slate-800 break-all">{c.valor}</p>
                  </div>
                  <button
                    onClick={() => copiar(c)}
                    className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors shrink-0 ${copiadoId === c.id ? "bg-green-100 text-green-700" : "bg-green-600 text-white hover:bg-green-700"}`}
                  >
                    {copiadoId === c.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copiadoId === c.id ? "Copiado" : "Copiar"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
