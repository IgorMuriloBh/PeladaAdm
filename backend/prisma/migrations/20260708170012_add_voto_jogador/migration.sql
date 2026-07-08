-- CreateTable
CREATE TABLE "VotoJogador" (
    "id" TEXT NOT NULL,
    "tipo" "TipoVotacao" NOT NULL,
    "votanteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "partidaId" TEXT NOT NULL,
    "jogadorPeladaId" TEXT NOT NULL,

    CONSTRAINT "VotoJogador_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VotoJogador_partidaId_tipo_votanteId_key" ON "VotoJogador"("partidaId", "tipo", "votanteId");

-- AddForeignKey
ALTER TABLE "VotoJogador" ADD CONSTRAINT "VotoJogador_partidaId_fkey" FOREIGN KEY ("partidaId") REFERENCES "Partida"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VotoJogador" ADD CONSTRAINT "VotoJogador_jogadorPeladaId_fkey" FOREIGN KEY ("jogadorPeladaId") REFERENCES "JogadorPelada"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
