import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  // Migrate/introspection go through the direct (unpooled) connection —
  // Neon's pooler doesn't support the session-level operations Migrate
  // needs. The app itself connects separately via its own pg adapter in
  // server.ts, using DATABASE_URL (the pooled connection).
  datasource: {
    url: env('DIRECT_DATABASE_URL'),
  },
})
