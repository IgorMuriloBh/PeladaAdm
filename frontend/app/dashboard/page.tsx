"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, DollarSign, Trophy } from "lucide-react";
import Link from "next/link";

interface Pelada { id: string; nome: string; slug: string; corPrimaria: string; ativa: boolean; _count: { jogadores: number } }

export default function DashboardPage() {
  const { admin } = useAuth();
  const [peladas, setPeladas] = useState<Pelada[]>([]);

  useEffect(() => {
    api.get("/peladas").then(r => setPeladas(r.data)).catch(() => {});
  }, []);

  const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Olá, {admin?.nome?.split(" ")[0]} 👋</h1>
        <p className="text-slate-500 mt-1">Bem-vindo ao Pelada ADM. Gerencie suas peladas aqui.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Peladas ativas", value: peladas.filter(p => p.ativa).length, icon: Calendar, color: "text-green-600", bg: "bg-green-50" },
          { label: "Total de jogadores", value: peladas.reduce((a, p) => a + p._count.jogadores, 0), icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Módulo financeiro", value: "—", icon: DollarSign, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Rankings", value: "—", icon: Trophy, color: "text-purple-600", bg: "bg-purple-50" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <p className="text-2xl font-bold text-slate-900">{value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Peladas */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Suas Peladas</h2>
          <Link href="/dashboard/peladas" className="text-sm text-green-600 hover:text-green-700 font-medium">Ver todas →</Link>
        </div>

        {peladas.length === 0 ? (
          <Card className="border-0 shadow-sm border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mb-4">
                <span className="text-3xl">⚽</span>
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">Nenhuma pelada ainda</h3>
              <p className="text-sm text-slate-500 mb-4">Crie sua primeira pelada para começar</p>
              <Link
                href="/dashboard/peladas"
                className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
              >
                Criar Pelada
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {peladas.map((p) => (
              <Link key={p.id} href={`/dashboard/peladas/${p.id}`}>
                <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: p.corPrimaria + "20" }}>
                          ⚽
                        </div>
                        <div>
                          <CardTitle className="text-base text-slate-900">{p.nome}</CardTitle>
                          <p className="text-xs text-slate-400 mt-0.5">/{p.slug}</p>
                        </div>
                      </div>
                      <Badge variant={p.ativa ? "default" : "secondary"} className={p.ativa ? "bg-green-100 text-green-700 hover:bg-green-100" : ""}>
                        {p.ativa ? "Ativa" : "Inativa"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between text-sm text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        {p._count.jogadores} jogadores
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
