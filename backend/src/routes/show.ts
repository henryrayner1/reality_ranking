import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import fs from "fs";
import path from "path";

export default function showsRouter(prisma: PrismaClient) {
    const router = Router();
    const uploadsDirectory = path.resolve(process.cwd(), "../uploads");

    if (!fs.existsSync(uploadsDirectory)) {
        fs.mkdirSync(uploadsDirectory, { recursive: true });
    }

    const toFolderSegment = (value: string) =>
        value
            .trim()
            .toLowerCase()
            .replace(/['’]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "") || "unknown";

    router.get("/", async (req, res) => {
        const shows = await prisma.show.findMany({
            orderBy: { createdAt: 'asc' },
            include: {
                seasons: {
                    include: {
                        contestants: true,
                        weeks: {
                            include: {
                                eliminations: {
                                    include: {
                                        contestant: true
                                    }
                                }
                            }
                        },
                    }
                }
            }
        });
        res.json(shows);
    });

    router.get("/:showId", async (req, res) => {
        const { showId } = req.params;
        const show = await prisma.show.findUnique({
            where: {
                id: showId
            },
            include: {
                seasons: true
            }
        });
        res.json(show);
    });

    router.get("/current/:showId", async (req, res) => {
        const { showId } = req.params;
        const currentSeason = await prisma.season.findFirst({
            where: {
                showId: showId,
                isCurrent: true
            },
            include: {
                contestants: true,
                weeks: true,
            }
        });
        res.json(currentSeason);
    });

    router.post("/add", async (req, res) => {
        const payload = req.body?.show ?? req.body;
        if (!payload || !payload.name) {
            return res.status(400).json({ error: "name is required" });
        }

        const newShow = await prisma.show.create({
            data: {
                name: payload.name,
                network: payload.network ?? "",
                currSeason: payload.currSeason ?? 1
            }
        });

        const showFolderName = toFolderSegment(newShow.name);
        const showFolderPath = path.join(uploadsDirectory, showFolderName);
        fs.mkdirSync(showFolderPath, { recursive: true });

        res.json(newShow);
    });

    router.post("/changeCurrentSeason", async (req, res) => {
        const { showId, newSeasonId } = req.body;
        if (!showId || !newSeasonId) {
            return res.status(400).json({ error: "showId and newSeasonId are required" });
        }

        // Set all seasons of the show to is_current = false
        await prisma.season.updateMany({
            where: {
                showId: showId
            },
            data: {
                isCurrent: false
            }
        });
        
        // Set the new current season to isCurrent = true
        const updatedSeason = await prisma.season.update({
            where: {
                id: newSeasonId
            },
            data: {
                isCurrent: true
            }
        });
        res.json(updatedSeason);
    });

    router.post("/addSeason", async (req, res) => {
        const randomId = Math.random().toString(36).substring(2, 12);
        const { showId, seasonNumber, isCurrent } = req.body;
        if (!showId || !seasonNumber) {
            return res.status(400).json({ error: "showId and seasonNumber are required" });
        }
        const newSeason = await prisma.season.create({
            data: {
                id: randomId,
                showId: showId,
                seasonNumber: seasonNumber,
                isCurrent: isCurrent ?? false
            }
        });

        const show = await prisma.show.findUnique({
            where: {
                id: showId
            },
            select: {
                name: true
            }
        });

        if (show?.name) {
            const showFolderName = toFolderSegment(show.name);
            const seasonFolderName = `season_${newSeason.seasonNumber}`;
            const seasonFolderPath = path.join(uploadsDirectory, showFolderName, seasonFolderName, "contestants");
            fs.mkdirSync(seasonFolderPath, { recursive: true });
        }

        res.json(newSeason);
    });

    router.delete("/deleteSeason/:seasonId", async (req, res) => {
        const { seasonId } = req.params;
        await prisma.season.delete({
            where: {
                id: seasonId
            }
        });
        res.json({ success: true });
    });

    router.delete("/delete/:showId", async (req, res) => {
        const { showId } = req.params;
        await prisma.show.delete({
            where: {
                id: showId
            }
        });
        res.json({ success: true });
    });

    return router;
}