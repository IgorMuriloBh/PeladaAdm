-- CreateEnum
CREATE TYPE "TipoChavePix" AS ENUM ('TELEFONE', 'CPF_CNPJ', 'EMAIL', 'ALEATORIA', 'QRCODE');

-- CreateTable
CREATE TABLE "ChavePix" (
    "id" TEXT NOT NULL,
    "tipo" "TipoChavePix" NOT NULL,
    "valor" TEXT,
    "imagem" TEXT,
    "descricao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "peladaId" TEXT NOT NULL,

    CONSTRAINT "ChavePix_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ChavePix" ADD CONSTRAINT "ChavePix_peladaId_fkey" FOREIGN KEY ("peladaId") REFERENCES "Pelada"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
