import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import { requireAdmin } from "../utils/auth.js";

// Winner and runner-up always mean 1st and 2nd; any other finalist's place
// (3rd, 4th, ...) has to be given explicitly.
const defaultPlacement = (eliminationType: string | undefined, placement: number | null | undefined) => {
    if (eliminationType === "WINNER") return 1;
    if (eliminationType === "RUNNER_UP") return 2;
    return placement ?? null;
};

export default function eliminationsRouter(prisma: PrismaClient) {
    const router = Router();

    router.get("/", async (req, res) => {
        const eliminations = await prisma.elimination.findMany({
            include: {episode: true,
                contestant: true
            },
            orderBy: {
                episode: {
                    episodeNumber: 'asc'
                }
            }
        })

        // Group eliminations by episodeId. seasonId is included so callers can
        // scope this globally-fetched (not season-filtered) list down to a
        // single season — episodeNumber alone collides across shows/seasons,
        // e.g. every show has an "episode 1".
        const episodeEliminationsMap = eliminations.reduce((acc, elim) => {
            if (!acc[elim.episodeId]) {
                acc[elim.episodeId] = {
                    episodeId: elim.episodeId,
                    episodeNumber: elim.episode.episodeNumber,
                    seasonId: elim.episode.seasonId,
                    contestantIds: [],
                    placements: {}
                };
            }
            if (elim.contestantId && !acc[elim.episodeId].contestantIds.includes(elim.contestantId)) {
                acc[elim.episodeId].contestantIds.push(elim.contestantId);
            }
            if (elim.contestantId && elim.placement != null) {
                acc[elim.episodeId].placements[elim.contestantId] = elim.placement;
            }
            return acc;
        }, {} as { [key: string]: { episodeId: string, episodeNumber: number, seasonId: string, contestantIds: string[], placements: Record<string, number> } });

        // Convert to array and sort by episodeNumber to guarantee order
        const episodeEliminations = Object.values(episodeEliminationsMap).sort((a, b) => a.episodeNumber - b.episodeNumber);

        res.json(episodeEliminations);
    });

    router.get("/bySeason/:seasonId", async (req, res) => {
        const { seasonId } = req.params;
        const eliminations = await prisma.elimination.findMany({
            where: {
                episode: {
                    seasonId: seasonId
                }
            },
            include: {
                episode: true,
                contestant: true
            },
            orderBy: {
                episode: {
                    episodeNumber: 'asc'
                }
            }
        });
        res.json(eliminations);
    });

    router.post("/add", requireAdmin(prisma), async (req, res) => {
        const randomId = Math.random().toString(36).slice(2, 12).toLowerCase();
        const { episodeId, contestantId, eliminationType } = req.body;
        if (!episodeId || !contestantId) {
            return res.status(400).json({ error: "episodeId and contestantId are required" });
        }
        if (req.body.placement != null && !(Number.isInteger(req.body.placement) && req.body.placement >= 1)) {
            return res.status(400).json({ error: "placement must be a whole number of 1 or more" });
        }
        const placement = defaultPlacement(eliminationType, req.body.placement);
        const newElimination = await prisma.$transaction(async (tx) => {
            const elimination = await tx.elimination.create({
                data: {
                    id: randomId,
                    episodeId: episodeId,
                    contestantId: contestantId,
                    placement,
                    ...(eliminationType ? { eliminationType } : {})
                },
                include: {
                    episode: true,
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
            episodeNumber: newElimination.episode.episodeNumber
        });
    });

    router.delete("/delete/:id", requireAdmin(prisma), async (req, res) => {
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

    router.post("/addMany", requireAdmin(prisma), async (req, res) => {
        const eliminationsList = req.body.eliminationsList;

        if (!eliminationsList || !Array.isArray(eliminationsList) || eliminationsList.length === 0) {
            return res.status(400).json({ error: "eliminationsList is required and must be a non-empty array" });
        }

        const newElimination = await prisma.elimination.createMany({
            data: eliminationsList.map((elim: { episodeId: string; contestantId: string; seasonId: string }) => ({
                id: Math.random().toString(36).slice(2, 12).toLowerCase(),
                episodeId: elim.episodeId,
                contestantId: elim.contestantId,
                seasonId: elim.seasonId
            }))
        });

        // Fetch the created eliminations with episode information
        const createdEliminations = await prisma.elimination.findMany({
            where: {
                episodeId: { in: eliminationsList.map((elim: { episodeId: string }) => elim.episodeId) }
            },
            include: { episode: true },
            orderBy: {
                episode: {
                    episodeNumber: 'asc'
                }
            }
        });

        res.json({
            count: newElimination.count,
            eliminations: createdEliminations.map(elim => ({
                ...elim,
                episodeNumber: elim.episode.episodeNumber
            }))
        });
    });

    router.get(("/getEpisode"), async (req, res) => {
        const { episodeId } = req.query;
        if (!episodeId || typeof episodeId !== "string") {
            return res.status(400).json({ error: "episodeId is required" });
        }
        const eliminations = await prisma.elimination.findMany({
            where: { episodeId },
            include: { episode: true }
        });
        const episodeEliminations = {
            episodeNumber: eliminations.length > 0 ? eliminations[0].episode.episodeNumber : null,
            contestantIds: eliminations.map(e => e.contestantId)
        };
        res.json(episodeEliminations);
    });

    router.delete("/deleteMany", requireAdmin(prisma), async (req, res) => {
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
