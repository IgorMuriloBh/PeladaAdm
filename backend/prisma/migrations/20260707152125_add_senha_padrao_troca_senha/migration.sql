-- AlterTable
ALTER TABLE "Pelada" ADD COLUMN     "senhaPadrao" TEXT NOT NULL DEFAULT 'senha001';

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "precisaTrocarSenha" BOOLEAN NOT NULL DEFAULT false;
