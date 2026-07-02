import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import z from "zod";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";

function randomFrom(str: string, length: number) {
    let result = "";
    for (let i = 0; i < length; i++) {
        result += str[Math.floor(Math.random() * str.length)];
    }
    return result;
}

function generateUserId() {
    const chars = "abcdefghijklmnopqrstuvwxyz";
    const nums = "0123456789";

    const letters = randomFrom(chars, 4);
    const numbers = randomFrom(nums, 2);
    
    return letters + numbers;
}

export default function usersRouter(prisma: PrismaClient) {
    const router = Router();

    // Example route to get all users
    router.get("/", async (req, res) => {
        const users = await prisma.user.findMany();
        res.json(users);
    }); 

    router.get("/lookup", async (req, res) => {
        const { email } = req.query;
        if (!email || typeof email !== "string") {
            return res.status(400).json({ error: "Email is required" });
        }
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json({ id: user.id });
    });

    router.post("/login", async (req, res) => {
        const body = z.object({ email: z.string().email(), password: z.string() }).safeParse(req.body);
        if (!body.success) return res.status(400).json(body.error);

        const u = await prisma.user.findUnique({ where: { email: body.data.email } });
        if (!u) return res.status(404).json({ error: "user not found" });

        const passwordMatch = await bcrypt.compare(body.data.password, u.password);
        if (!passwordMatch) return res.status(401).json({ error: "invalid password" });

        res.status(200).json(u);
    });

    router.post("/create", async (req, res) => {
        const randomId = generateUserId();
        
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);
        req.body.password = hashedPassword;

        const body = z.object({ email: z.string().email(), password: z.string() }).safeParse(req.body);
        if (!body.success) return res.status(400).json(body.error);

        const u = await prisma.user.upsert({
        where: { email: body.data.email },
        update: {},
        create: { 
            id: randomId,
            email: body.data.email,
            password: body.data.password
        }
        });
        res.json(u);
    });
    return router;
}