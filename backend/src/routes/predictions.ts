import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import { requireUser } from "../utils/auth.js";
import { getRemainingContestantIds, isPredictionOpen } from "../utils/predictions.js";

export default function predictionsRouter(prisma: PrismaClient) {
  const router = Router();

  // The logged-in user's own predictions for a season. Scoped by token, not a
  // userId query param, so nobody can read other users' picks before an
  // episode airs.
  router.get("/mine", requireUser(), async (req, res) => {
    const { seasonId } = req.query;
    if (!seasonId || typeof seasonId !== "string") {
      return res.status(400).json({ error: "seasonId is required" });
    }
    const predictions = await prisma.prediction.findMany({
      where: { userId: res.locals.userId, episode: { seasonId } },
      select: { id: true, episodeId: true, contestantIds: true, updatedAt: true },
    });
    res.json(predictions);
  });

  // Create or replace the user's prediction for an upcoming episode.
  router.put("/", requireUser(), async (req, res) => {
    const { episodeId, contestantIds } = req.body ?? {};
    if (!episodeId || typeof episodeId !== "string") {
      return res.status(400).json({ error: "episodeId is required" });
    }
    if (
      !Array.isArray(contestantIds) ||
      contestantIds.length === 0 ||
      !contestantIds.every((id) => typeof id === "string")
    ) {
      return res.status(400).json({ error: "contestantIds must be a non-empty array of ids" });
    }
    if (new Set(contestantIds).size !== contestantIds.length) {
      return res.status(400).json({ error: "contestantIds must not repeat a contestant" });
    }

    const episode = await prisma.episode.findUnique({
      where: { id: episodeId },
      select: {
        airDate: true,
        isPreSeason: true,
        isFinale: true,
        eliminationCount: true,
        episodeNumber: true,
        season: {
          select: {
            endDate: true,
            show: { select: { rankingMode: true } },
            contestants: { select: { id: true } },
            episodes: {
              select: { episodeNumber: true, eliminations: { select: { contestantId: true } } },
            },
          },
        },
      },
    });
    if (!episode) return res.status(404).json({ error: "Episode not found" });
    if (!isPredictionOpen(episode, episode.season, episode.season.show.rankingMode)) {
      return res.status(403).json({ error: "Predictions for this episode are closed" });
    }

    const remaining = getRemainingContestantIds(
      episode.season.contestants.map((c) => c.id),
      episode.season.episodes.flatMap((e) =>
        e.eliminations.map((el) => ({ contestantId: el.contestantId, episodeNumber: e.episodeNumber }))
      ),
      episode.episodeNumber
    );
    const remainingSet = new Set(remaining);
    if (!contestantIds.every((id: string) => remainingSet.has(id))) {
      return res.status(400).json({ error: "Every pick must be a contestant still in the competition" });
    }
    if (episode.isFinale) {
      if (contestantIds.length !== remaining.length) {
        return res.status(400).json({ error: "A finale prediction must place every remaining contestant" });
      }
    } else if (contestantIds.length !== episode.eliminationCount) {
      return res
        .status(400)
        .json({ error: `Pick exactly ${episode.eliminationCount} contestant${episode.eliminationCount === 1 ? "" : "s"}` });
    }

    const userId = res.locals.userId as string;
    const prediction = await prisma.prediction.upsert({
      where: { userId_episodeId: { userId, episodeId } },
      create: { userId, episodeId, contestantIds },
      update: { contestantIds },
      select: { id: true, episodeId: true, contestantIds: true, updatedAt: true },
    });
    res.json(prediction);
  });

  return router;
}
