-- DropIndex
DROP INDEX "answers_origin_ip_key";

-- CreateIndex
CREATE UNIQUE INDEX "answers_survey_id_origin_ip_key" ON "answers"("survey_id", "origin_ip");

