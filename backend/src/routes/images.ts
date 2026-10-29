import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import { requireAdmin } from "../utils/auth.js";
import path from "path";
import fs from "fs";
import multer from "multer";
import { saveUpload, uploadsDirectory } from "../utils/storage.js";

export default function imagesRouter(prisma: PrismaClient) {
    const router = Router();

    const slugify = (value: string) =>
        value
            .trim()
            .toLowerCase()
            .replace(/['’]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");

    const normalizeFileName = (originalName: string) => {
        const ext = (path.extname(originalName) || ".png").toLowerCase();
        const base = path
            .basename(originalName, path.extname(originalName))
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "_")
            .replace(/[^a-z0-9_-]/g, "");

        return `${base || "image"}${ext}`;
    };

    if (!fs.existsSync(uploadsDirectory)) {
        fs.mkdirSync(uploadsDirectory, { recursive: true });
    }

    // Kept in memory so saveUpload can send it to R2 (or write it to
    // uploads/ in local dev); see utils/storage.ts.
    const upload = multer({ storage: multer.memoryStorage() });

    const uploadKey = (body: Record<string, unknown>, originalName: string) => {
        const showFolder = slugify(String(body.showName ?? "") || String(body.showId ?? ""));
        const seasonDigits = String(body.seasonNumber ?? "").replace(/\D/g, "");
        const seasonFolder = seasonDigits ? `season_${seasonDigits}` : "unassigned";
        const category = slugify(String(body.category ?? "contestants")) || "contestants";
        const fileName = normalizeFileName(originalName);

        // A show's logo isn't tied to a season, so it skips the season folder.
        if (!showFolder) return fileName;
        if (category === "logo") return `${showFolder}/logo/${fileName}`;
        return `${showFolder}/${seasonFolder}/${category}/${fileName}`;
    };

    router.post("/upload", requireAdmin(prisma), upload.single("image"), async (req, res) => {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        try {
            const file = await saveUpload(
                uploadKey(req.body ?? {}, req.file.originalname),
                req.file.buffer,
                req.file.mimetype,
            );
            res.json({ msg: "image successfully created", file });
        } catch (error) {
            console.error("Error saving upload:", error);
            res.status(500).json({ error: "Failed to save image" });
        }
    });

    router.get("/", async (req, res) => {
        fs.readdir(uploadsDirectory, (err, files) => {
            if (err) {
                console.error("Error reading uploads directory:", err);
                return res.status(500).json({ error: "Failed to read uploads directory" });
            }
            if (files.length === 0) {
                return res.status(404).json({ error: "No images found" });
            }

            return res.json({files});
        });
    });

    return router;
}
