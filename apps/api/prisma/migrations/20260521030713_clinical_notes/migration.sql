-- CreateTable
CREATE TABLE "ClinicalNote" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicalNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalNoteRevision" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicalNoteRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClinicalNote_appointmentId_idx" ON "ClinicalNote"("appointmentId");

-- CreateIndex
CREATE INDEX "ClinicalNote_authorId_idx" ON "ClinicalNote"("authorId");

-- CreateIndex
CREATE INDEX "ClinicalNoteRevision_noteId_createdAt_idx" ON "ClinicalNoteRevision"("noteId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "ClinicalNote" ADD CONSTRAINT "ClinicalNote_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalNote" ADD CONSTRAINT "ClinicalNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalNoteRevision" ADD CONSTRAINT "ClinicalNoteRevision_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "ClinicalNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
