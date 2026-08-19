import 'dotenv/config';
import { CorpusBaselineService } from './ai/corpus-baseline.service';
import { pool } from './db';
import { client } from './db/drizzle';

async function main() {
  const service = new CorpusBaselineService();
  const userIds = await service.listUserIds();

  if (userIds.length === 0) {
    console.log('[validate-corpus] No users with corpus data.');
    return;
  }

  let totalMissing = 0;
  let totalOrphaned = 0;
  let totalDuplicates = 0;

  for (const userId of userIds) {
    const baseline = await service.validate(userId);
    console.log(`\nUser ${userId}`);
    for (const s of baseline.perSource) {
      console.log(
        `  ${s.sourceType.padEnd(18)} source=${s.sourceCount} corpus=${s.corpusCount} distinct=${s.distinctSources} missing=${s.missing.length} orphaned=${s.orphaned.length} dupChunks=${s.duplicateChunkRows}`,
      );
    }
    totalMissing += baseline.totals.missing;
    totalOrphaned += baseline.totals.orphaned;
    totalDuplicates += baseline.totals.duplicateChunkRows;
  }

  console.log(
    `\n[validate-corpus] Users=${userIds.length} missing=${totalMissing} orphaned=${totalOrphaned} duplicateChunks=${totalDuplicates}`,
  );
  if (totalMissing + totalOrphaned + totalDuplicates > 0) {
    console.log('[validate-corpus] Reconciliation needed (see Slice 11).');
  } else {
    console.log('[validate-corpus] Corpus in sync with source data.');
  }
}

main()
  .catch((err) => {
    console.error('[validate-corpus] Failed:', err);
    process.exit(1);
  })
  .finally(() => {
    client.end();
    pool.end();
  });
