import { PrismaClient } from "@prisma/client";
import { Router } from "express";

export default function eliminationsRouter(prisma: PrismaClient) {
    const router = Router();

    router.get("/", async (req, res) => {
        const eliminations = await prisma.elimination.findMany({
            include: {week: true,
                contestant: true 
            },
            orderBy: {
                week: {
                    weekNumber: 'asc'
                }
            }
        })

        // Group eliminations by weekId
        const weeklyEliminationsMap = eliminations.reduce((acc, elim) => {
            if (!acc[elim.weekId]) {
                acc[elim.weekId] = {
                    weekId: elim.weekId,
                    weekNumber: elim.week.weekNumber,
                    contestantIds: []
                };
            }
            if (elim.contestantId && !acc[elim.weekId].contestantIds.includes(elim.contestantId)) {
                acc[elim.weekId].contestantIds.push(elim.contestantId);
            }
            return acc;
        }, {} as { [key: string]: { weekId: string, weekNumber: number, contestantIds: string[] } });
        
        // Convert to array and sort by weekNumber to guarantee order
        const weeklyEliminations = Object.values(weeklyEliminationsMap).sort((a, b) => a.weekNumber - b.weekNumber);
        
        res.json(weeklyEliminations);
    });

    router.get("/bySeason/:seasonId", async (req, res) => {
        const { seasonId } = req.params;
        const eliminations = await prisma.elimination.findMany({
            where: {
                week: {
                    seasonId: seasonId
                }
            },
            include: {
                week: true,
                contestant: true
            },
            orderBy: {
                week: {
                    weekNumber: 'asc'
                }
            }
        });
        res.json(eliminations);
    });

    router.post("/add", async (req, res) => {
        const randomId = Math.random().toString(36).slice(2, 12).toLowerCase();
        const { weekId, contestantId, eliminationType } = req.body;
        if (!weekId || !contestantId) {
            return res.status(400).json({ error: "weekId and contestantId are required" });
        }
        const newElimination = await prisma.$transaction(async (tx) => {
            const elimination = await tx.elimination.create({
                data: {
                    id: randomId,
                    weekId: weekId,
                    contestantId: contestantId,
                    ...(eliminationType ? { eliminationType } : {})
                },
                include: {
                    week: true,
                    contestant: true
                }
            });
            await tx.contestant.update({
                where: { id: contestantId },
                data: { status: "ELIMINATED" }
            });
            return elimination;
        });
        res.json({
            ...newElimination,
            weekNumber: newElimination.week.weekNumber
        });
    });

    router.delete("/delete/:id", async (req, res) => {
        const { id } = req.params;
        const deletedElimination = await prisma.$transaction(async (tx) => {
            const deleted = await tx.elimination.delete({
                where: { id },
            });
            await tx.contestant.update({
                where: { id: deleted.contestantId },
                data: { status: "ACTIVE" }
            });
            return deleted;
        });
        res.json(deletedElimination);
    });

    router.post("/addMany", async (req, res) => {
        const eliminationsList = req.body.eliminationsList;

        if (!eliminationsList || !Array.isArray(eliminationsList) || eliminationsList.length === 0) {
            return res.status(400).json({ error: "eliminationsList is required and must be a non-empty array" });
        }

        const newElimination = await prisma.elimination.createMany({
            data: eliminationsList.map((elim: { weekId: string; contestantId: string; seasonId: string }) => ({
                id: Math.random().toString(36).slice(2, 12).toLowerCase(),
                weekId: elim.weekId,
                contestantId: elim.contestantId,
                seasonId: elim.seasonId
            }))
        });

        // Fetch the created eliminations with week information
        const createdEliminations = await prisma.elimination.findMany({
            where: {
                weekId: { in: eliminationsList.map((elim: { weekId: string }) => elim.weekId) }
            },
            include: { week: true },
            orderBy: {
                week: {
                    weekNumber: 'asc'
                }
            }
        });

        res.json({
            count: newElimination.count,
            eliminations: createdEliminations.map(elim => ({
                ...elim,
                weekNumber: elim.week.weekNumber
            }))
        });
    });

    router.get(("/getWeek"), async (req, res) => {
        const { weekId } = req.query;
        if (!weekId || typeof weekId !== "string") {
            return res.status(400).json({ error: "weekId is required" });
        }
        const eliminations = await prisma.elimination.findMany({
            where: { weekId },
            include: { week: true }
        });
        const weekEliminations = {
            weekNumber: eliminations.length > 0 ? eliminations[0].week.weekNumber : null,
            contestantIds: eliminations.map(e => e.contestantId)
        };
        res.json(weekEliminations);
    });

    router.delete("/deleteMany", async (req, res) => {
        const  eliminationsList  = req.body;
        if (!eliminationsList || !Array.isArray(eliminationsList) || eliminationsList.length === 0) {
            return res.status(400).json({ error: "eliminationsList is required and must be a non-empty array" });
        }

        const deletedEliminations = await prisma.elimination.deleteMany({
            where: {
                id: { in: eliminationsList }
            }
        });
        res.json(deletedEliminations);
    });

    return router;
}