import { loadEnvConfig } from '@next/env';
import { PrismaClient } from '@prisma/client';
import Module from 'node:module';

type ModuleLoad = (this: unknown, request: string, ...args: unknown[]) => unknown;

const moduleWithLoad = Module as unknown as { _load: ModuleLoad };
const originalLoad = moduleWithLoad._load;
moduleWithLoad._load = function (this: unknown, request: string, ...args: unknown[]) {
  if (request === 'server-only') return {};
  return originalLoad.call(this, request, ...args);
};

loadEnvConfig(process.cwd());

const prisma = new PrismaClient({
  log: [{ emit: 'event', level: 'query' }],
});

let count = 0;
let totalMs = 0;
const byShape = new Map<string, { count: number; ms: number }>();

prisma.$on('query', (event) => {
  count += 1;
  totalMs += event.duration;
  const shape = event.query.replace(/"[^"]+"/g, '?').replace(/\s+/g, ' ').slice(0, 180);
  const bucket = byShape.get(shape) ?? { count: 0, ms: 0 };
  bucket.count += 1;
  bucket.ms += event.duration;
  byShape.set(shape, bucket);
});

(globalThis as unknown as { palmaPrisma?: PrismaClient }).palmaPrisma = prisma;

async function main() {
  const started = Date.now();
  const queries = await import('../src/server/data/queries');

  async function time<T>(label: string, run: () => Promise<T>): Promise<T> {
    const beforeCount = count;
    const beforeMs = totalMs;
    const startedAt = Date.now();
    const result = await run();
    console.log(
      `${label}: wall=${Date.now() - startedAt}ms db=${(totalMs - beforeMs).toFixed(1)}ms queries=${count - beforeCount}`,
    );
    return result;
  }

  await time('getCurrentSeason', () => queries.getCurrentSeason());
  await time('listCategories(current)', async () => queries.listCategories((await queries.getCurrentSeason()).year));
  await time('listCreators honoursOnly limit 4', () => queries.listCreators({ honoursOnly: true, limit: 4 }));
  await time('listRecentHonours(5)', () => queries.listRecentHonours(5));
  await time('getRollOfHonour', () => queries.getRollOfHonour());
  await time('listArticles limit 3', () => queries.listArticles({ limit: 3 }));
  await time('listCreators limit 120', () => queries.listCreators({ limit: 120 }));
  await time('listCountries', () => queries.listCountries());

  console.log(`TOTAL: wall=${Date.now() - started}ms db=${totalMs.toFixed(1)}ms queries=${count}`);
  console.log('\nTop query shapes:');
  for (const [shape, bucket] of [...byShape.entries()].sort((a, b) => b[1].ms - a[1].ms).slice(0, 12)) {
    console.log(`${bucket.count}x ${bucket.ms.toFixed(1)}ms :: ${shape}`);
  }

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
