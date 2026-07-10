"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { BarChart3, Star, DollarSign, Target, ImagePlay, CalendarDays, CalendarCheck, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";

// Definição de navegação por role
const NAV_JOGADOR = [
  { href: "/portal/peladas", label: "Peladas", icon: CalendarCheck },
  { href: "/portal/estatisticas", label: "Estatísticas", icon: BarChart3 },
  { href: "/portal/votacao", label: "Votação", icon: Star },
  { href: "/portal/meu-financeiro", label: "Financeiro", icon: DollarSign },
];

const NAV_OPERADOR = [
  { href: "/portal/financeiro", label: "Financeiro", icon: DollarSign },
  { href: "/portal/gols", label: "Lançar Gols", icon: Target },
  { href: "/portal/votacao", label: "Votação", icon: Star },
  { href: "/portal/arte", label: "Arte Instagram", icon: ImagePlay },
  { href: "/portal/estatisticas", label: "Estatísticas", icon: BarChart3 },
];

const NAV_ADMINISTRADOR = [
  { href: "/portal/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/portal/peladas", label: "Peladas", icon: CalendarCheck },
  { href: "/portal/financeiro", label: "Financeiro", icon: DollarSign },
  { href: "/portal/gols", label: "Lançar Gols", icon: Target },
  { href: "/portal/arte", label: "Arte Instagram", icon: ImagePlay },
  { href: "/portal/estatisticas", label: "Estatísticas", icon: BarChart3 },
  { href: "/portal/votacao", label: "Votação", icon: Star },
];

function getNav(role: string) {
  if (role === "ADMINISTRADOR") return NAV_ADMINISTRADOR;
  if (role === "OPERADOR") return NAV_OPERADOR;
  return NAV_JOGADOR;
}

const ROLE_BADGE: Record<string, string> = {
  ADMINISTRADOR: "bg-purple-100 text-purple-700",
  OPERADOR: "bg-blue-100 text-blue-700",
  JOGADOR: "bg-green-100 text-green-700",
};

const ROLE_LABEL: Record<string, string> = {
  ADMINISTRADOR: "Administrador",
  OPERADOR: "Operador",
  JOGADOR: "Jogador",
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { usuario, loading, tipo, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && tipo !== "usuario") {
      router.push("/login");
    }
    // Senha padrão ainda não trocada — força criação da senha pessoal
    if (!loading && (usuario as any)?.precisaTrocarSenha) {
      router.push("/trocar-senha");
    }
  }, [loading, tipo, usuario, router]);

  if (loading || !usuario) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><p className="text-slate-400">Carregando...</p></div>;
  }

  const nav = getNav(usuario.role);
  const pelada = usuario.pelada;

  const NavItems = () => (
    <>
      {nav.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              active ? "bg-green-50 text-green-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <Icon className={cn("w-4 h-4", active ? "text-green-600" : "text-slate-400")} />
            {label}
          </Link>
        );
      })}
    </>
  );

  const UserSection = () => (
    <div className="px-3 py-4 border-t border-slate-100">
      <div className="px-3 py-2 mb-2">
        <p className="text-sm font-semibold text-slate-900 truncate">{usuario.nome}</p>
        <span className={cn("inline-block text-xs font-medium px-2 py-0.5 rounded-full mt-1", ROLE_BADGE[usuario.role])}>
          {ROLE_LABEL[usuario.role]}
        </span>
      </div>
      <button
        onClick={logout}
        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
      >
        <LogOut className="w-4 h-4" />
        Sair
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 h-screen sticky top-0">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
          <img src="/logo.png" alt="Pelada ADM" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
          <div>
            <p className="font-bold text-slate-900 text-sm leading-tight">Pelada ADM</p>
            <p className="text-xs text-slate-400 truncate max-w-[140px]">{pelada.nome}</p>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <NavItems />
        </nav>
        <UserSection />
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-slate-200 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Pelada ADM" className="w-8 h-8 rounded-full object-cover" />
          <span className="font-bold text-slate-900 text-sm">{pelada.nome}</span>
        </div>
        <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg hover:bg-slate-100">
          <Menu className="w-5 h-5 text-slate-700" />
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="relative w-72 bg-white h-full flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100">
              <span className="font-bold text-slate-900">Menu</span>
              <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
              <NavItems />
            </nav>
            <UserSection />
          </div>
        </div>
      )}

      {/* Content */}
      <main className="flex-1 min-w-0 md:pt-0 pt-14">
        {children}
      </main>
    </div>
  );
}
