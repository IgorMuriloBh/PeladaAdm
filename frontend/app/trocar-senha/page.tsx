"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";

export default function TrocarSenhaPage() {
  const { usuario } = useAuth();
  const router = useRouter();
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (novaSenha.length < 6) { toast.error("A nova senha deve ter pelo menos 6 caracteres"); return; }
    if (novaSenha !== confirmacao) { toast.error("A confirmação não confere com a nova senha"); return; }
    if (novaSenha === senhaAtual) { toast.error("A nova senha deve ser diferente da atual"); return; }

    setLoading(true);
    try {
      await api.post("/auth/usuario/trocar-senha", { senhaAtual, novaSenha });
      toast.success("Senha atualizada com sucesso!");
      // Redireciona conforme o perfil
      const role = usuario?.role;
      if (role === "ADMINISTRADOR") router.push("/portal/agenda");
      else if (role === "OPERADOR") router.push("/portal/financeiro");
      else router.push("/portal/estatisticas");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro ao trocar senha");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-slate-100 p-4">
      <Card className="w-full max-w-md shadow-lg border-0">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center">
            <KeyRound className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">Criar nova senha</CardTitle>
          <CardDescription className="text-slate-500">
            Por segurança, você precisa criar sua senha pessoal antes de acessar o sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="senhaAtual">Senha atual (senha padrão recebida)</Label>
              <Input id="senhaAtual" type="password" placeholder="••••••••" value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="novaSenha">Nova senha</Label>
              <Input id="novaSenha" type="password" placeholder="Mínimo 6 caracteres" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} required minLength={6} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmacao">Confirmar nova senha</Label>
              <Input id="confirmacao" type="password" placeholder="Repita a nova senha" value={confirmacao} onChange={e => setConfirmacao(e.target.value)} required minLength={6} />
            </div>
            <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 h-11 text-base font-semibold" disabled={loading}>
              {loading ? "Salvando..." : "Salvar nova senha"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
