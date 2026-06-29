"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "./api";

// Tipos
interface Admin { id: string; nome: string; email: string }
interface Pelada { id: string; nome: string; slug: string; logo: string | null; corPrimaria: string }
interface JogadorPelada { id: string; posicao: string; nivel: number; jogador: { nome: string; fotoNormal: string | null } }
interface Usuario { id: string; nome: string; email: string; role: string; pelada: Pelada; jogadorPelada: JogadorPelada | null }

interface AuthCtx {
  // Admin (dono da pelada)
  admin: Admin | null;
  // Usuario (jogador/operador/administrador)
  usuario: Usuario | null;
  // Genérico
  token: string | null;
  tipo: "admin" | "usuario" | null;
  loading: boolean;
  login: (email: string, senha: string) => Promise<{ tipo: "admin" | "usuario"; role?: string }>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx>({} as AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [tipo, setTipo] = useState<"admin" | "usuario" | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem("token");
    const tp = localStorage.getItem("tipo") as "admin" | "usuario" | null;
    if (t && tp) {
      setToken(t);
      setTipo(tp);
      if (tp === "admin") {
        api.get("/auth/me")
          .then(r => setAdmin(r.data))
          .catch(() => { localStorage.removeItem("token"); localStorage.removeItem("tipo"); })
          .finally(() => setLoading(false));
      } else {
        api.get("/auth/usuario/me")
          .then(r => setUsuario(r.data))
          .catch(() => { localStorage.removeItem("token"); localStorage.removeItem("tipo"); })
          .finally(() => setLoading(false));
      }
    } else {
      setLoading(false);
    }
  }, []);

  async function login(email: string, senha: string): Promise<{ tipo: "admin" | "usuario"; role?: string }> {
    // Tenta admin primeiro
    try {
      const { data } = await api.post("/auth/login", { email, senha });
      localStorage.setItem("token", data.token);
      localStorage.setItem("tipo", "admin");
      setToken(data.token);
      setTipo("admin");
      setAdmin(data.admin);
      setUsuario(null);
      return { tipo: "admin" };
    } catch {
      // Tenta usuario (jogador/operador/administrador)
      const { data } = await api.post("/auth/usuario/login", { email, senha });
      localStorage.setItem("token", data.token);
      localStorage.setItem("tipo", "usuario");
      setToken(data.token);
      setTipo("usuario");
      setUsuario(data.usuario);
      setAdmin(null);
      return { tipo: "usuario", role: data.usuario.role };
    }
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("tipo");
    setToken(null);
    setTipo(null);
    setAdmin(null);
    setUsuario(null);
    window.location.href = "/login";
  }

  return (
    <Ctx.Provider value={{ admin, usuario, token, tipo, loading, login, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
