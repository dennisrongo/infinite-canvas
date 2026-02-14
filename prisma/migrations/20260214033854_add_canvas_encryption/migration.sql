-- AlterTable
ALTER TABLE "canvases" ADD COLUMN     "encryption_version" INTEGER,
ADD COLUMN     "is_encrypted" BOOLEAN NOT NULL DEFAULT false;
