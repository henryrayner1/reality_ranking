import { PrismaClient } from "@prisma/client";
import { Router } from "express";

export default function weeksRouter(prisma: PrismaClient) {
  const router = Router();

  // Example route to get all weeks
  router.get("/", async (req, res) => {
    const weeks = await prisma.week.findMany({
      include: {
        eliminations: true
      },
    });
    res.json(weeks);
  });

  router.get("/byShow/:showId", async (req, res) => {
    const { showId } = req.params;
    const weeks = await prisma.week.findMany({
      where: {
        season: {
          showId: showId
        }
      },
      include: {
        eliminations: true
      },
      orderBy: {
        weekNumber: 'asc'
      }
    });
    res.json(weeks);
  });

  router.post("/create", async (req, res) => {
    const randomId = Math.random().toString(36).slice(2, 8).toLowerCase();
    const body = req.body;
    const count = await prisma.week.count({
      where: {
        seasonId: body.seasonId
      }
    });
    const week = await prisma.week.create({
      data: {
        id: randomId,
        seasonId: body.seasonId,
        airDate: body.airDate,
        weekNumber: count + 1
      },
    });
    res.json(week);
  });

  router.delete("/delete/:id", async (req, res) => {
    const { id } = req.params;
    const deletedWeek = await prisma.week.delete({
      where: { id },
    });
    res.json(deletedWeek);
  });
  return router;
}
