/**
 * Run the retention sweep by hand.
 *
 *   npm run retention
 *
 * The same code path as the scheduled route, so what it removes here is
 * exactly what it removes there.
 */
import { runRetentionSweep } from '../src/server/services/retention';
import { prisma } from '../src/server/db';

async function main() {
  const result = await runRetentionSweep({ label: 'command line' });

  console.log(`Retention sweep — ${result.ranAt}`);
  for (const [rule, count] of Object.entries(result.removed)) {
    console.log(`  ${rule.padEnd(26)} ${count}`);
  }
  console.log(`  ${'total'.padEnd(26)} ${result.total}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
