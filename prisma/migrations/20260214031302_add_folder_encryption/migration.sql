-- AlterTable
ALTER TABLE "folders" ADD COLUMN     "encryption_version" INTEGER,
ADD COLUMN     "is_encrypted" BOOLEAN NOT NULL DEFAULT false;
