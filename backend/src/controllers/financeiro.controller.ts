import { Response } from "express";
import { AuthRequest } from "../middlewares/auth";
import { prisma } from "../lib/prisma";
import { resolvePelada, getPeladaId } from "../lib/peladaHelper";


// ─── MENSALIDADES ────────────────────────────────────────────────────────────

export async function listarMensalidades(req: AuthRequest, res: Response) {
  const pelada = await resolvePelada(req, true);
  const peladaId = getPeladaId(req);
  if (!pelada) { res.status(404).json({ error: "Pelada não encontrada" }); return; }

  const mes = req.query.mes ? Number(req.query.mes) : undefined;
  const ano = req.query.ano ? Number(req.query.ano) : new Date().getFullYear();

  const pagamentos = await prisma.pagamento.findMany({
    where: {
      jogadorPelada: { peladaId },
      tipo: "MENSALIDADE",
      ...(mes && { mes }),
      ...(ano && { ano }),
    },
    include: { jogadorPelada: { include: { jogador: true } } },
    orderBy: [{ ano: "desc" }, { mes: "desc" }],
  });
  res.json(pagamentos);
}

export async function gerarMensalidades(req: AuthRequest, res: Response) {
  const pelada = await resolvePelada(req, true);
  const peladaId = getPeladaId(req);
  if (!pelada) { res.status(404).json({ error: "Pelada não encontrada" }); return; }

  const mes = Number(req.body.mes) || new Date().getMonth() + 1;
  const ano = Number(req.body.ano) || new Date().getFullYear();
  const valor = (pelada as any).configuracaoFinanceira?.mensalistaValor || 90;

  const mensalistas = await prisma.jogadorPelada.findMany({
    where: { peladaId, tipo: "MENSALISTA", ativo: true },
  });

  let criados = 0;
  for (const jp of mensalistas) {
    const existe = await prisma.pagamento.findFirst({
      where: { jogadorPeladaId: jp.id, tipo: "MENSALIDADE", mes, ano },
    });
    if (!existe) {
      await prisma.pagamento.create({ data: { jogadorPeladaId: jp.id, tipo: "MENSALIDADE", mes, ano, valor } });
      criados++;
    }
  }
  res.json({ criados, mes, ano });
}

export async function marcarMensalidade(req: AuthRequest, res: Response) {
  const pelada = await resolvePelada(req, true);
  const peladaId = getPeladaId(req);
  if (!pelada) { res.status(404).json({ error: "Pelada não encontrada" }); return; }

  const id = req.params.id as string;
  const { pago } = req.body;

  const pagamento = await prisma.pagamento.update({
    where: { id },
    data: { pago: Boolean(pago), dataPagamento: pago ? new Date() : null },
    include: { jogadorPelada: { include: { jogador: true } } },
  });
  res.json(pagamento);
}

export async function inadimplentes(req: AuthRequest, res: Response) {
  const pelada = await resolvePelada(req, true);
  const peladaId = getPeladaId(req);
  if (!pelada) { res.status(404).json({ error: "Pelada não encontrada" }); return; }

  const mes = Number(req.query.mes) || new Date().getMonth() + 1;
  const ano = Number(req.query.ano) || new Date().getFullYear();

  const lista = await prisma.pagamento.findMany({
    where: { jogadorPelada: { peladaId }, tipo: "MENSALIDADE", mes, ano, pago: false },
    include: { jogadorPelada: { include: { jogador: true } } },
  });
  res.json(lista);
}

// ─── DIÁRIAS ─────────────────────────────────────────────────────────────────

export async function gerarDiaria(req: AuthRequest, res: Response) {
  const pelada = await resolvePelada(req, true);
  const peladaId = getPeladaId(req);
  if (!pelada) { res.status(404).json({ error: "Pelada não encontrada" }); return; }

  const partidaId = req.params.partidaId as string;
  const valor = (pelada as any).configuracaoFinanceira?.diaristaValor || 30;

  const presencas = await prisma.presenca.findMany({
    where: { partidaId, status: "CONFIRMADO", jogadorPelada: { peladaId, tipo: "DIARISTA" } },
    include: { jogadorPelada: true },
  });

  let criados = 0;
  for (const p of presencas) {
    const existe = await prisma.pagamento.findFirst({
      where: { jogadorPeladaId: p.jogadorPeladaId, tipo: "DIARIA" },
    });
    if (!existe) {
      const dt = await prisma.partida.findUnique({ where: { id: partidaId }, select: { data: true } });
      const mes = dt ? new Date(dt.data).getMonth() + 1 : new Date().getMonth() + 1;
      const ano = dt ? new Date(dt.data).getFullYear() : new Date().getFullYear();
      await prisma.pagamento.create({ data: { jogadorPeladaId: p.jogadorPeladaId, tipo: "DIARIA", mes, ano, valor } });
      criados++;
    }
  }
  res.json({ criados });
}

