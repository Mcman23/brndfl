-- AlterTable
ALTER TABLE "Solution" ADD COLUMN     "benefits" TEXT[],
ADD COLUMN     "cta" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "features" TEXT[],
ADD COLUMN     "image" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "metaDesc" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "metaTitle" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "process" TEXT[],
ADD COLUMN     "published" BOOLEAN NOT NULL DEFAULT false;
