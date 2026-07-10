import "dotenv/config";
import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg"; 
import usersRouter from "./routes/users.js";
import rankingsRouter from "./routes/rankings.js";
import episodesRouter from "./routes/episodes.js";
import eliminationsRouter from "./routes/eliminations.js";
import contestantsRouter from "./routes/contestant.js";
import showsRouter from "./routes/show.js";
import process from "process";
import imagesRouter from "./routes/images.js";
import { startDailyEpisodeScheduler } from "./utils/dailyEpisodeScheduler.js";

const app = express();
const adapter = new PrismaPg({connectionString: process.env.DATABASE_URL});
const db = new PrismaClient({adapter});

startDailyEpisodeScheduler(db);

app.use(cors({origin: process.env.CORS_ORIGIN ?? true}));
// app.use(express.json());

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static('../uploads'));

app.use("/api/users", usersRouter(db));
app.use("/api/rankings", rankingsRouter(db));
app.use("/api/episodes", episodesRouter(db));
app.use("/api/eliminations", eliminationsRouter(db));
app.use("/api/contestants", contestantsRouter(db));
app.use("/api/shows", showsRouter(db));

app.use('/api/images', imagesRouter(db));

const port = process.env.PORT ?? 4000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

interface AppError extends Error {
    status?: number;
}

app.use((err: AppError, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
});

process.on('unhandledRejection', err => { console.error(err); });
process.on('uncaughtException', err => { console.error(err); });