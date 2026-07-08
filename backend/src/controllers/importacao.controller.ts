import { Response } from "express";
import bcrypt from "bcryptjs";
import * as XLSX from "xlsx";
import { AuthRequest } from "../middlewares/auth";
import { prisma } from "../lib/prisma";

// Colunas do modelo padrão
const COLUNAS = ["Nome", "Email", "Celular", "Tipo", "Posicao", "Presenca", "Gols", "Destaques", "AguaSalsicha"] as const;

// ── Download do modelo ──────────────────────────────────────────────────────
export async function baixarModelo(req: AuthRequest, res: Response) {
  const exemplo = [
    { Nome: "João da Silva", Email: "joao@email.com", Celular: "31999998888", Tipo: "MENSALISTA", Posicao: "LINHA", Presenca: 20, Gols: 15, Destaques: 3, AguaSalsicha: 1 },
    { Nome: "Pedro Goleiro", Email: "pedro@email.com", Celular: "31988887777", Tipo: "MENSALISTA", Posicao: "GOLEIRO", Presenca: 18, Gols: 0, Destaques: 5, AguaSalsicha: 0 },
    { Nome: "Carlos Diarista", Email: "carlos@email.com", Celular: "", Tipo: "DIARISTA", Posicao: "LINHA", Presenca: 9, Gols: 7, Destaques: 1, AguaSalsicha: 2 },
  ];

  const ws = XLSX.utils.json_to_sheet(exemplo, { header: [...COLUNAS] });
  // Larguras de coluna
  ws["!cols"] = [{ wch: 25 }, { wch: 28 }, { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 6 }, { wch: 10 }, { wch: 13 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Jogadores");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  res.setHeader("Content-Disposition", 'attachment; filename="modelo-importacao-jogadores.xlsx"');
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.send(buf);
}

// ── Importação ──────────────────────────────────────────────────────────────
export async function importarPlanilha(req: AuthRequest, res: Response) {
  const peladaId = req.params.peladaId as string;
  const pelada = await prisma.pelada.findFirst({ where: { id: peladaId, adminId: req.adminId as string } });
  if (!pelada) { res.status(404).json({ error: "Pelada não encontrada" }); return; }

  const file = (req as any).file;
  if (!file) { res.status(400).json({ error: "Envie o arquivo da planilha (campo 'planilha')" }); return; }

  let linhas: Record<string, unknown>[];
  try {
    const wb = XLSX.read(file.buffer, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    linhas = XLSX.utils.sheet_to_json(ws, { defval: "" });
  } catch {
    res.status(400).json({ error: "Arquivo inválido. Use o modelo .xlsx do sistema." }); return;
  }

  if (linhas.length === 0) { res.status(400).json({ error: "Planilha vazia" }); return; }

  // Valida colunas obrigatórias
  const primeiraLinha = linhas[0];
  const faltando = ["Nome", "Email"].filter(c => !(c in primeiraLinha));
  if (faltando.length > 0) {
    res.status(400).json({ error: `Colunas obrigatórias ausentes: ${faltando.join(", ")}. Baixe o modelo padrão do sistema.` });
    return;
  }

  // Partida histórica: 01/01 do ano corrente (reutiliza se já existir)
  const anoCorrente = new Date().getFullYear();

  // Pool de partidas históricas (REALIZADAS) usado para computar as presenças.
  // Cada presença retroativa exige uma partida distinta (restrição única presença/partida).
  // A primeira do pool serve de referência para gols e votações.
  const poolHistorico = await prisma.partida.findMany({
    where: { peladaId, observacoes: { startsWith: "Histórico importado" } },
    orderBy: { data: "asc" },
  });
  async function garantirPartidasHistoricas(qtd: number) {
    for (let i = poolHistorico.length; i < qtd; i++) {
      const data = new Date(anoCorrente, 0, 1, 12, i, 0); // datas distintas e estáveis
      const p = await prisma.partida.create({
        data: { peladaId, data, status: "REALIZADA", observacoes: i === 0 ? "Histórico importado" : `Histórico importado ${i + 1}` },
      });
      poolHistorico.push(p);
    }
  }
  await garantirPartidasHistoricas(1); // garante a partida de referência

  const senhaPadrao = (pelada as any).senhaPadrao || "senha001";
  const hashPadrao = await bcrypt.hash(senhaPadrao, 10);

  const resultado = {
    processados: 0,
    jogadoresCriados: 0,
    usuariosCriados: 0,
    presencasLancadas: 0,
    golsLancados: 0,
    destaquesLancados: 0,
    aguasLancadas: 0,
    erros: [] as string[],
  };

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];
    const numLinha = i + 2; // considerando header na linha 1
    try {
      const nome = String(linha.Nome || "").trim();
      const email = String(linha.Email || "").trim().toLowerCase();
      const celular = String(linha.Celular || "").trim() || null;
      const tipo = String(linha.Tipo || "MENSALISTA").trim().toUpperCase() === "DIARISTA" ? "DIARISTA" : "MENSALISTA";
      const posicao = String(linha.Posicao || "LINHA").trim().toUpperCase() === "GOLEIRO" ? "GOLEIRO" : "LINHA";
      const presenca = Math.max(0, Number(linha.Presenca) || 0);
      const gols = Math.max(0, Number(linha.Gols) || 0);
      const destaques = Math.max(0, Number(linha.Destaques) || 0);
      const aguas = Math.max(0, Number(linha.AguaSalsicha) || 0);

      if (!nome || !email) {
        resultado.erros.push(`Linha ${numLinha}: Nome e Email são obrigatórios`);
        continue;
      }

      // 1. Jogador (busca por email)
      let jogador = await prisma.jogador.findUnique({ where: { email } });
      if (!jogador) {
        jogador = await prisma.jogador.create({ data: { nome, email, celular } });
        resultado.jogadoresCriados++;
      }

      // 2. Vínculo JogadorPelada
      let jp = await prisma.jogadorPelada.findUnique({
        where: { jogadorId_peladaId: { jogadorId: jogador.id, peladaId } },
      });
      if (!jp) {
        jp = await prisma.jogadorPelada.create({
          data: { jogadorId: jogador.id, peladaId, tipo, posicao },
        });
      }

      // 3. Usuario (se não existir, cria com senha padrão + troca obrigatória)
      const usuarioExiste = await prisma.usuario.findUnique({ where: { email } });
      if (!usuarioExiste) {
        await prisma.usuario.create({
          data: {
            nome, email, senha: hashPadrao, role: "JOGADOR", peladaId,
            jogadorPeladaId: jp.id, precisaTrocarSenha: true,
          },
        });
        resultado.usuariosCriados++;
      }

      // 4. Presenças retroativas — uma por partida histórica distinta
      await garantirPartidasHistoricas(presenca);
      // Idempotência: remove presenças históricas anteriores do jogador
      await prisma.presenca.deleteMany({
        where: { jogadorPeladaId: jp.id, partidaId: { in: poolHistorico.map(p => p.id) } },
      });
      if (presenca > 0) {
        await prisma.presenca.createMany({
          data: poolHistorico.slice(0, presenca).map(p => ({
            partidaId: p.id, jogadorPeladaId: jp!.id, status: "CONFIRMADO" as const,
          })),
        });
        resultado.presencasLancadas += presenca;
      }

      // 5. Partida de referência p/ gols e votações (primeira do pool)
      const refPartidaId = poolHistorico[0].id;
      // Limpa lançamentos anteriores deste jogador (permite re-importar sem duplicar)
      await prisma.gol.deleteMany({ where: { partidaId: refPartidaId, jogadorPeladaId: jp.id } });
      await prisma.votacao.deleteMany({ where: { partidaId: refPartidaId, jogadorPeladaId: jp.id } });

      // Gols (N registros na partida de referência)
      if (gols > 0) {
        await prisma.gol.createMany({
          data: Array.from({ length: gols }, () => ({
            partidaId: refPartidaId, jogadorPeladaId: jp!.id,
          })),
        });
        resultado.golsLancados += gols;
      }

      // 6. Destaques e Águas de Salsicha (N registros de votação)
      if (destaques > 0) {
        await prisma.votacao.createMany({
          data: Array.from({ length: destaques }, () => ({
            partidaId: refPartidaId, jogadorPeladaId: jp!.id, tipo: "DESTAQUE" as const,
          })),
        });
        resultado.destaquesLancados += destaques;
      }
      if (aguas > 0) {
        await prisma.votacao.createMany({
          data: Array.from({ length: aguas }, () => ({
            partidaId: refPartidaId, jogadorPeladaId: jp!.id, tipo: "AGUA_SALSICHA" as const,
          })),
        });
        resultado.aguasLancadas += aguas;
      }

      resultado.processados++;
    } catch (e: any) {
      resultado.erros.push(`Linha ${numLinha}: ${e.message || "erro desconhecido"}`);
    }
  }

  res.json(resultado);
}
