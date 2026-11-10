export interface Season {
  id: string;
  label: string;
  active: boolean;
}

export interface AdminTournament {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  seasonId: string;
  season?: { label: string };
  categories: { id: string; name: string; slug: string }[];
}

export interface AdminCategory {
  id: string;
  slug: string;
  name: string;
  tournamentId: string;
  order: number;
  kickoffTime: string | null;
}

export interface AdminClub {
  id: string;
  name: string;
  shortName: string;
  slug: string;
  crestPath: string | null;
  externalId: string | null;
  mapsUrl: string | null;
}

export interface Participant {
  id: string;
  tournamentId: string;
  clubId: string;
  categoryIds: string[];
  club: AdminClub;
}

export interface AdminMatchday {
  id: string;
  label: string;
  order: number;
  published: boolean;
  tournamentId: string;
  date: string | null;
  _count?: { matches: number };
}

export interface AdminClash {
  id: string;
  homeClub: AdminClub;
  awayClub: AdminClub;
  categories: {
    id: string;
    categoryId: string;
    category?: { name: string };
    kickoff: string | null;
    venue: string | null;
    status: string;
  }[];
}

export interface AdminBroadcast {
  id: string;
  status: string;
  categoryMatchId: string;
  streamUrl: string | null;
  embedUrl: string | null;
}

export interface Sponsor {
  id: string;
  name: string;
  logoPath: string | null;
  href: string | null;
  order: number;
  active: boolean;
}

export interface PageSlot {
  slot: string;
  title: string | null;
  body: string | null;
  imagePath: string | null;
}

export interface GalleryImage {
  id: string;
  imagePath: string;
  caption: string | null;
  order: number;
  active: boolean;
  albumId: string | null;
}

export interface GalleryAlbum {
  id: string;
  title: string;
  body: string | null;
  coverImageId: string | null;
  order: number;
  active: boolean;
  images: GalleryImage[];
}
