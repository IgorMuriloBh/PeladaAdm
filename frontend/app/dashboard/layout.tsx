"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { admin, tipo, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!admin && tipo !== "admin") {
      // Usuário portal tentou acessar /dashboard → redireciona
      if (tipo === "usuario") router.replace("/portal");
      else router.replace("/login");
    }
  }, [admin, tipo, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <img src="/logo.png" alt="Pelada ADM" className="w-10 h-10 rounded-full object-cover animate-pulse" />
          <p className="text-sm text-slate-500">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!admin) return null;

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <MobileNav />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
