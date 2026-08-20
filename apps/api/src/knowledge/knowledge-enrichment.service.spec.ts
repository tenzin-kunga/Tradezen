import { Test, TestingModule } from '@nestjs/testing';
import { KnowledgeEnrichmentService } from './knowledge-enrichment.service';
import { AIClient } from '../ai/ai-client';
import { FormatterRegistry } from '../ai/context/semantic/formatters/registry';
import { KnowledgeDocumentFormatter } from '../ai/context/semantic/formatters/knowledge-document.formatter';

jest.mock('../db/drizzle', () => ({
  db: {
    select: jest.fn(() => ({
      from: jest.fn(() => ({
        where: jest.fn(() => ({
          limit: jest.fn(() =>
            Promise.resolve([
              {
                id: 'doc1',
                title: 'Doc',
                content: 'body',
                docType: 'note',
                status: 'draft',
                currentVersion: 1,
                aiSummary: null,
                frontmatter: {},
              },
            ]),
          ),
        })),
      })),
    })),
    update: jest.fn(() => ({
      set: jest.fn(() => ({
        where: jest.fn(() => Promise.resolve([])),
      })),
    })),
  },
}));

describe('KnowledgeEnrichmentService generateSummary', () => {
  let service: KnowledgeEnrichmentService;
  const pipeline = { enqueue: jest.fn().mockResolvedValue(undefined) };
  const completeMock = jest.fn().mockResolvedValue({ content: 'A summary.' });
  const aiClient = { complete: completeMock };
  const warn = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeEnrichmentService,
        { provide: 'EmbeddingPipeline', useValue: pipeline },
        { provide: AIClient, useValue: aiClient },
        {
          provide: FormatterRegistry,
          useValue: { get: jest.fn(() => new KnowledgeDocumentFormatter()) },
        },
      ],
    }).compile();
    service = module.get<KnowledgeEnrichmentService>(
      KnowledgeEnrichmentService,
    );
    (service as unknown as { logger: { warn: jest.Mock } }).logger = { warn };
  });

  const userContent = () => {
    const messages = (
      completeMock.mock.calls[0] as unknown as [
        Array<{ role: string; content: string }>,
        unknown,
      ]
    )[0];
    return messages.find((m) => m.role === 'user')!.content;
  };

  it('truncates content to 6000 chars and warns when too long', async () => {
    const long = 'x'.repeat(7000);

    await service.enrichDocument('u1', 'doc1', long);

    expect(warn).toHaveBeenCalled();
    expect(userContent()).toHaveLength(6000);
  });

  it('does not warn when content fits within the limit', async () => {
    const short = 'y'.repeat(100);

    await service.enrichDocument('u1', 'doc1', short);

    expect(warn).not.toHaveBeenCalled();
    expect(userContent()).toBe(short);
  });
});
