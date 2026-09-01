// Base de conhecimento do Manual — vive no código e deploya junto com o sistema,
// então se atualiza automaticamente a cada nova versão.

export const MANUAL_VERSAO = "1.0";

export type Contexto = "dashboard" | "portal";
export type Papel = "ADMINISTRADOR" | "OPERADOR" | "JOGADOR";

// Rota de destino de um tópico, dependente do contexto/perfil de quem procura.
interface Rota {
  dashboard?: string;
  // No portal, a rota pode variar por perfil. `default` cobre os demais.
  portal?: string | Partial<Record<Papel | "default", string>>;
}

export interface Topico {
  id: string;
  titulo: string;
  resumo: string;
  corpo: string[];        // parágrafos / itens
  palavras: string;       // sinônimos e termos de busca
  rota?: Rota;
  acaoLabel?: string;     // texto do botão "ir para"
}

export const TOPICOS: Topico[] = [
  {
    id: "acesso",
    titulo: "Acesso e primeiro login",
    resumo: "Como entrar e criar sua senha pessoal no primeiro acesso.",
    corpo: [
      "O acesso é por e-mail e senha na tela de login. O que você vê depende do seu perfil (Administrador, Operador ou Jogador).",
      "Ao ser cadastrado, você recebe uma senha padrão. No primeiro login o sistema obriga a criar uma senha pessoal antes de liberar o restante.",
    ],
    palavras: "login entrar acesso senha padrao trocar senha primeiro acesso esqueci senha conta",
    rota: { portal: "/trocar-senha", dashboard: "/dashboard" },
    acaoLabel: "Trocar minha senha",
  },
  {
    id: "perfis",
    titulo: "Perfis: Administrador, Operador e Jogador",
    resumo: "O que cada perfil pode fazer no sistema.",
    corpo: [
      "Administrador (dono): acesso total — configura tudo, gerencia agenda, pagamentos e define destaque/água oficiais.",
      "Operador: apoia a operação — lança pagamentos, confirma comprovantes, registra gols, inclui convidados e gera artes.",
      "Jogador: confirma presença, vê seu financeiro e o PIX, vota no destaque/água e acompanha as estatísticas.",
    ],
    palavras: "perfil permissao papel administrador operador jogador acesso o que cada um faz",
  },
  {
    id: "confirmar-presenca",
    titulo: "Confirmar presença na pelada",
    resumo: "Confirme sua ida em peladas confirmadas, com opções de resenha.",
    corpo: [
      "Quando a pelada está Confirmada, ela aparece no menu Peladas com destaque para você confirmar.",
      "Ao confirmar, escolha: Pelada + Resenha, Somente Pelada ou Somente Resenha.",
      "Se envolver resenha, informe se vai beber ou não (o valor muda). Goleiro entra com o valor de goleiro automaticamente.",
      "Você pode cancelar a presença até 2 horas antes do início.",
    ],
    palavras: "confirmar presenca vou nao vou lista peladas jogo participar cancelar presenca 2 horas resenha",
    rota: { portal: { JOGADOR: "/portal/peladas", default: "/portal/peladas" }, dashboard: "/dashboard/agenda" },
    acaoLabel: "Ir para Peladas",
  },
  {
    id: "resenha",
    titulo: "Resenha (bebe, não bebe, goleiro)",
    resumo: "Como funciona a resenha pós-jogo e seus valores.",
    corpo: [
      "A resenha é o churras/bebida depois do jogo. Ao confirmar presença você indica sua categoria: bebe, não bebe ou goleiro.",
      "Cada categoria tem um valor próprio, definido nas configurações.",
      "O Operador/Administrador controla os participantes e os pagamentos da resenha.",
    ],
    palavras: "resenha churras bebida bebe nao bebe goleiro cerveja pos jogo valor",
    rota: { portal: { OPERADOR: "/portal/financeiro", ADMINISTRADOR: "/portal/financeiro", default: "/portal/peladas" }, dashboard: "/dashboard/resenha" },
    acaoLabel: "Abrir Resenha",
  },
  {
    id: "financeiro",
    titulo: "Financeiro e pagamentos",
    resumo: "Mensalidade, diária e resenha — pendências e confirmação.",
    corpo: [
      "Jogador: veja suas pendências e pagamentos realizados no menu Financeiro; você pode anexar um comprovante (opcional).",
      "Operador/Administrador: confere o comprovante e marca como pago (pode confirmar com ou sem anexo).",
      "A mensalidade dos mensalistas é gerada automaticamente todo mês. A diária e a resenha conforme a participação.",
      "Ao confirmar o pagamento, a pendência sai de Pendentes e vai para Realizados.",
    ],
    palavras: "financeiro pagar pagamento mensalidade diaria pendencia debito divida boleto conta valores comprovante",
    rota: { portal: { JOGADOR: "/portal/meu-financeiro", OPERADOR: "/portal/financeiro", ADMINISTRADOR: "/portal/financeiro", default: "/portal/meu-financeiro" }, dashboard: "/dashboard/financeiro" },
    acaoLabel: "Abrir Financeiro",
  },
  {
    id: "comprovante",
    titulo: "Anexar comprovante de pagamento",
    resumo: "Envie a foto/PDF do pagamento para o operador confirmar.",
    corpo: [
      "No menu Financeiro, cada pendência tem a opção de anexar um comprovante (imagem ou PDF).",
      "O anexo não é obrigatório: o Operador/Administrador pode confirmar o pagamento mesmo sem comprovante.",
    ],
    palavras: "comprovante anexar recibo foto do pagamento print pdf enviar pagamento",
    rota: { portal: { JOGADOR: "/portal/meu-financeiro", OPERADOR: "/portal/financeiro", ADMINISTRADOR: "/portal/financeiro", default: "/portal/meu-financeiro" }, dashboard: "/dashboard/financeiro" },
    acaoLabel: "Abrir Financeiro",
  },
  {
    id: "pix",
    titulo: "Pagar por PIX",
    resumo: "Copie a chave PIX ou escaneie o QR Code para pagar.",
    corpo: [
      "O Administrador cadastra as chaves PIX (telefone, CPF/CNPJ, e-mail, chave aleatória ou QR Code).",
      "O jogador vê essas chaves no menu Financeiro, com botão para copiar a chave e pagar pelo app do banco.",
    ],
    palavras: "pix chave qr code copiar pagar transferencia banco cpf cnpj telefone chave aleatoria",
    rota: { portal: { JOGADOR: "/portal/meu-financeiro", default: "/portal/meu-financeiro" }, dashboard: "/dashboard/configuracoes" },
    acaoLabel: "Ver PIX no Financeiro",
  },
  {
    id: "votacao",
    titulo: "Votação: destaque e água de salsicha",
    resumo: "Vote uma vez em cada tema nas peladas em andamento.",
    corpo: [
      "A votação aparece apenas para peladas Em andamento.",
      "Cada pessoa vota uma única vez em cada tema (destaque e água). Depois de votar, não dá para mudar.",
      "Somente Administrador ou Operador pode zerar o voto de um jogador — e só enquanto a pelada está em andamento.",
    ],
    palavras: "votar voto votacao destaque agua de salsicha enquete melhor pior",
    rota: { portal: "/portal/votacao" },
    acaoLabel: "Ir para Votação",
  },
  {
    id: "estatisticas",
    titulo: "Estatísticas, ranking e artilharia",
    resumo: "Ranking ordenável por pontos, presença, gols, destaque e água.",
    corpo: [
      "O ranking soma os pontos de cada jogador (a pontuação de cada ação é configurável).",
      "Dá para ordenar por Pontos, Presença, Gols, Destaque ou Água de salsicha. Para ver os artilheiros, ordene por gols.",
    ],
    palavras: "estatistica ranking classificacao artilheiro artilharia gols pontos presenca melhor jogador",
    rota: { portal: "/portal/estatisticas", dashboard: "/dashboard/estatisticas" },
    acaoLabel: "Ver Estatísticas",
  },
  {
    id: "gols",
    titulo: "Lançar gols",
    resumo: "Registre os gols da pelada (Operador/Admin).",
    corpo: [
      "Durante ou após o jogo, o Operador/Administrador registra os gols de cada jogador.",
      "Os gols contam para a artilharia e para os pontos no ranking.",
    ],
    palavras: "gol gols marcar gol placar artilheiro lancar gol",
    rota: { portal: { OPERADOR: "/portal/gols", ADMINISTRADOR: "/portal/gols", default: "/portal/gols" }, dashboard: "/dashboard/agenda" },
    acaoLabel: "Ir para Lançar Gols",
  },
  {
    id: "convidados",
    titulo: "Incluir convidados",
    resumo: "Admin/Operador incluem convidados em peladas confirmadas.",
    corpo: [
      "Administrador e Operador podem incluir convidados em uma pelada Confirmada.",
      "O convidado é sempre relacionado a um jogador já cadastrado.",
    ],
    palavras: "convidado convidar visitante agregado incluir convidado extra",
    rota: { portal: { OPERADOR: "/portal/convidados", ADMINISTRADOR: "/portal/convidados", default: "/portal/convidados" }, dashboard: "/dashboard/agenda" },
    acaoLabel: "Ir para Convidados",
  },
  {
    id: "arte",
    titulo: "Arte para Instagram",
    resumo: "Gere artes de destaque, água e artilharia.",
    corpo: [
      "O sistema gera artes prontas de Destaque da Pelada, Água de Salsicha e Artilharia.",
      "As artes usam a foto de rosto do jogador cadastrada.",
    ],
    palavras: "arte instagram post imagem story destaque agua artilharia gerar arte",
    rota: { portal: { OPERADOR: "/portal/arte", ADMINISTRADOR: "/portal/arte", default: "/portal/arte" }, dashboard: "/dashboard/arte" },
    acaoLabel: "Ir para Arte",
  },
  {
    id: "agenda",
    titulo: "Agenda e status das peladas",
    resumo: "Agendada → Confirmada → Em andamento → Realizada.",
    corpo: [
      "Cada pelada passa por status: Agendada, Confirmada, Em andamento, Realizada (ou Cancelada).",
      "Ao marcar como Confirmada, os mensalistas são notificados no portal para confirmar presença.",
      "Quando a pelada lota, quem confirma entra na lista de espera; se alguém cancela, o primeiro da fila é promovido.",
    ],
    palavras: "agenda marcar pelada status confirmada realizada cancelar lista de espera fila lotado vaga jogo data",
    rota: { portal: { ADMINISTRADOR: "/portal/agenda", default: "/portal/peladas" }, dashboard: "/dashboard/agenda" },
    acaoLabel: "Ir para Agenda",
  },
  {
    id: "cad-jogador",
    titulo: "Cadastrar jogador",
    resumo: "Cadastre atletas com foto de rosto (usada nas artes).",
    corpo: [
      "No cadastro de jogadores você define nome, contato, tipo (mensalista/diarista), posição e nível.",
      "A foto de rosto é usada nas artes de destaque e água de salsicha.",
    ],
    palavras: "cadastrar jogador novo atleta foto mensalista diarista goleiro nivel",
    rota: { dashboard: "/dashboard/jogadores" },
    acaoLabel: "Ir para Jogadores",
  },
  {
    id: "cad-usuario",
    titulo: "Cadastrar usuário (acesso ao sistema)",
    resumo: "Crie logins para jogadores, operadores e administradores.",
    corpo: [
      "Cada pessoa que acessa o sistema tem um usuário com um perfil.",
      "O usuário do perfil Jogador é sempre vinculado a um jogador cadastrado.",
      "Sem informar senha, o usuário recebe a senha padrão e troca no primeiro login.",
    ],
    palavras: "usuario acesso criar login perfil operador administrador jogador senha padrao vincular",
    rota: { dashboard: "/dashboard/usuarios" },
    acaoLabel: "Ir para Usuários",
  },
  {
    id: "config",
    titulo: "Configurações: valores, pontuação, PIX e alertas",
    resumo: "Ajuste valores, pontos do ranking, senha padrão e mais.",
    corpo: [
      "Nas Configurações o Administrador define os valores (mensalidade, diária, resenha), a pontuação do ranking e a senha padrão.",
      "Também cadastra as chaves PIX, configura alertas por e-mail e importa históricos por planilha.",
    ],
    palavras: "configuracao valores mensalidade valor pontuacao senha padrao pix alertas email importar planilha ajustes",
    rota: { dashboard: "/dashboard/configuracoes" },
    acaoLabel: "Ir para Configurações",
  },
  {
    id: "importar",
    titulo: "Importar histórico por planilha",
    resumo: "Cadastre jogadores e lance gols/destaques em massa.",
    corpo: [
      "Baixe o modelo de planilha nas Configurações, preencha (presença, gols, destaques, água) e importe.",
      "Jogadores que não existem são criados automaticamente; o histórico entra nas estatísticas.",
    ],
    palavras: "importar planilha historico excel massa modelo gols destaques presenca lote",
    rota: { dashboard: "/dashboard/configuracoes" },
    acaoLabel: "Ir para Configurações",
  },
];

