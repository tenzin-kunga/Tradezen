import { FormatterRegistry } from './registry';
import { TradeDocumentFormatter } from './trade-document.formatter';
import { JournalDocumentFormatter } from './journal-document.formatter';
import { ResearchDocumentFormatter } from './research-document.formatter';
import { KnowledgeDocumentFormatter } from './knowledge-document.formatter';
import { CoachingDocumentFormatter } from './coaching-document.formatter';
import { InsightDocumentFormatter } from './insight-document.formatter';
import { ResearchProjectFormatter } from './research-project-formatter';
import { SemanticSourceType } from '../types';

describe('source builders (formatter registry)', () => {
  const registry = new FormatterRegistry();
  registry.register(new TradeDocumentFormatter());
  registry.register(new JournalDocumentFormatter());
  registry.register(new ResearchDocumentFormatter());
  registry.register(new KnowledgeDocumentFormatter());
  registry.register(new CoachingDocumentFormatter());
  registry.register(new InsightDocumentFormatter());
  registry.register(new ResearchProjectFormatter());

  it('formats a trade into a canonical doc with provenance and timestamps', () => {
    const formatter = registry.get(SemanticSourceType.TRADE)!;
    const doc = formatter.format(
      {
        id: 't1',
        symbol: 'AAPL',
        direction: 'long',
        entryPrice: '100',
        exitPrice: '110',
        pnl: '10',
        strategy: 'breakout',
        notes: 'clean',
        lotSize: null,
        stopLoss: null,
        takeProfit: null,
        commission: '0',
        contractSize: '100000',
        tradeDate: new Date('2026-01-01T00:00:00Z'),
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-02T00:00:00Z'),
      },
      'u1',
    );

    expect(doc.id).toBe('t1');
    expect(doc.userId).toBe('u1');
    expect(doc.sourceType).toBe(SemanticSourceType.TRADE);
    expect(doc.content).toContain('AAPL long');
    expect(doc.content).toContain('P/L: 10');
    expect(doc.metadata.symbol).toBe('AAPL');
    expect(doc.provenance).toEqual({
      source: 'trades',
      entity: 'trade',
      operation: 'create',
    });
    expect(doc.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(doc.updatedAt).toBe('2026-01-02T00:00:00.000Z');
  });

  it('formats each registered source type to its canonical shape', () => {
    const cases: Array<{
      sourceType: SemanticSourceType;
      entity: Record<string, unknown>;
      expectTitle: string;
      expectContent: string;
    }> = [
      {
        sourceType: SemanticSourceType.JOURNAL,
        entity: {
          id: 'j1',
          date: '2026-01-01',
          preMarketNotes: 'slept well',
          postMarketNotes: null,
          mood: 'calm',
          marketConditions: null,
          lessons: 'cut losses',
          createdAt: null,
          updatedAt: null,
        },
        expectTitle: 'Journal 2026-01-01',
        expectContent: 'slept well\ncut losses\ncalm',
      },
      {
        sourceType: SemanticSourceType.RESEARCH_DOCUMENT,
        entity: {
          id: 'r1',
          fileName: 'report.pdf',
          text: 'thesis text',
          wordCount: 10,
          category: 'annual_report',
          projectId: 'p1',
        },
        expectTitle: 'report.pdf',
        expectContent: 'thesis text',
      },
      {
        sourceType: SemanticSourceType.KNOWLEDGE_DOCUMENT,
        entity: {
          id: 'k1',
          title: 'Notes',
          content: 'body',
          docType: 'note',
          status: 'active',
          currentVersion: 3,
          aiSummary: null,
          frontmatter: { tags: ['x'] },
          createdAt: null,
          updatedAt: null,
        },
        expectTitle: 'Notes',
        expectContent: 'body',
      },
      {
        sourceType: SemanticSourceType.COACHING,
        entity: {
          id: 'c1',
          severity: 'critical',
          triggers: ['a'],
          message: 'stop',
        },
        expectTitle: 'Coaching session critical',
        expectContent: 'stop',
      },
      {
        sourceType: SemanticSourceType.AI_INSIGHT,
        entity: {
          id: 'i1',
          insightType: 'journal_analysis',
          content: 'summary',
          metadata: { sentiment: 'mixed' },
        },
        expectTitle: 'Insight journal_analysis',
        expectContent: 'summary',
      },
    ];

    for (const c of cases) {
      const formatter = registry.get(c.sourceType)!;
      const doc = formatter.format(c.entity, 'u1');
      expect(doc.title).toBe(c.expectTitle);
      expect(doc.content).toBe(c.expectContent);
      expect(doc.provenance).toBeDefined();
      expect(doc.provenance!.source).toBeDefined();
      expect(doc.provenance!.operation).toBe('create');
    }
  });

  it('returns undefined for unregistered source types', () => {
    expect(registry.get('unknown' as SemanticSourceType)).toBeUndefined();
  });
});
