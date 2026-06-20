import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Lazy-initialize PrismaClient so that `import { db }` doesn't crash
// during `next build` when the generated client or DATABASE_URL is absent.
function createClient(): PrismaClient {
  const logConfig =
    process.env.NODE_ENV === 'production'
      ? (['error', 'warn'] as const)
      : (['query', 'error', 'warn'] as const)

  return new PrismaClient({ log: logConfig })
}

// Use a Proxy so the PrismaClient is only instantiated on first use,
// not at module-evaluation time (which happens during `next build`).
export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = createClient()
    }
    return (globalForPrisma.prisma as any)[prop]
  },
})
