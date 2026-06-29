"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, UserCheck, UserX, Shield, Users, Wrench } from "lucide-react";

interface Pelada { id: string; nome: string }
interface JogadorPelada { id: string; jogador: { nome: string } }
interface Usuario {
  id: string; nome: string; email: string; role: string; ativo: boolean;
  jogadorPelada: { id: string; jogador: { nome: string } } | null
}

const ROLE_LABEL: Record<string, string> = { ADMINISTRADOR: "Administrador", JOGADOR: "Jogador", OPERADOR: "Operador" };
const ROLE_ICON: Record<string, React.ReactNode> = {
  ADMINISTRADOR: <Shield className="w-3.5 h-3.5" />,
  OPERADOR: <Wrench className="w-3.5 h-3.5" />,
  JOGADOR: <Users className="w-3.5 h-3.5" />,
};
const ROLE_COLOR: Record<string, string> = {
  ADMINISTRADOR: "bg-purple-100 text-purple-700",
  OPERADOR: "bg-blue-100 text-blue-700",
  JOGADOR: "bg-green-100 text-green-700",
};

export default function UsuariosPage() {
  const [peladas, setPeladas] = useState<Pelada[]>([]);
  const [peladaId, setPeladaId] = useState("");
  const [jogadores, setJogadores] = useState<JogadorPelada[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<Usuario | null>(null);
  const [form, setForm] = useState({ nome: "", email: "", senha: "", role: "JOGADOR", jogadorPeladaId: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/peladas").then(r => {
      setPeladas(r.data);
      if (r.data.length > 0) setPeladaId(r.data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!peladaId) return;
    Promise.all([
      api.get(`/peladas/${peladaId}/usuarios`),
      api.get(`/peladas/${peladaId}/jogadores`),
    ]).then(([u, j]) => {
      setUsuarios(u.data);
      setJogadores(j.data);
    });
  }, [peladaId]);

  function resetForm() {
    setForm({ nome: "", email: "", senha: "", role: "JOGADOR", jogadorPeladaId: "" });
    setEditItem(null);
  }

  function openEdit(u: Usuario) {
    setEditItem(u);
    setForm({ nome: u.nome, email: u.email, senha: "", role: u.role, jogadorPeladaId: u.jogadorPelada?.id || "" });
    setOpen(true);
  }

  async function salvar() {
    if (!form.nome || !form.email || (!editItem && !form.senha) || !form.role) {
      toast.error("Preencha todos os campos obrigatórios"); return;
    }
    setLoading(true);
    try {
      const payload: Record<string, string> = { nome: form.nome, email: form.email, role: form.role, jogadorPeladaId: form.jogadorPeladaId };
      if (form.senha) payload.senha = form.senha;

      if (editItem) {
        await api.put(`/peladas/${peladaId}/usuarios/${editItem.id}`, payload);
        toast.success("Usuário atualizado!");
      } else {
        await api.post(`/peladas/${peladaId}/usuarios`, payload);
        toast.success("Usuário criado!");
      }
      setOpen(false);
      resetForm();
      const r = await api.get(`/peladas/${peladaId}/usuarios`);
      setUsuarios(r.data);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "Erro ao salvar");
    } finally { setLoading(false); }
  }

  async function toggleAtivo(u: Usuario) {
    try {
      await api.put(`/peladas/${peladaId}/usuarios/${u.id}`, { nome: u.nome, email: u.email, role: u.role, ativo: !u.ativo });
      const r = await api.get(`/peladas/${peladaId}/usuarios`);
      setUsuarios(r.data);
      toast.success(u.ativo ? "Usuário desativado" : "Usuário ativado");
    } catch { toast.error("Erro ao atualizar"); }
  }

  async function excluir(id: string) {
    if (!confirm("Excluir este usuário?")) return;
    try {
      await api.delete(`/peladas/${peladaId}/usuarios/${id}`);
      setUsuarios(prev => prev.filter(u => u.id !== id));
      toast.success("Usuário removido");
    } catch { toast.error("Erro ao remover"); }
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Usuários do Sistema</h1>
          <p className="text-sm text-slate-500 mt-1">Gerencie os acessos da sua pelada</p>
        </div>
        <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700"><Plus className="w-4 h-4 mr-2" />Novo usuário</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editItem ? "Editar usuário" : "Novo usuário"}</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-2">
              {peladas.length > 1 && (
                <div className="space-y-1">
                  <Label>Pelada</Label>
                  <Select value={peladaId} onValueChange={setPeladaId}>
                    <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>{peladas.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1">
                <Label>Nome *</Label>
                <Input placeholder="Nome completo" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>E-mail *</Label>
                <Input type="email" placeholder="email@exemplo.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Senha {editItem ? "(deixe em branco para não alterar)" : "*"}</Label>
                <Input type="password" placeholder="••••••••" value={form.senha} onChange={e => setForm(f => ({ ...f, senha: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Perfil *</Label>
                <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                  <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="JOGADOR">Jogador — Ver estatísticas e votar</SelectItem>
                    <SelectItem value="OPERADOR">Operador — Financeiro, gols e arte</SelectItem>
                    <SelectItem value="ADMINISTRADOR">Administrador — Acesso total</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(form.role === "JOGADOR") && (
                <div className="space-y-1">
                  <Label>Vincular ao atleta (opcional)</Label>
                  <Select value={form.jogadorPeladaId} onValueChange={v => setForm(f => ({ ...f, jogadorPeladaId: v }))}>
                    <SelectTrigger className="bg-white"><SelectValue placeholder="Selecione o atleta" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">— Nenhum —</SelectItem>
                      {jogadores.map(j => <SelectItem key={j.id} value={j.id}>{j.jogador.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-400">Vinculando ao atleta, o jogador verá seus dados individuais.</p>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={salvar} disabled={loading}>
                  {loading ? "Salvando..." : editItem ? "Salvar alterações" : "Criar usuário"}
                </Button>
                <Button variant="outline" onClick={() => { setOpen(false); resetForm(); }}>Cancelar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Seletor de pelada */}
      {peladas.length > 1 && (
        <div className="mb-4 max-w-xs">
          <Select value={peladaId} onValueChange={setPeladaId}>
            <SelectTrigger className="bg-white"><SelectValue placeholder="Selecione a pelada" /></SelectTrigger>
            <SelectContent>{peladas.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}

      {/* Info de perfis */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        {[
          { role: "JOGADOR", desc: "Estatísticas e votação (destaque / água de salsicha)", icon: <Users className="w-5 h-5 text-green-600" /> },
          { role: "OPERADOR", desc: "Financeiro, lançamento de gols e geração de arte", icon: <Wrench className="w-5 h-5 text-blue-600" /> },
          { role: "ADMINISTRADOR", desc: "Acesso total a todas as funcionalidades", icon: <Shield className="w-5 h-5 text-purple-600" /> },
        ].map(({ role, desc, icon }) => (
          <div key={role} className="bg-white border border-slate-100 rounded-xl p-3 flex gap-3">
            <div className="flex-shrink-0 mt-0.5">{icon}</div>
            <div>
              <p className="text-sm font-semibold text-slate-800">{ROLE_LABEL[role]}</p>
              <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Lista de usuários */}
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
        {usuarios.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <Users className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm">Nenhum usuário cadastrado para esta pelada.</p>
            <p className="text-xs mt-1">Clique em "Novo usuário" para começar.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Usuário</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">E-mail</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Perfil</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Atleta vinculado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {usuarios.map(u => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-green-700">{u.nome[0]?.toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{u.nome}</p>
                        {!u.ativo && <span className="text-xs text-red-500">Inativo</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLOR[u.role]}`}>
                      {ROLE_ICON[u.role]}{ROLE_LABEL[u.role]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs hidden md:table-cell">
                    {u.jogadorPelada ? u.jogadorPelada.jogador.nome : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => toggleAtivo(u)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors" title={u.ativo ? "Desativar" : "Ativar"}>
                        {u.ativo ? <UserCheck className="w-4 h-4 text-green-600" /> : <UserX className="w-4 h-4 text-red-400" />}
                      </button>
                      <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                        <Pencil className="w-4 h-4 text-slate-400" />
                      </button>
                      <button onClick={() => excluir(u.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
