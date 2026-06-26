// Gera as datas das próximas N ocorrências de uma pelada com base nos dias da semana configurados
export function proximasOcorrencias(diaSemana: number[], horario: string, quantidade = 8): Date[] {
  const datas: Date[] = [];
  const agora = new Date();
  const [h, m] = horario.split(":").map(Number);
  let cursor = new Date(agora);
  cursor.setHours(h, m, 0, 0);

  let tentativas = 0;
  while (datas.length < quantidade && tentativas < 365) {
    if (diaSemana.includes(cursor.getDay())) {
      if (cursor > agora) datas.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
    tentativas++;
  }
  return datas;
}

export function formatarData(data: Date): string {
  return data.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
}
