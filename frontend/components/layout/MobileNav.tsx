"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Menu, X, LayoutDashboard, Users, CalendarDays, DollarSign, BarChart3, Star, Settings, LogOut, Utensils, Tv2, ImagePlay, UserCog } from "lucide-react";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/peladas", label: "Peladas", icon: Tv2 },
  { href: "/dashboard/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/dashboard/jogadores", label: "Jogadores", icon: Users },
  { href: "/dashboard/usuarios", label: "Usuários", icon: UserCog },
  { href: "/dashboard/financeiro", label: "Financeiro", icon: DollarSign },
  { href: "/dashboard/resenha", label: "Resenha", icon: Utensils },
  { href: "/dashboard/estatisticas", label: "Estatísticas", icon: BarChart3 },
  { href: "/dashboard/destaques", label: "Destaques", icon: Star },
  { href: "/dashboard/arte", label: "Arte Instagram", icon: ImagePlay },
  { href: "/dashboard/configuracoes", label: "Configurações", icon: Settings },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { admin, logout } = useAuth();

  return (
    <>
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Pelada ADM" className="w-8 h-8 rounded-full object-cover" />
          <span className="font-bold text-slate-900">Pelada ADM</span>
        </div>
        <button onClick={() => setOpen(true)} className="p-2 rounded-lg hover:bg-slate-100">
          <Menu className="w-5 h-5 text-slate-700" />
        </button>
      </header>

      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative w-72 bg-white h-full flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="Pelada ADM" className="w-8 h-8 rounded-full object-cover" />
                <span className="font-bold text-slate-900">Pelada ADM</span>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
              {nav.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors",
                      active ? "bg-green-50 text-green-700" : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <Icon className={cn("w-4 h-4", active ? "text-green-600" : "text-slate-400")} />
                    {label}
                  </Link>
                );
              })}
            </nav>
            <div className="px-3 py-4 border-t border-slate-100">
              <div className="flex items-center gap-3 px-3 py-2 mb-1">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold text-green-700">{admin?.nome?.[0]?.toUpperCase()}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{admin?.nome}</p>
                </div>
              </div>
              <button onClick={logout} className="flex items-center gap-3 w-full px-3 py-3 rounded-lg text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors">
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
