export interface EventMetadata {
  source: string;
  measures: string;
  usualEffect: string;
  frequency: string;
  releaseSchedule: string;
  ffNotes: string;
  whyTradersCare: string;
  derivedVia: string;
  acroExpand: string;
  tradingImpact: {
    volatility: number; // 1-5
    typicalMovement: string;
  };
}

interface RegistryEntry {
  key: string;
  aliases: string[];
  metadata: EventMetadata;
}

function normalizeKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

let lookupPromise: Promise<Map<string, EventMetadata>> | null = null;

async function loadLookupMap(): Promise<Map<string, EventMetadata>> {
  const { default: registry } = await import(
    "../data/economic-events.json"
  );
  const map = new Map<string, EventMetadata>();
  for (const entry of registry as RegistryEntry[]) {
    for (const alias of entry.aliases) {
      map.set(normalizeKey(alias), entry.metadata);
    }
  }
  return map;
}

export async function lookupEventMetadata(
  title: string,
): Promise<EventMetadata | undefined> {
  if (!lookupPromise) {
    lookupPromise = loadLookupMap();
  }
  const lookup = await lookupPromise;
  return lookup.get(normalizeKey(title));
}
