import { PrismaClient } from "@prisma/client";
import { Router } from "express";

export default function contestantsRouter(prisma: PrismaClient) {
    const router = Router();

    router.get("/", async (req, res) => {
        const contestants = await prisma.contestant.findMany({
            orderBy: {
                name: 'asc'
            }
        });
        res.json(contestants);
    });

    router.get("/bySeason/:seasonId", async (req, res) => {
        const { seasonId } = req.params;
        const contestants = await prisma.contestant.findMany({
            where: {
                seasonId: seasonId
            },
            orderBy: {
                name: 'asc'
            }
        });
        res.json(contestants);
    });

    router.get("/byShow/:showId", async (req, res) => {
        const { showId } = req.params;
        const contestants = await prisma.contestant.findMany({
            where: {
                season: {
                    showId: showId
                }
            },
            orderBy: {
                name: 'asc'
            }
        });
        res.json(contestants);
    });

    router.post("/add", async (req, res) => {
        const { name, seasonId, photoUrl } = req.body;
        if (!name || !seasonId) {
            return res.status(400).json({ error: "name and seasonId are required" });
        }
        const newContestant = await prisma.contestant.create({
            data: {
                name,
                seasonId: seasonId,
                photoUrl: photoUrl || ".src/assets/contestant_placeholder.png"
            }
        });
        res.json(newContestant);
    });

    router.patch("/:contestantId", async (req, res) => {
        const { contestantId } = req.params;
        const { photoUrl } = req.body;
        const updatedContestant = await prisma.contestant.update({
            where: {
                id: contestantId
            },
            data: {
                ...(photoUrl !== undefined && { photoUrl })
            }
        });
        res.json(updatedContestant);
    });

    router.delete("/delete/:contestantId", async (req, res) => {
        const { contestantId } = req.params;
        await prisma.contestant.delete({
            where: {
                id: contestantId
            }
        });
        res.json({ success: true });
    });

    router.post("/addMany", async (req, res) => {
        const contestantsList = req.body.contestantsList;
        if (!contestantsList || !Array.isArray(contestantsList)) {
            return res.status(400).json({ error: "contestantsList is required and should be an array" });
        }
        const newContestants = await prisma.contestant.createMany({
            data: contestantsList.map((contestant: { name: string; seasonId: string }) => ({
                name: contestant.name,
                seasonId: contestant.seasonId,
                photoUrl: ".src/assets/contestant_placeholder.png"
            }))
        });
        res.json(newContestants);
    });
    

    return router;
}