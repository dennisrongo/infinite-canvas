-- AlterTable
ALTER TABLE "notes" ADD COLUMN     "encryption_version" INTEGER,
ADD COLUMN     "is_encrypted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "dek_version" INTEGER DEFAULT 1,
ADD COLUMN     "encryption_salt" TEXT,
ADD COLUMN     "kdf_iterations" INTEGER,
ADD COLUMN     "kdf_memory_cost" INTEGER,
ADD COLUMN     "kdf_parallelism" INTEGER,
ADD COLUMN     "wrapped_dek" TEXT;
