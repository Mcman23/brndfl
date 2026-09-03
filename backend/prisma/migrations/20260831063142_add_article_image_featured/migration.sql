-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "image" TEXT NOT NULL DEFAULT '';
