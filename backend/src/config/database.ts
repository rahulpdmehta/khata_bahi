import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import { env } from './environment';

const isAccelerateUrl = (url: string) =>
  url.startsWith('prisma://') || url.startsWith('prisma+postgres://');

const isMigrationRoleUrl = (url: string) =>
  /prisma_migration/i.test(url) || /[?&]role=prisma_migration/i.test(url);

/** Pooled URL for runtime; never use DIRECT_URL / migration credentials here. */
function resolveRuntimeDatabaseUrl(): string {
  const url = env.DATABASE_URL;

  if (!url) {
    throw new Error('DATABASE_URL is not set');
  }

  if (isMigrationRoleUrl(url)) {
    throw new Error(
      'DATABASE_URL uses the prisma_migration role. On Vercel, set DATABASE_URL to your Prisma Accelerate URL (prisma+postgres://...) or a pooled app connection string — not DIRECT_URL.',
    );
  }

  if (isAccelerateUrl(url)) {
    return url;
  }

  // Serverless: one connection per PrismaClient instance (singleton below).
  if (process.env.VERCEL && !url.includes('connection_limit=')) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}connection_limit=1`;
  }

  return url;
}

const prismaClientSingleton = () => {
  const databaseUrl = resolveRuntimeDatabaseUrl();
  const useAccelerate = isAccelerateUrl(databaseUrl);

  const client = new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    datasources: {
      db: { url: databaseUrl },
    },
  });

  return useAccelerate ? client.$extends(withAccelerate()) : client;
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClientSingleton | undefined;
}

export const prisma = globalThis.prisma ?? prismaClientSingleton();

// Reuse one client per serverless instance (Vercel/Lambda); avoids connection storms.
globalThis.prisma = prisma;
