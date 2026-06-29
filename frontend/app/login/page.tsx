"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await login(email, senha);
      if (result.tipo === "admin") {
        router.push("/dashboard");
      } else {
        const role = result.role;
        if (role === "ADMINISTRADOR") {
          router.push("/portal/agenda");
        } else if (role === "OPERADOR") {
          router.push("/portal/financeiro");
        } else {
          router.push("/portal/estatisticas");
        }
      }
    } catch {
      toast.error("E-mail ou senha incorretos");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-slate-100 p-4">
      <Card className="w-full max-w-md shadow-lg border-0">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center">
            <span className="text-3xl">⚽</span>
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">Pelada ADM</CardTitle>
          <CardDescription className="text-slate-500">Entre com sua conta para acessar o sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="senha">Senha</Label>
              <Input id="senha" type="password" placeholder="••••••••" value={senha} onChange={e => setSenha(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 h-11 text-base font-semibold" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
