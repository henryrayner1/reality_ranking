import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import { ensureTodaysDailyEpisode } from "../utils/dailyEpisode.js";
import { isSeasonEnded } from "../utils/episodeRankability.js";

export default function episodesRouter(prisma: PrismaClient) {
  const router = Router();

  // Example route to get all episodes
  router.get("/", async (req, res) => {
    const episodes = await prisma.episode.findMany({
      include: {
        eliminations: true
      },
    });
    res.json(episodes);
  });

  router.get("/byShow/:showId", async (req, res) => {
    const { showId } = req.params;

    const show = await prisma.show.findUnique({ where: { id: showId }, select: { rankingMode: true } });
    if (show?.rankingMode === "DAILY") {
      const currentSeason = await prisma.season.findFirst({
        where: { showId, isCurrent: true },
        select: { id: true, premiereDate: true, endDate: true },
      });
      if (currentSeason) await ensureTodaysDailyEpisode(prisma, currentSeason);
    }

    const episodes = await prisma.episode.findMany({
      where: {
        season: {
          showId: showId
        }
      },
      include: {
        eliminations: true
      },
      orderBy: {
        episodeNumber: 'asc'
      }
    });
    res.json(episodes);
  });

  router.post("/create", async (req, res) => {
    const randomId = Math.random().toString(36).slice(2, 8).toLowerCase();
    const body = req.body;
    const season = await prisma.season.findUnique({ where: { id: body.seasonId }, select: { endDate: true } });
    if (!season) {
      return res.status(404).json({ error: "Season not found" });
    }
    // No episodes once a season has ended, or airing after its end.
    if (season.endDate) {
      if (isSeasonEnded(season)) {
        return res.status(400).json({ error: "This season has ended — no new episodes can be added" });
      }
      if (body.airDate && new Date(body.airDate).getTime() > season.endDate.getTime()) {
        return res.status(400).json({ error: "Episode air date is after the season's end date" });
      }
    }
    const count = await prisma.episode.count({
      where: {
        seasonId: body.seasonId
      }
    });
    const episode = await prisma.episode.create({
      data: {
        id: randomId,
        seasonId: body.seasonId,
        airDate: body.airDate,
        episodeNumber: count + 1
      },
    });
    res.json(episode);
  });

  router.delete("/delete/:id", async (req, res) => {
    const { id } = req.params;
    const deletedEpisode = await prisma.episode.delete({
      where: { id },
    });
    res.json(deletedEpisode);
  });
  return router;
}