export async function listarDiarias(req: AuthRequest, res: Response) {
  const pelada = await resolvePelada(req, true);
  const peladaId = getPeladaId(req);
  if (!pelada) { res.status(404).json({ error: "Pelada não encontrada" }); return; }

  const mes = req.query.mes ? Number(req.query.mes) : undefined;
  const ano = req.query.ano ? Number(req.query.ano) : new Date().getFullYear();

  const pagamentos = await prisma.pagamento.findMany({
    where: { jogadorPelada: { peladaId }, tipo: "DIARIA", ...(mes && { mes }), ...(ano && { ano }) },
    include: { jogadorPelada: { include: { jogador: true } } },
    orderBy: [{ ano: "desc" }, { mes: "desc" }],
  });
  res.json(pagamentos);
}

export async function marcarDiaria(req: AuthRequest, res: Response) {
  const pelada = await resolvePelada(req, true);
  const peladaId = getPeladaId(req);
  if (!pelada) { res.status(404).json({ error: "Pelada não encontrada" }); return; }

  const id = req.params.id as string;
  const { pago } = req.body;
  const pagamento = await prisma.pagamento.update({
    where: { id },
    data: { pago: Boolean(pago), dataPagamento: pago ? new Date() : null },
    include: { jogadorPelada: { include: { jogador: true } } },
  });
  res.json(pagamento);
}

// ─── RESENHA ─────────────────────────────────────────────────────────────────

// Gera a resenha de uma partida, opcionalmente já listando os presentes
// confirmados (para controle de pagamento). Idempotente: se a resenha já
// existir, apenas complementa os presentes que ainda não estiverem nela.
// Categoria padrão: GOLEIRO_BEBE para goleiros, NAO_BEBE para os demais.
export async function gerarResenhaComConfirmados(peladaId: string, partidaId: string) {
  const cfg = await prisma.configuracaoFinanceira.findUnique({ where: { peladaId } });
  const valorNaoBebe = cfg?.resenhaNaoBebe ?? 40;
  const valorGoleiro = cfg?.resenhaGoleiro ?? 40;

  let resenha = await prisma.resenha.findUnique({ where: { partidaId }, include: { presencas: true } });
  if (!resenha) {
    const criada = await prisma.resenha.create({ data: { partidaId } });
    resenha = { ...criada, presencas: [] } as any;
  }

  const confirmados = await prisma.presenca.findMany({
    where: { partidaId, status: "CONFIRMADO" },
    include: { jogadorPelada: true },
  });

  const jaNaResenha = new Set(resenha!.presencas.map(p => p.jogadorPeladaId));
  const novos = confirmados
    .filter(pr => !jaNaResenha.has(pr.jogadorPeladaId))
    .map(pr => ({
      resenhaId: resenha!.id,
      jogadorPeladaId: pr.jogadorPeladaId,
      categoria: (pr.jogadorPelada.posicao === "GOLEIRO" ? "GOLEIRO_BEBE" : "NAO_BEBE") as any,
      valorDevido: pr.jogadorPelada.posicao === "GOLEIRO" ? valorGoleiro : valorNaoBebe,
    }));

  if (novos.length > 0) {
    await prisma.resenhaPresenca.createMany({ data: novos });
  }
  return resenha!.id;
}

export async function criarResenha(req: AuthRequest, res: Response) {
  const pelada = await resolvePelada(req, true);
  const peladaId = getPeladaId(req);
  if (!pelada) { res.status(404).json({ error: "Pelada não encontrada" }); return; }

  const partidaId = req.params.partidaId as string;
  const partida = await prisma.partida.findFirst({ where: { id: partidaId, peladaId } });
  if (!partida) { res.status(404).json({ error: "Partida não encontrada" }); return; }

  const existe = await prisma.resenha.findUnique({ where: { partidaId } });
  if (existe) { res.status(409).json({ error: "Resenha já existe para esta partida" }); return; }

  // Cria a resenha já listando os confirmados da pelada (controle de pagamento)
  await gerarResenhaComConfirmados(peladaId, partidaId);
  const resenha = await prisma.resenha.findUnique({ where: { partidaId } });
  res.status(201).json(resenha);
}

