import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { db } from '../db/drizzle';
import { trades } from '../db/schema';

interface CsvImportJobData {
  userId: string;
  csvContent: string;
  fileName: string;
}

interface CsvImportProgress {
  processed: number;
  total: number;
  imported: number;
  errors: string[];
}

@Processor('csv-import')
export class CsvImportProcessor extends WorkerHost {
  private readonly logger = new Logger('CsvImportProcessor');

  async process(
    job: Job<CsvImportJobData>,
  ): Promise<{ imported: number; errors: string[] }> {
    const { userId, csvContent, fileName } = job.data;
    this.logger.log(`Processing CSV import for user ${userId}: ${fileName}`);

    const lines = csvContent.split('\n').filter((line) => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV file must have header and at least one data row');
    }

    const header = this.parseCsvLine(lines[0]);
    const requiredColumns = [
      'symbol',
      'direction',
      'entry_price',
      'exit_price',
      'lot_size',
    ];
    const missingColumns = requiredColumns.filter(
      (col) => !header.includes(col),
    );
    if (missingColumns.length > 0) {
      throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
    }

    const columnMap = this.buildColumnMap(header);
    const errors: string[] = [];
    let imported = 0;

    for (let i = 1; i < lines.length; i++) {
      const progress: CsvImportProgress = {
        processed: i,
        total: lines.length - 1,
        imported,
        errors: errors.slice(-10),
      };
      await job.updateProgress(progress);

      try {
        const values = this.parseCsvLine(lines[i]);
        const trade = this.mapCsvRowToTrade(values, columnMap, userId);

        await db.insert(trades).values(trade);
        imported++;
      } catch (error) {
        errors.push(`Row ${i + 1}: ${(error as Error).message}`);
      }
    }

    this.logger.log(
      `CSV import complete: ${imported} imported, ${errors.length} errors`,
    );
    return { imported, errors };
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  private buildColumnMap(header: string[]): Record<string, number> {
    const map: Record<string, number> = {};
    header.forEach((col, idx) => {
      map[col.toLowerCase().trim()] = idx;
    });
    return map;
  }

  private mapCsvRowToTrade(
    values: string[],
    columnMap: Record<string, number>,
    userId: string,
  ) {
    const get = (col: string) => values[columnMap[col]] ?? '';

    const entry = parseFloat(get('entry_price'));
    const exit = parseFloat(get('exit_price'));
    const lot = parseFloat(get('lot_size'));

    if (isNaN(entry) || isNaN(exit) || isNaN(lot)) {
      throw new Error('Invalid numeric values');
    }

    const direction = get('direction').toLowerCase();
    if (direction !== 'buy' && direction !== 'sell') {
      throw new Error("Invalid direction (must be 'buy' or 'sell')");
    }

    const pnl =
      direction === 'buy'
        ? (exit - entry) * lot * 100000
        : (entry - exit) * lot * 100000;

    return {
      userId,
      symbol: get('symbol').toUpperCase(),
      direction,
      entryPrice: String(entry),
      exitPrice: String(exit),
      lotSize: String(lot),
      pnl: String(pnl),
      tradeDate: get('trade_date') ? new Date(get('trade_date')) : null,
      strategy: get('strategy') || null,
      notes: get('notes') || null,
      stopLoss: get('stop_loss') ? String(parseFloat(get('stop_loss'))) : null,
      takeProfit: get('take_profit')
        ? String(parseFloat(get('take_profit')))
        : null,
      fomoCheck: get('fomo_check')?.toLowerCase() === 'true',
      vengeanceTrade: get('vengeance_trade')?.toLowerCase() === 'true',
      trendAlignment: get('trend_alignment')?.toLowerCase() === 'true',
    };
  }
}
