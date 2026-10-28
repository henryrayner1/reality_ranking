import { PrismaClient } from "@prisma/client";

// Creates the season's pre-season Episode row (episodeNumber 0, no airDate or
// dayKey) if it doesn't have one yet. Pre-season rankings are stored against
// this row like any other episode's; when it's open is decided from the
// season itself (see isPreSeasonOpen), not from anything on the row.
export async function ensurePreSeasonEpisode(prisma: PrismaClient, seasonId: string): Promise<void> {
  const existing = await prisma.episode.findFirst({ where: { seasonId, isPreSeason: true }, select: { id: true } });
  if (existing) return;
  await prisma.episode.create({
    data: {
      id: Math.random().toString(36).slice(2, 8).toLowerCase(),
      seasonId,
      episodeNumber: 0,
      isPreSeason: true,
    },
  });
}
