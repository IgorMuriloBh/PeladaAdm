-- AlterTable
ALTER TABLE "Presenca" ADD COLUMN     "categoriaResenha" "CategoriaResenha",
ADD COLUMN     "interesseResenha" BOOLEAN;

-- CreateTable
CREATE TABLE "ConfiguracaoAlerta" (
    "id" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT false,
    "smtpHost" TEXT NOT NULL DEFAULT '',
    "smtpPort" INTEGER NOT NULL DEFAULT 587,
    "smtpUser" TEXT NOT NULL DEFAULT '',
    "smtpPass" TEXT NOT NULL DEFAULT '',
    "emailRemetente" TEXT NOT NULL DEFAULT '',
    "nomeRemetente" TEXT NOT NULL DEFAULT 'Pelada ADM',
    "alertaNovaPartida" BOOLEAN NOT NULL DEFAULT true,
    "alertaEncerramentoPelada" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "peladaId" TEXT NOT NULL,

    CONSTRAINT "ConfiguracaoAlerta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PresencaToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "usado" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "jogadorPeladaId" TEXT NOT NULL,
    "partidaId" TEXT NOT NULL,

    CONSTRAINT "PresencaToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConfiguracaoAlerta_peladaId_key" ON "ConfiguracaoAlerta"("peladaId");

-- CreateIndex
CREATE UNIQUE INDEX "PresencaToken_token_key" ON "PresencaToken"("token");

-- AddForeignKey
ALTER TABLE "ConfiguracaoAlerta" ADD CONSTRAINT "ConfiguracaoAlerta_peladaId_fkey" FOREIGN KEY ("peladaId") REFERENCES "Pelada"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresencaToken" ADD CONSTRAINT "PresencaToken_jogadorPeladaId_fkey" FOREIGN KEY ("jogadorPeladaId") REFERENCES "JogadorPelada"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresencaToken" ADD CONSTRAINT "PresencaToken_partidaId_fkey" FOREIGN KEY ("partidaId") REFERENCES "Partida"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
