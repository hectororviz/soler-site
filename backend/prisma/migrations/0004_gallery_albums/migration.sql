-- Álbumes de galería: un post con varias fotos navegables en modal
CREATE TABLE "GalleryAlbum" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "coverImageId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GalleryAlbum_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "GalleryImage" ADD COLUMN "albumId" TEXT;

ALTER TABLE "GalleryImage" ADD CONSTRAINT "GalleryImage_albumId_fkey"
    FOREIGN KEY ("albumId") REFERENCES "GalleryAlbum"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "GalleryImage_albumId_idx" ON "GalleryImage"("albumId");
