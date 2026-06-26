-- CreateEnum
CREATE TYPE "TipoJogador" AS ENUM ('MENSALISTA', 'DIARISTA');

-- CreateEnum
CREATE TYPE "Posicao" AS ENUM ('LINHA', 'GOLEIRO');

-- CreateEnum
CREATE TYPE "StatusPartida" AS ENUM ('AGENDADA', 'CONFIRMADA', 'REALIZADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "StatusPresenca" AS ENUM ('CONFIRMADO', 'AUSENTE', 'LISTA_ESPERA');

-- CreateEnum
CREATE TYPE "TipoVotacao" AS ENUM ('DESTAQUE', 'AGUA_SALSICHA');

-- CreateEnum
CREATE TYPE "CategoriaResenha" AS ENUM ('BEBE', 'NAO_BEBE', 'GOLEIRO_BEBE');

-- CreateEnum
CREATE TYPE "TipoPagamento" AS ENUM ('MENSALIDADE', 'DIARIA');

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pelada" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "corPrimaria" TEXT NOT NULL DEFAULT '#16a34a',
    "corSecundaria" TEXT NOT NULL DEFAULT '#15803d',
    "corTexto" TEXT NOT NULL DEFAULT '#ffffff',
    "diaSemana" INTEGER[],
    "horario" TEXT NOT NULL DEFAULT '20:00',
    "maxJogadores" INTEGER NOT NULL DEFAULT 20,
    "horaAbreLista" TEXT NOT NULL DEFAULT '08:00',
    "horaFechaLista" TEXT NOT NULL DEFAULT '18:00',
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "adminId" TEXT NOT NULL,

    CONSTRAINT "Pelada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfiguracaoFinanceira" (
    "id" TEXT NOT NULL,
    "mensalistaValor" DOUBLE PRECISION NOT NULL DEFAULT 90.00,
    "diaristaValor" DOUBLE PRECISION NOT NULL DEFAULT 30.00,
    "resenhaBebe" DOUBLE PRECISION NOT NULL DEFAULT 85.00,
    "resenhaNaoBebe" DOUBLE PRECISION NOT NULL DEFAULT 40.00,
    "resenhaGoleiro" DOUBLE PRECISION NOT NULL DEFAULT 40.00,
    "pontoPresenca" INTEGER NOT NULL DEFAULT 1,
    "pontoVitoria" INTEGER NOT NULL DEFAULT 3,
    "pontoGol" INTEGER NOT NULL DEFAULT 1,
    "pontoDestaque" INTEGER NOT NULL DEFAULT 5,
    "pontoAguaSalsicha" INTEGER NOT NULL DEFAULT -3,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "peladaId" TEXT NOT NULL,

    CONSTRAINT "ConfiguracaoFinanceira_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Jogador" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "celular" TEXT,
    "fotoNormal" TEXT,
    "fotoFeliz" TEXT,
    "fotoTriste" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Jogador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JogadorPelada" (
    "id" TEXT NOT NULL,
    "tipo" "TipoJogador" NOT NULL DEFAULT 'DIARISTA',
    "posicao" "Posicao" NOT NULL DEFAULT 'LINHA',
    "nivel" INTEGER NOT NULL DEFAULT 3,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "jogadorId" TEXT NOT NULL,
    "peladaId" TEXT NOT NULL,

    CONSTRAINT "JogadorPelada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partida" (
    "id" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "status" "StatusPartida" NOT NULL DEFAULT 'AGENDADA',
    "placarTimeA" INTEGER,
    "placarTimeB" INTEGER,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "peladaId" TEXT NOT NULL,

    CONSTRAINT "Partida_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Presenca" (
    "id" TEXT NOT NULL,
    "status" "StatusPresenca" NOT NULL DEFAULT 'CONFIRMADO',
    "posicaoFila" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "partidaId" TEXT NOT NULL,
    "jogadorPeladaId" TEXT NOT NULL,

    CONSTRAINT "Presenca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gol" (
    "id" TEXT NOT NULL,
    "minuto" INTEGER,
    "time" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "partidaId" TEXT NOT NULL,
    "jogadorPeladaId" TEXT NOT NULL,

    CONSTRAINT "Gol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Votacao" (
    "id" TEXT NOT NULL,
    "tipo" "TipoVotacao" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "partidaId" TEXT NOT NULL,
    "jogadorPeladaId" TEXT NOT NULL,

    CONSTRAINT "Votacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VotoDestaque" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "votacaoId" TEXT NOT NULL,
    "votanteId" TEXT NOT NULL,

    CONSTRAINT "VotoDestaque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resenha" (
    "id" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "partidaId" TEXT NOT NULL,

    CONSTRAINT "Resenha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResenhaPresenca" (
    "id" TEXT NOT NULL,
    "categoria" "CategoriaResenha" NOT NULL,
    "valorDevido" DOUBLE PRECISION NOT NULL,
    "pago" BOOLEAN NOT NULL DEFAULT false,
    "dataPagamento" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resenhaId" TEXT NOT NULL,
    "jogadorPeladaId" TEXT NOT NULL,

    CONSTRAINT "ResenhaPresenca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pagamento" (
    "id" TEXT NOT NULL,
    "tipo" "TipoPagamento" NOT NULL,
    "mes" INTEGER,
    "ano" INTEGER,
    "valor" DOUBLE PRECISION NOT NULL,
    "pago" BOOLEAN NOT NULL DEFAULT false,
    "dataPagamento" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "jogadorPeladaId" TEXT NOT NULL,

    CONSTRAINT "Pagamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Pelada_slug_key" ON "Pelada"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ConfiguracaoFinanceira_peladaId_key" ON "ConfiguracaoFinanceira"("peladaId");

-- CreateIndex
CREATE UNIQUE INDEX "Jogador_email_key" ON "Jogador"("email");

-- CreateIndex
CREATE UNIQUE INDEX "JogadorPelada_jogadorId_peladaId_key" ON "JogadorPelada"("jogadorId", "peladaId");

-- CreateIndex
CREATE UNIQUE INDEX "Presenca_partidaId_jogadorPeladaId_key" ON "Presenca"("partidaId", "jogadorPeladaId");

-- CreateIndex
CREATE UNIQUE INDEX "Resenha_partidaId_key" ON "Resenha"("partidaId");

-- CreateIndex
CREATE UNIQUE INDEX "ResenhaPresenca_resenhaId_jogadorPeladaId_key" ON "ResenhaPresenca"("resenhaId", "jogadorPeladaId");

-- AddForeignKey
ALTER TABLE "Pelada" ADD CONSTRAINT "Pelada_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfiguracaoFinanceira" ADD CONSTRAINT "ConfiguracaoFinanceira_peladaId_fkey" FOREIGN KEY ("peladaId") REFERENCES "Pelada"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JogadorPelada" ADD CONSTRAINT "JogadorPelada_jogadorId_fkey" FOREIGN KEY ("jogadorId") REFERENCES "Jogador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JogadorPelada" ADD CONSTRAINT "JogadorPelada_peladaId_fkey" FOREIGN KEY ("peladaId") REFERENCES "Pelada"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partida" ADD CONSTRAINT "Partida_peladaId_fkey" FOREIGN KEY ("peladaId") REFERENCES "Pelada"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presenca" ADD CONSTRAINT "Presenca_partidaId_fkey" FOREIGN KEY ("partidaId") REFERENCES "Partida"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presenca" ADD CONSTRAINT "Presenca_jogadorPeladaId_fkey" FOREIGN KEY ("jogadorPeladaId") REFERENCES "JogadorPelada"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gol" ADD CONSTRAINT "Gol_partidaId_fkey" FOREIGN KEY ("partidaId") REFERENCES "Partida"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gol" ADD CONSTRAINT "Gol_jogadorPeladaId_fkey" FOREIGN KEY ("jogadorPeladaId") REFERENCES "JogadorPelada"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Votacao" ADD CONSTRAINT "Votacao_partidaId_fkey" FOREIGN KEY ("partidaId") REFERENCES "Partida"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Votacao" ADD CONSTRAINT "Votacao_jogadorPeladaId_fkey" FOREIGN KEY ("jogadorPeladaId") REFERENCES "JogadorPelada"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VotoDestaque" ADD CONSTRAINT "VotoDestaque_votacaoId_fkey" FOREIGN KEY ("votacaoId") REFERENCES "Votacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resenha" ADD CONSTRAINT "Resenha_partidaId_fkey" FOREIGN KEY ("partidaId") REFERENCES "Partida"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResenhaPresenca" ADD CONSTRAINT "ResenhaPresenca_resenhaId_fkey" FOREIGN KEY ("resenhaId") REFERENCES "Resenha"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResenhaPresenca" ADD CONSTRAINT "ResenhaPresenca_jogadorPeladaId_fkey" FOREIGN KEY ("jogadorPeladaId") REFERENCES "JogadorPelada"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pagamento" ADD CONSTRAINT "Pagamento_jogadorPeladaId_fkey" FOREIGN KEY ("jogadorPeladaId") REFERENCES "JogadorPelada"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
