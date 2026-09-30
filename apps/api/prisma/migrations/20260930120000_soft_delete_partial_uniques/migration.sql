-- DropIndex
DROP INDEX "answers_survey_id_origin_ip_key";

-- DropIndex
DROP INDEX "is_unique";

-- DropEnum
DROP TYPE "answer_type";

-- CreateIndex
CREATE UNIQUE INDEX "answers_survey_id_origin_ip_key" ON "answers"("survey_id", "origin_ip") WHERE (deleted_at IS NULL);

-- CreateIndex
CREATE UNIQUE INDEX "is_unique" ON "surveys"("slug") WHERE (deleted_at IS NULL);

