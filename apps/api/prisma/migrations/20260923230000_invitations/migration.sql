-- CreateTable
CREATE TABLE "invitations" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "invited_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "accepted_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invitations_token_hash_key" ON "invitations"("token_hash");

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