export async function buscarResenha(req: AuthRequest, res: Response) {
  const pelada = await resolvePelada(req, true);
  const peladaId = getPeladaId(req);
  if (!pelada) { res.status(404).json({ error: "Pelada não encontrada" }); return; }

  const resenha = await prisma.resenha.findFirst({
    where: { partida: { id: req.params.partidaId as string, peladaId } },
    include: {
      presencas: {
        include: { jogadorPelada: { include: { jogador: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!resenha) { res.status(404).json({ error: "Resenha não encontrada" }); return; }
  res.json(resenha);
}

export async function adicionarParticipanteResenha(req: AuthRequest, res: Response) {
  const pelada = await resolvePelada(req, true);
  const peladaId = getPeladaId(req);
  if (!pelada) { res.status(404).json({ error: "Pelada não encontrada" }); return; }

  const resenhaId = req.params.resenhaId as string;
  const { jogadorPeladaId, categoria } = req.body;
  if (!jogadorPeladaId || !categoria) { res.status(400).json({ error: "jogadorPeladaId e categoria são obrigatórios" }); return; }

  const cfg = (pelada as any).configuracaoFinanceira;
  const valorMap: Record<string, number> = {
    BEBE: cfg?.resenhaBebe || 85,
    NAO_BEBE: cfg?.resenhaNaoBebe || 40,
    GOLEIRO_BEBE: cfg?.resenhaGoleiro || 40,
  };
  const valorDevido = valorMap[categoria as string] ?? 40;

  const jaExiste = await prisma.resenhaPresenca.findUnique({
    where: { resenhaId_jogadorPeladaId: { resenhaId, jogadorPeladaId } },
  });
  if (jaExiste) { res.status(409).json({ error: "Jogador já está na resenha" }); return; }

  const presenca = await prisma.resenhaPresenca.create({
    data: { resenhaId, jogadorPeladaId, categoria, valorDevido },
    include: { jogadorPelada: { include: { jogador: true } } },
  });
  res.status(201).json(presenca);
}

export async function marcarPagamentoResenha(req: AuthRequest, res: Response) {
  const pelada = await resolvePelada(req, true);
  const peladaId = getPeladaId(req);
  if (!pelada) { res.status(404).json({ error: "Pelada não encontrada" }); return; }

  const id = req.params.id as string;
  const { pago } = req.body;
  const presenca = await prisma.resenhaPresenca.update({
    where: { id },
    data: { pago: Boolean(pago), dataPagamento: pago ? new Date() : null },
    include: { jogadorPelada: { include: { jogador: true } } },
  });
  res.json(presenca);
}

export async function removerParticipanteResenha(req: AuthRequest, res: Response) {
  const pelada = await resolvePelada(req, true);
  const peladaId = getPeladaId(req);
  if (!pelada) { res.status(404).json({ error: "Pelada não encontrada" }); return; }

  await prisma.resenhaPresenca.delete({ where: { id: req.params.id as string } });
  res.json({ ok: true });
}

// ─── RESUMO FINANCEIRO ────────────────────────────────────────────────────────

export async function resumo(req: AuthRequest, res: Response) {
  const pelada = await resolvePelada(req, true);
  const peladaId = getPeladaId(req);
  if (!pelada) { res.status(404).json({ error: "Pelada não encontrada" }); return; }

  const mes = Number(req.query.mes) || new Date().getMonth() + 1;
  const ano = Number(req.query.ano) || new Date().getFullYear();

  const [mensalidades, diarias, resenhas] = await Promise.all([
    prisma.pagamento.findMany({ where: { jogadorPelada: { peladaId }, tipo: "MENSALIDADE", mes, ano } }),
    prisma.pagamento.findMany({ where: { jogadorPelada: { peladaId }, tipo: "DIARIA", mes, ano } }),
    prisma.resenhaPresenca.findMany({ where: { resenha: { partida: { peladaId } }, jogadorPelada: { peladaId } } }),
  ]);

  const soma = (arr: { valor?: number; valorDevido?: number; pago: boolean }[], campo: "valor" | "valorDevido") => ({
    total: arr.reduce((s, x) => s + (x[campo] || 0), 0),
    recebido: arr.filter(x => x.pago).reduce((s, x) => s + (x[campo] || 0), 0),
    pendente: arr.filter(x => !x.pago).reduce((s, x) => s + (x[campo] || 0), 0),
  });

  res.json({
    mes, ano,
    mensalidades: { ...soma(mensalidades as any, "valor"), total_jogadores: mensalidades.length, pagos: mensalidades.filter(x => x.pago).length },
    diarias: { ...soma(diarias as any, "valor"), total_jogadores: diarias.length, pagos: diarias.filter(x => x.pago).length },
    resenha: { ...soma(resenhas as any, "valorDevido"), total_jogadores: resenhas.length, pagos: resenhas.filter(x => x.pago).length },
  });
}
