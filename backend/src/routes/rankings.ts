import { PrismaClient, type RankType } from "@prisma/client";
import { Router } from "express";
import { isEpisodeRankable } from "../utils/episodeRankability.js";

export default function rankingsRouter(prisma: PrismaClient) {
  const router = Router();

  // Example route to get all rankings
  router.get("/", async (req, res) => {
    const rankings = await prisma.ranking.findMany();
    res.json(rankings);
  });

  // Aggregate insights: average rank position per contestant per episode (and
  // overall), computed across every user's submissions for a season+type.
  //
  // NOTE: Ranking has no @@unique([userId, episodeId, type]) constraint, so
  // nothing in the DB stops a user from submitting more than once for the
  // same episode+type. This query does not dedupe by user — it averages every
  // matching RankingEntry regardless of how many Rankings a user has for a
  // given episode+type. The app's own UI (checkPastRankings in
  // RankingComponent2.tsx) already prevents this in the normal flow, so a
  // duplicate would only occur via an out-of-band write; not worth a
  // migration for this feature.
  router.get("/insights/:seasonId", async (req, res) => {
    const { seasonId } = req.params;
    const type = ((req.query.type as string) ?? "FAVORITE").toUpperCase();
    if (type !== "FAVORITE" && type !== "WINNER") {
      return res.status(400).json({ error: "type must be FAVORITE or WINNER" });
    }

    const entries = await prisma.rankingEntry.findMany({
      where: {
        ranking: {
          type: type as RankType,
          episode: { seasonId },
        },
      },
      select: {
        position: true,
        contestantId: true,
        ranking: { select: { episodeId: true, episode: { select: { episodeNumber: true } } } },
      },
    });

    const contestants = await prisma.contestant.findMany({
      where: { seasonId },
      select: { id: true },
    });

    const episodeBuckets = new Map<
      string,
      { episodeNumber: number; sums: Map<string, number>; counts: Map<string, number> }
    >();

    for (const e of entries) {
      const episodeId = e.ranking.episodeId;
      const episodeNumber = e.ranking.episode.episodeNumber;
      if (!episodeBuckets.has(episodeId)) {
        episodeBuckets.set(episodeId, { episodeNumber, sums: new Map(), counts: new Map() });
      }
      const bucket = episodeBuckets.get(episodeId)!;
      bucket.sums.set(e.contestantId, (bucket.sums.get(e.contestantId) ?? 0) + e.position);
      bucket.counts.set(e.contestantId, (bucket.counts.get(e.contestantId) ?? 0) + 1);
    }

    const episodes = [...episodeBuckets.entries()]
      .sort((a, b) => a[1].episodeNumber - b[1].episodeNumber)
      .map(([episodeId, bucket]) => ({
        episodeId,
        episodeNumber: bucket.episodeNumber,
        contestantAverages: [...bucket.sums.entries()].map(([contestantId, sum]) => ({
          contestantId,
          averagePosition: sum / bucket.counts.get(contestantId)!,
        })),
      }));

    // Overall = mean of each contestant's per-episode averages (mean-of-means),
    // so every episode counts equally regardless of how many users submitted.
    const perContestantEpisodeAverages = new Map<string, number[]>();
    for (const episode of episodes) {
      for (const ca of episode.contestantAverages) {
        if (!perContestantEpisodeAverages.has(ca.contestantId)) {
          perContestantEpisodeAverages.set(ca.contestantId, []);
        }
        perContestantEpisodeAverages.get(ca.contestantId)!.push(ca.averagePosition);
      }
    }

    const overall = contestants.map((c) => {
      const vals = perContestantEpisodeAverages.get(c.id);
      return {
        contestantId: c.id,
        overallAveragePosition:
          vals && vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null,
      };
    });

    res.json({ seasonId, type, episodes, overall });
  });

  router.get("/userRankings", async (req, res) => {
    const { userId } = req.query;
    if (!userId || typeof userId !== "string") {
      return res.status(400).json({ error: "userId is required" });
    }
    const rankings = await prisma.ranking.findMany({
      where: { userId: userId },
      include: {episode: true, entries: true},
      orderBy: {
          episode: {
              episodeNumber: 'asc'
          }
      }
    });
    res.json(rankings);
  });

  router.post("/create", async (req, res) => {
    const randomId = Math.random().toString(36).slice(2, 8).toLowerCase();
    const body = req.body;
    if (!body.userId || typeof body.userId !== "string") {
      return res
        .status(400)
        .json({ error: "userId is required and must be a string" });
    }
    if (!body.episodeId || typeof body.episodeId !== "string") {
      return res
        .status(400)
        .json({ error: "episodeId is required and must be a string" });
    }
    if (
      !body.rankings ||
      !Array.isArray(body.rankings) ||
      body.rankings.length === 0
    ) {
      return res
        .status(400)
        .json({ error: "rankings is required and must be a non-empty array" });
    }

    const episode = await prisma.episode.findUnique({
      where: { id: body.episodeId },
      select: { airDate: true },
    });
    if (!episode) {
      return res.status(404).json({ error: "Episode not found" });
    }
    if (!isEpisodeRankable(episode.airDate)) {
      return res.status(403).json({ error: "Ranking is not yet open for this episode" });
    }

    try {
      const ranking = await prisma.ranking.create({
        data: {
          id: randomId,
          userId: body.userId,
          episodeId: body.episodeId,
          type: body.type,
          entries: {
            create: body.rankings.map((entry: any) => ({
              contestantId: entry.contestantId,
              position: entry.position,
            })),
          },
        },
        include: { entries: true },
      });
      res.json(ranking);
    } catch (error) {
      res.status(500).json({ error: "Failed to create ranking" });
    }
  });

  router.post("/createMany", async (req, res) => {
    const body = req.body;
    if (
      !body.rankingsList ||
      !Array.isArray(body.rankingsList) ||
      body.rankingsList.length === 0
    ) {
      return res.status(400).json({
        error: "rankingsList is required and must be a non-empty array",
      });
    }

    let rankingRows: { id: string; userId: string; episodeId: string; type: RankType }[];
    let entryRows: { rankingId: string; contestantId: string; position: number }[];
    try {
      rankingRows = body.rankingsList.map((ranking: any) => {
        if (
          !ranking.userId ||
          typeof ranking.userId !== "string" ||
          !ranking.episodeId ||
          typeof ranking.episodeId !== "string" ||
          !ranking.rankings ||
          !Array.isArray(ranking.rankings) ||
          ranking.rankings.length === 0
        ) {
          throw new Error(
            "Each ranking must have userId (string), episodeId (string), and rankings (non-empty array)"
          );
        }
        return {
          id: Math.random().toString(36).slice(2, 8).toLowerCase(),
          userId: ranking.userId,
          episodeId: ranking.episodeId,
          type: ranking.type as RankType,
        };
      });

      entryRows = body.rankingsList.flatMap((ranking: any, index: number) =>
        ranking.rankings.map((entry: any) => ({
          rankingId: rankingRows[index].id,
          contestantId: entry.contestantId,
          position: entry.position,
        }))
      );
    } catch (error) {
      return res.status(400).json({ error: (error as Error).message });
    }

    const episodeIds = [...new Set(rankingRows.map((r) => r.episodeId))];
    const episodes = await prisma.episode.findMany({
      where: { id: { in: episodeIds } },
      select: { id: true, airDate: true },
    });
    const episodeById = new Map(episodes.map((e) => [e.id, e]));
    const notRankable = rankingRows.some((r) => {
      const episode = episodeById.get(r.episodeId);
      return !episode || !isEpisodeRankable(episode.airDate);
    });
    if (notRankable) {
      return res.status(403).json({ error: "One or more episodes are not yet open for ranking" });
    }

    try {
      const [createdRankings] = await prisma.$transaction([
        prisma.ranking.createMany({ data: rankingRows, skipDuplicates: true }),
        prisma.rankingEntry.createMany({ data: entryRows, skipDuplicates: true }),
      ]);
      res.json(createdRankings);
    } catch (error) {
      res.status(500).json({ error: "Failed to create rankings" });
    }
  });

  router.get("/fetchRanking", async (req, res) => {
    const { rankingId } = req.body.rankingId;
    if (!rankingId || typeof rankingId !== "string") {
      return res.status(400).json({ error: "rankingId is required" });
    }
    const ranking = await prisma.ranking.findUnique({
      where: { id: rankingId },
    });
    if (!ranking) {
      return res.status(404).json({ error: "Ranking not found" });
    }
    res.json(ranking);
  });

  router.delete("/delete/:id", async (req, res) => {
    const { id } = req.params;
    try {
      // Ranking's entries relation has onDelete: Cascade, so this also
      // removes all RankingEntry rows for this ranking.
      const deletedRanking = await prisma.ranking.delete({
        where: { id },
      });
      res.json(deletedRanking);
    } catch (error) {
      res.status(404).json({ error: "Ranking not found" });
    }
  });

  return router;
}
