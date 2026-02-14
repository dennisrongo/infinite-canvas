-- CreateIndex
CREATE INDEX "notes_updated_at_idx" ON "notes"("updated_at");

-- CreateIndex
CREATE INDEX "notes_canvas_id_updated_at_idx" ON "notes"("canvas_id", "updated_at");

-- CreateIndex
CREATE INDEX "notes_canvas_id_created_at_idx" ON "notes"("canvas_id", "created_at");
