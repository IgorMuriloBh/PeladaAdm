import { Response } from "express";
import { AuthRequest } from "../middlewares/auth";
import { prisma } from "../lib/prisma";
import { resolvePelada, getPeladaId } from "../lib/peladaHelper";

export async function estatisticasJogadores(req: AuthRequest, res: Response) {
  const pelada = await resolvePelada(req, true);
  if (!pelada) { res.status(404).json({ error: "Pelada não encontrada" }); return; }
  const peladaId = getPeladaId(req);

  const cfg = (pelada as any).configuracaoFinanceira;
  const pts = {
    presenca: cfg?.pontoPresenca ?? 1,
    vitoria: cfg?.pontoVitoria ?? 3,
    gol: cfg?.pontoGol ?? 1,
    destaque: cfg?.pontoDestaque ?? 5,
    agua: cfg?.pontoAguaSalsicha ?? -3,
  };

  const mes = req.query.mes ? Number(req.query.mes) : undefined;
  const ano = req.query.ano ? Number(req.query.ano) : undefined;

  const jogadores = await prisma.jogadorPelada.findMany({
    where: { peladaId, ativo: true },
    include: {
      jogador: true,
      presencas: {
        where: {
          status: "CONFIRMADO",
          partida: {
            status: "REALIZADA",
            ...(mes || ano ? {
              data: {
                ...(ano ? { gte: new Date(ano, (mes ?? 1) - 1, 1) } : {}),
                ...(ano ? { lt: mes ? new Date(ano, mes, 1) : new Date(ano + 1, 0, 1) } : {}),
              },
            } : {}),
          },
        },
        include: { partida: { include: { gols: true } } },
      },
      gols: {
        where: {
          partida: {
            status: "REALIZADA",
            ...(mes || ano ? {
              data: {
                ...(ano ? { gte: new Date(ano, (mes ?? 1) - 1, 1) } : {}),
                ...(ano ? { lt: mes ? new Date(ano, mes, 1) : new Date(ano + 1, 0, 1) } : {}),
              },
            } : {}),
          },
        },
      },
      votacoes: {
        where: {
          partida: {
            status: "REALIZADA",
            ...(mes || ano ? {
              data: {
                ...(ano ? { gte: new Date(ano, (mes ?? 1) - 1, 1) } : {}),
                ...(ano ? { lt: mes ? new Date(ano, mes, 1) : new Date(ano + 1, 0, 1) } : {}),
              },
            } : {}),
          },
        },
      },
    },
  });

  const stats = jogadores.map(jp => {
    const presencas = jp.presencas.length;
    const totalGols = jp.gols.length;
    const destaques = (jp as any).votacoes.filter((v: any) => v.tipo === "DESTAQUE").length;
    const aguas = (jp as any).votacoes.filter((v: any) => v.tipo === "AGUA_SALSICHA").length;

    let vitorias = 0;
    for (const p of jp.presencas) {
      const partida = p.partida as any;
      if (partida.placarTimeA === null || partida.placarTimeB === null) continue;
      const golsA = partida.gols.filter((g: any) => g.time === "A").length;
      const golsB = partida.gols.filter((g: any) => g.time === "B").length;
      const meuTime = jp.gols.some((g: any) => g.partidaId === partida.id && g.time === "A") ? "A"
        : jp.gols.some((g: any) => g.partidaId === partida.id && g.time === "B") ? "B"
        : null;
      if (meuTime === "A" && golsA > golsB) vitorias++;
      else if (meuTime === "B" && golsB > golsA) vitorias++;
    }

    const pontos = presencas * pts.presenca + vitorias * pts.vitoria + totalGols * pts.gol
      + destaques * pts.destaque + aguas * pts.agua;
    return {
      jogadorPeladaId: jp.id,
      nome: jp.jogador.nome,
      foto: jp.jogador.fotoNormal,
      posicao: jp.posicao,
      tipo: jp.tipo,
      presencas,
      vitorias,
      gols: totalGols,
      destaques,
      aguas,
      pontos,
    };
  });

  stats.sort((a, b) => b.pontos - a.pontos || b.gols - a.gols || b.presencas - a.presencas);
  res.json(stats);
}

export async function artilharia(req: AuthRequest, res: Response) {
  const pelada = await resolvePelada(req);
  if (!pelada) { res.status(404).json({ error: "Pelada não encontrada" }); return; }
  const peladaId = getPeladaId(req);

  const mes = req.query.mes ? Number(req.query.mes) : undefined;
  const ano = req.query.ano ? Number(req.query.ano) : undefined;
  const dateFilter = (mes || ano) ? {
    data: {
      ...(ano ? { gte: new Date(ano, (mes ?? 1) - 1, 1) } : {}),
      ...(ano ? { lt: mes ? new Date(ano, mes, 1) : new Date(ano + 1, 0, 1) } : {}),
    },
  } : {};

  const gols = await prisma.gol.groupBy({
    by: ["jogadorPeladaId"],
    where: { partida: { peladaId, status: "REALIZADA", ...dateFilter } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 30,
  });

  const ids = gols.map(g => g.jogadorPeladaId);
  const jogadores = await prisma.jogadorPelada.findMany({
    where: { id: { in: ids } },
    include: { jogador: true },
  });

  const result = gols.map((g, i) => {
    const jp = jogadores.find(j => j.id === g.jogadorPeladaId)!;
    return {
      posicao: i + 1,
      jogadorPeladaId: g.jogadorPeladaId,
      nome: jp?.jogador.nome ?? "?",
      foto: jp?.jogador.fotoNormal ?? null,
      gols: g._count.id,
    };
  });

  res.json(result);
}