// ── Busca ────────────────────────────────────────────────────────────────────
function normaliza(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function palavrasDe(s: string): string[] {
  return normaliza(s).split(/[^a-z0-9]+/).filter(Boolean);
}

export function buscar(query: string): Topico[] {
  const q = normaliza(query).trim();
  if (!q) return TOPICOS;
  const termos = q.split(/\s+/).filter(Boolean);

  const pontuados = TOPICOS.map(t => {
    // Campos com pesos: casamento de palavra inteira vale mais que prefixo.
    const campos = [
      { words: palavrasDe(t.titulo), whole: 10, prefix: 5 },
      { words: palavrasDe(t.palavras), whole: 6, prefix: 3 },
      { words: palavrasDe(t.resumo), whole: 3, prefix: 2 },
      { words: palavrasDe(t.corpo.join(" ")), whole: 1, prefix: 1 },
    ];
    let score = 0;
    for (const termo of termos) {
      for (const c of campos) {
        if (c.words.includes(termo)) score += c.whole;
        else if (termo.length >= 3 && c.words.some(w => w.startsWith(termo))) score += c.prefix;
      }
    }
    return { t, score };
  }).filter(x => x.score > 0);

  pontuados.sort((a, b) => b.score - a.score);
  return pontuados.map(x => x.t);
}

// Resolve o link de destino do tópico conforme o contexto/perfil.
export function resolverRota(t: Topico, contexto: Contexto, papel?: string): string | null {
  const r = t.rota;
  if (!r) return null;
  if (contexto === "dashboard") return r.dashboard || null;
  if (!r.portal) return null;
  if (typeof r.portal === "string") return r.portal;
  const p = papel as Papel | undefined;
  return (p && r.portal[p]) || r.portal.default || null;
}
