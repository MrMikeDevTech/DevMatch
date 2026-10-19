-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "code_content" TEXT,
ADD COLUMN     "code_language" VARCHAR(30),
ADD COLUMN     "image_url" VARCHAR(500),
ALTER COLUMN "content" DROP NOT NULL;
