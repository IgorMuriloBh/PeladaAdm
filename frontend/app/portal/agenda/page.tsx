"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { CalendarDays } from "lucide-react";

interface Partida {
  id: string;
  data: string;
  status: string;
  _count?: { presencas: number };
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  AGENDADA:     { label: "Agendada",     color: "bg-slate-100 text-slate-600" },
  CONFIRMADA:   { label: "Confirmada",   color: "bg-blue-100 text-blue-700" },
  EM_ANDAMENTO: { label: "Em andamento", color: "bg-orange-100 text-orange-700" },
  REALIZADA:    { label: "Realizada",    color: "bg-green-100 text-green-700" },
  CANCELADA:    { label: "Cancelada",    color: "bg-red-100 text-red-700" },
};

export default function PortalAgendaPage() {
  const { usuario } = useAuth();
  const [partidas, setPartidas] = useState<Partida[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!usuario) return;
    api.get("/portal/partidas").then(r => setPartidas(r.data)).finally(() => setLoading(false));
  }, [usuario]);

  function formatData(d: string) {
    return new Date(d).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-slate-900 mb-1">Agenda</h1>
      <p className="text-sm text-slate-500 mb-4">{usuario?.pelada.nome}</p>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Carregando...</div>
      ) : partidas.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>Nenhuma partida agendada.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {partidas.map(p => {
            const st = STATUS_LABEL[p.status] || { label: p.status, color: "bg-slate-100 text-slate-600" };
            return (
              <div key={p.id} className="bg-white border border-slate-100 rounded-xl p-3 flex items-center gap-3">
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CalendarDays className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 text-sm">{formatData(p.data)}</p>
                  {p._count && <p className="text-xs text-slate-400">{p._count.presencas} confirmados</p>}
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${st.color}`}>{st.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
