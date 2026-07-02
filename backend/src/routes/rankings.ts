import { PrismaClient } from "@prisma/client";
import { Router } from "express";

export default function rankingsRouter(prisma: PrismaClient) {
  const router = Router();

  // Example route to get all rankings
  router.get("/", async (req, res) => {
    const rankings = await prisma.ranking.findMany();
    res.json(rankings);
  });

  router.get("/userRankings", async (req, res) => {
    const { userId } = req.query;
    if (!userId || typeof userId !== "string") {
      return res.status(400).json({ error: "userId is required" });
    }
    const rankings = await prisma.ranking.findMany({
      where: { userId: userId },
      include: {week: true},
      orderBy: {
          week: {
              weekNumber: 'asc'
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
    if (!body.weekId || typeof body.weekId !== "string") {
      return res
        .status(400)
        .json({ error: "weekId is required and must be a string" });
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

    const ranking = await prisma.ranking.create({
      data: {
        id: randomId,
        userId: body.userId,
        weekId: body.weekId,
        entries: body.rankings,
        type: body.type,
      },
    });
    res.json(ranking);
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

    const rankingsToCreate = body.rankingsList.map((ranking: any) => {
        if (
          !ranking.userId ||
          typeof ranking.userId !== "string" ||
          !ranking.weekId ||
          typeof ranking.weekId !== "string" ||
          !ranking.rankings ||
          !Array.isArray(ranking.rankings) ||
          ranking.rankings.length === 0
        ) {
          throw new Error(
            "Each ranking must have userId (string), weekId (string), and rankings (non-empty array)"
          );
        }
        const randomId = Math.random().toString(36).slice(2, 8).toLowerCase();
        return {
          id: randomId,
          userId: ranking.userId,
          weekId: ranking.weekId,
          entries: ranking.rankings,
          type: ranking.type,
        };
    });

    try {
      const createdRankings = await prisma.ranking.createMany({
        data: rankingsToCreate,
        skipDuplicates: true,
      });
      res.json(createdRankings);
    } catch (error) {
      res.status(500).json({ error: "Failed to create rankings" });
    }
    res.json();
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

  
  return router;
}
