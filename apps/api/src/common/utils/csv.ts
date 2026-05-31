import { Logger } from '@nestjs/common';

export class CsvUtils {
  private readonly logger = new Logger('CsvUtils');

  parseCsvLine(line: string): string[] {
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

  buildColumnMap(header: string[]): Record<string, number> {
    const map: Record<string, number> = {};
    header.forEach((col, idx) => {
      map[col.toLowerCase().trim()] = idx;
    });
    return map;
  }
}
