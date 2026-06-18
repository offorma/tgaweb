import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// In production, only log errors + warnings (NEVER log full queries with bound params)
// In dev, log queries for debugging
const logConfig =
  process.env.NODE_ENV === 'production'
    ? (['error', 'warn'] as const)
    : (['query', 'error', 'warn'] as const)

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: logConfig,
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
