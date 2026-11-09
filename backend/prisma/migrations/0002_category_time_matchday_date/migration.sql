-- Hora fija por categoría + día por fecha
ALTER TABLE "Category" ADD COLUMN "kickoffTime" TEXT;
ALTER TABLE "Matchday" ADD COLUMN "date" TIMESTAMP(3);
