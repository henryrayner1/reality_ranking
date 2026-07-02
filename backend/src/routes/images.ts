import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";

export default function imagesRouter(prisma: PrismaClient) {
    const router = Router();
    const uploadsDirectory = path.resolve(process.cwd(), "../uploads");

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

    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            const showName = String(req.body?.showName ?? req.query?.showName ?? "");
            const showIdFallback = String(req.body?.showId ?? req.query?.showId ?? "");
            const showFolder = slugify(showName || showIdFallback);
            const seasonRaw = String(req.body?.seasonNumber ?? req.query?.seasonNumber ?? "");
            const seasonDigits = seasonRaw.replace(/\D/g, "");
            const seasonFolder = seasonDigits ? `season_${seasonDigits}` : "unassigned";
            const category = slugify(String(req.body?.category ?? req.query?.category ?? "contestants")) || "contestants";

            const targetDirectory = showFolder
                ? path.join(uploadsDirectory, showFolder, seasonFolder, category)
                : uploadsDirectory;

            if (!fs.existsSync(targetDirectory)) {
                fs.mkdirSync(targetDirectory, { recursive: true });
            }

            cb(null, targetDirectory);
        },
        filename: (req, file, cb) => {
            cb(null, normalizeFileName(file.originalname));
        },
    });

    const upload = multer({ storage });

    router.post("/upload", upload.single("image"), (req, res) => {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const relativePath = path.relative(uploadsDirectory, req.file.path).split(path.sep).join("/");
        res.json({
            msg: "image successfully created",
            file: `/uploads/${relativePath}`,
        });
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
