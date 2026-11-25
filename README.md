# Realitier

Realitier lets fans rank the contestants on their favourite reality TV shows as the season airs, predict who's going home, and see how everyone's opinions change over time.

Live site: <https://henryrayner1.github.io/reality_ranking/>

## Features

- **My Rankings**: each episode, drag contestants into your Favorite and Winner orders. Daily-ranking shows such as Big Brother open a new ranking each day. Pre-season rankings and finale placements are supported too.
- **Predictions**: pick who you think will go home in the next episode, or order the finalists for the finale. Picks can be changed until the episode airs. Past episodes show your picks next to who was really eliminated.
- **Insights**: the season-wide average rankings table, a per-contestant trend chart, and aggregate prediction results with vote shares.
- **Admin**: manage shows, seasons, contestants (photos, nicknames), episodes and eliminations.

## Tech stack

- **Frontend** (repo root): React, TypeScript, Vite, React Query, Redux Toolkit, Bootstrap and Tailwind, dnd-kit, Recharts. Deployed to GitHub Pages by `.github/workflows/deploy-pages.yml` on every push to `main`.
- **Backend** (`backend/`): Express, Prisma and PostgreSQL. Deployed on Render, with uploaded images stored in Cloudflare R2.

## Development

```bash
npm install            # frontend (also installs the pre-push hook)
npm install --prefix backend
npm start              # frontend on :5173 and backend on :4000 together
```

Other commands:

| Command | What it does |
|---|---|
| `npm run dev` | Frontend only (proxies `/api` to `localhost:4000`) |
| `npm run build` | Type-check and build the frontend into `dist/` |
| `npm run test:run` | Run the Vitest suite once |
| `npm run lint` | ESLint |
| `npm run dev --prefix backend` | Backend only, with reload on change |

The backend reads `backend/.env` (`DATABASE_URL`, `AUTH_TOKEN_SECRET`, `ADMIN_API_SECRET`, and optional `R2_*` storage settings). **The database it points at is the live production data**, so local edits and migrations affect the real site. See `CLAUDE.md` for details.

A pre-push hook runs the tests and the build before every `git push`.

## Name

The site was called "Reality Ranking" before it became RealiTier. The repository and the GitHub Pages path are still named `reality_ranking`.
