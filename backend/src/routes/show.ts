import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import fs from "fs";
import path from "path";
import { ensureTodaysDailyEpisode, ensureTodaysDailyEpisodesForAllShows } from "../utils/dailyEpisode.js";

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
        await ensureTodaysDailyEpisodesForAllShows(prisma);

        const shows = await prisma.show.findMany({
            orderBy: { createdAt: 'asc' },
            include: {
                seasons: {
                    include: {
                        contestants: true,
                        episodes: {
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
        const show = await prisma.show.findUnique({ where: { id: showId }, select: { rankingMode: true } });
        if (show?.rankingMode === "DAILY") {
            const currentSeasonId = await prisma.season.findFirst({
                where: { showId, isCurrent: true },
                select: { id: true, premiereDate: true },
            });
            if (currentSeasonId) await ensureTodaysDailyEpisode(prisma, currentSeasonId);
        }

        const currentSeason = await prisma.season.findFirst({
            where: {
                showId: showId,
                isCurrent: true
            },
            include: {
                contestants: true,
                episodes: true,
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
                currSeason: payload.currSeason ?? 1,
                rankingMode: payload.rankingMode ?? "EPISODE"
            }
        });

        const showFolderName = toFolderSegment(newShow.name);
        const showFolderPath = path.join(uploadsDirectory, showFolderName);
        fs.mkdirSync(showFolderPath, { recursive: true });

        res.json(newShow);
    });

    router.post("/update", async (req, res) => {
        const { showId, rankingMode } = req.body;
        if (!showId || (rankingMode !== "EPISODE" && rankingMode !== "DAILY")) {
            return res.status(400).json({ error: "showId and a valid rankingMode are required" });
        }
        const updatedShow = await prisma.show.update({
            where: { id: showId },
            data: { rankingMode }
        });
        res.json(updatedShow);
    });

    router.post("/updateSeason", async (req, res) => {
        const { seasonId, premiereDate } = req.body;
        if (!seasonId) {
            return res.status(400).json({ error: "seasonId is required" });
        }
        const updatedSeason = await prisma.season.update({
            where: { id: seasonId },
            data: { premiereDate: premiereDate ?? null }
        });
        res.json(updatedSeason);
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
        const { showId, seasonNumber, isCurrent, premiereDate } = req.body;
        if (!showId || !seasonNumber) {
            return res.status(400).json({ error: "showId and seasonNumber are required" });
        }
        const newSeason = await prisma.season.create({
            data: {
                id: randomId,
                showId: showId,
                seasonNumber: seasonNumber,
                isCurrent: isCurrent ?? false,
                premiereDate: premiereDate ?? null
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