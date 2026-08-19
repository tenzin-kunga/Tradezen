import { Injectable, Logger, Module, forwardRef } from '@nestjs/common';
import { AIClient } from '../ai-client';
import { TradesService } from '../../trades/trades.service';
import { PortfolioService } from '../../portfolio/portfolio.service';
import { ResearchService } from '../../research/research.service';
import { JournalsService } from '../../journals/journals.service';
import { WatchlistService } from '../../watchlist/watchlist.service';
import { KnowledgeService } from '../../knowledge/knowledge.service';
import { QueryTradesDto } from '../../trades/dto/query-trades.dto';
import {
  ToolCatalog,
  type ToolResult,
  type PartialToolMetadata,
} from './tool-catalog';
import { ToolExecutor } from './tool-executor';
import { Planner } from './planner';
import { AgentRuntime } from './agent-runtime';
import { TradesModule } from '../../trades/trades.module';
import { PortfolioModule } from '../../portfolio/portfolio.module';
import { ResearchModule } from '../../research/research.module';
import { JournalsModule } from '../../journals/journals.module';
import { WatchlistModule } from '../../watchlist/watchlist.module';
import { KnowledgeModule } from '../../knowledge/knowledge.module';
import { JournalMood } from '../../journals/dto';
import { ChatModule } from '../../chat/chat.module';
import type { WorkspaceAction } from '../context/context-provider';

function json(value: unknown, meta: PartialToolMetadata = {}): ToolResult {
  return {
    content: JSON.stringify(value),
    success: true,
    metadata: { source: 'tool', latencyMs: 0, ...meta },
  };
}

@Injectable()
export class ToolRegistryFactory {
  private readonly logger = new Logger(ToolRegistryFactory.name);

  constructor(
    private readonly trades: TradesService,
    private readonly portfolio: PortfolioService,
    private readonly research: ResearchService,
    private readonly journals: JournalsService,
    private readonly watchlist: WatchlistService,
    private readonly knowledge: KnowledgeService,
  ) {}

  build(): ToolCatalog {
    const catalog = new ToolCatalog();

    catalog.register({
      permission: 'read',
      timeoutMs: 5_000,
      cacheTTLMs: 15_000,
      definition: {
        type: 'function',
        function: {
          name: 'get_analytics',
          description:
            'Get aggregate trading analytics for the user: win rate, profit factor, total P&L, max drawdown, average R:R, FOMO/vengeance trade counts, and per-day/month breakdowns.',
          parameters: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
      },
      executor: {
        execute: async (_args, ctx) =>
          json(await this.trades.getAnalytics(ctx.userId), { rowCount: 1 }),
      },
    });

    catalog.register({
      permission: 'read',
      timeoutMs: 5_000,
      cacheTTLMs: 15_000,
      definition: {
        type: 'function',
        function: {
          name: 'search_trades',
          description:
            "Search the user's trades by symbol, strategy, direction, or date range. Returns matching trades with P&L.",
          parameters: {
            type: 'object',
            properties: {
              symbol: {
                type: 'string',
                description: 'Ticker symbol filter, e.g. NVDA',
              },
              strategy: { type: 'string', description: 'Strategy name filter' },
              direction: {
                type: 'string',
                enum: ['long', 'short'],
                description: 'Position direction',
              },
              from: { type: 'string', description: 'Start date YYYY-MM-DD' },
              to: { type: 'string', description: 'End date YYYY-MM-DD' },
              limit: {
                type: 'number',
                description: 'Max results (default 20)',
              },
            },
            required: [],
          },
        },
      },
      executor: {
        execute: async (args, ctx) => {
          const dto = new QueryTradesDto();
          const limit = typeof args.limit === 'number' ? args.limit : 20;
          Object.assign(dto, {
            symbol: args.symbol,
            strategy: args.strategy,
            direction: args.direction,
            from: args.from,
            to: args.to,
            limit: Math.min(limit, 50),
          });
          const page = await this.trades.findAll(ctx.userId, dto);
          return json(page.data ?? page, {
            rowCount: (page.data ?? page).length,
          });
        },
      },
    });

    catalog.register({
      permission: 'read',
      timeoutMs: 5_000,
      cacheTTLMs: 15_000,
      definition: {
        type: 'function',
        function: {
          name: 'get_portfolio',
          description:
            "Get the user's portfolio summary: per-symbol and per-strategy P&L attribution, win rates, long/short split, and behavioral flags.",
          parameters: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
      },
      executor: {
        execute: async (_args, ctx) =>
          json(await this.portfolio.getPortfolio(ctx.userId), { rowCount: 1 }),
      },
    });

    catalog.register({
      permission: 'read',
      timeoutMs: 5_000,
      cacheTTLMs: 15_000,
      definition: {
        type: 'function',
        function: {
          name: 'search_research',
          description:
            "Search the user's research projects by title or status. Returns matching project metadata.",
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search term or project status',
              },
            },
            required: ['query'],
          },
        },
      },
      executor: {
        execute: async (args, ctx) => {
          const q = typeof args.query === 'string' ? args.query : '';
          return json(await this.research.search(ctx.userId, q), {
            rowCount: 0,
          });
        },
      },
    });

    // --- Journal tools ---

    catalog.register({
      permission: 'read',
      timeoutMs: 3_000,
      cacheTTLMs: 0,
      definition: {
        type: 'function',
        function: {
          name: 'open_journal',
          description:
            'Navigate to the journal module to view or edit trading journal entries.',
          parameters: { type: 'object', properties: {}, required: [] },
        },
      },
      executor: {
        execute: async () => {
          const actions: WorkspaceAction[] = [
            {
              version: 1,
              kind: 'navigate',
              module: 'journal',
              params: {},
              label: 'Open Journal',
            },
          ];
          return {
            content: 'Journal opened.',
            success: true,
            metadata: { source: 'tool', latencyMs: 0 },
            suggestedActions: actions,
          };
        },
      },
    });

    catalog.register({
      permission: 'write',
      timeoutMs: 5_000,
      cacheTTLMs: 0,
      definition: {
        type: 'function',
        function: {
          name: 'create_journal',
          description:
            'Create or update a journal entry for a given date with pre-market/post-market notes.',
          parameters: {
            type: 'object',
            properties: {
              date: { type: 'string', description: 'Date YYYY-MM-DD' },
              pre_market_notes: {
                type: 'string',
                description: 'Pre-market notes',
              },
              post_market_notes: {
                type: 'string',
                description: 'Post-market notes',
              },
              mood: { type: 'string', description: 'Mood rating 1-5' },
              lessons: { type: 'string', description: 'Lessons learned' },
            },
            required: ['date'],
          },
        },
      },
      executor: {
        execute: async (args, ctx) => {
          const date =
            typeof args.date === 'string'
              ? args.date
              : new Date().toISOString().slice(0, 10);
          const result = await this.journals.create(ctx.userId, {
            date,
            pre_market_notes:
              typeof args.pre_market_notes === 'string'
                ? args.pre_market_notes
                : undefined,
            post_market_notes:
              typeof args.post_market_notes === 'string'
                ? args.post_market_notes
                : undefined,
            mood:
              typeof args.mood === 'string'
                ? (args.mood as JournalMood)
                : undefined,
            lessons:
              typeof args.lessons === 'string' ? args.lessons : undefined,
          });
          return {
            content: JSON.stringify(result),
            success: true,
            metadata: { source: 'tool', latencyMs: 0 },
            suggestedActions: [
              {
                version: 1,
                kind: 'navigate',
                module: 'journal',
                params: { date },
                label: 'View Journal',
              },
            ],
          };
        },
      },
    });

    // --- Watchlist tools ---

    catalog.register({
      permission: 'read',
      timeoutMs: 3_000,
      cacheTTLMs: 0,
      definition: {
        type: 'function',
        function: {
          name: 'open_watchlist',
          description:
            'Navigate to the watchlist module to view or manage watchlists.',
          parameters: { type: 'object', properties: {}, required: [] },
        },
      },
      executor: {
        execute: async () => ({
          content: 'Watchlist opened.',
          success: true,
          metadata: { source: 'tool', latencyMs: 0 },
          suggestedActions: [
            {
              version: 1,
              kind: 'navigate',
              module: 'watchlist',
              params: {},
              label: 'Open Watchlist',
            },
          ],
        }),
      },
    });

    catalog.register({
      permission: 'write',
      timeoutMs: 5_000,
      cacheTTLMs: 0,
      definition: {
        type: 'function',
        function: {
          name: 'add_watchlist_symbol',
          description:
            'Add a symbol to a watchlist with optional notes and alerts.',
          parameters: {
            type: 'object',
            properties: {
              symbol: {
                type: 'string',
                description: 'Ticker symbol, e.g. NVDA',
              },
              watchlist_id: {
                type: 'string',
                description: 'Watchlist ID (optional)',
              },
              notes: { type: 'string', description: 'Notes about this symbol' },
            },
            required: ['symbol'],
          },
        },
      },
      executor: {
        execute: async (args, ctx) => {
          const symbol =
            typeof args.symbol === 'string' ? args.symbol.toUpperCase() : '';
          const watchlists = await this.watchlist.listWatchlists(ctx.userId);
          const wlId =
            typeof args.watchlist_id === 'string'
              ? args.watchlist_id
              : watchlists[0]?.id;
          if (!wlId)
            return {
              content: 'No watchlist found.',
              success: false,
              metadata: { source: 'tool', latencyMs: 0 },
            };
          const result = await this.watchlist.addItem(ctx.userId, wlId, {
            ticker: symbol,
            notes: typeof args.notes === 'string' ? args.notes : undefined,
          });
          return {
            content: JSON.stringify(result),
            success: true,
            metadata: { source: 'tool', latencyMs: 0 },
            suggestedActions: [
              {
                version: 1,
                kind: 'open',
                module: 'watchlist',
                params: { symbol },
                label: `View ${symbol}`,
              },
            ],
          };
        },
      },
    });

    // --- Knowledge tools ---

    catalog.register({
      permission: 'read',
      timeoutMs: 3_000,
      cacheTTLMs: 0,
      definition: {
        type: 'function',
        function: {
          name: 'open_knowledge',
          description:
            'Navigate to the knowledge module to view or manage trading playbooks and documents.',
          parameters: { type: 'object', properties: {}, required: [] },
        },
      },
      executor: {
        execute: async () => ({
          content: 'Knowledge base opened.',
          success: true,
          metadata: { source: 'tool', latencyMs: 0 },
          suggestedActions: [
            {
              version: 1,
              kind: 'navigate',
              module: 'knowledge',
              params: {},
              label: 'Open Knowledge',
            },
          ],
        }),
      },
    });

    return catalog;
  }
}

@Module({
  imports: [
    TradesModule,
    PortfolioModule,
    ResearchModule,
    JournalsModule,
    WatchlistModule,
    KnowledgeModule,
    forwardRef(() => ChatModule),
  ],
  providers: [
    ToolRegistryFactory,
    {
      provide: ToolCatalog,
      useFactory: (f: ToolRegistryFactory) => f.build(),
      inject: [ToolRegistryFactory],
    },
    ToolExecutor,
    Planner,
    {
      provide: AgentRuntime,
      useFactory: (ai: AIClient, planner: Planner, executor: ToolExecutor) =>
        new AgentRuntime(ai, planner, executor),
      inject: [AIClient, Planner, ToolExecutor],
    },
  ],
  exports: [ToolCatalog, ToolExecutor, Planner, AgentRuntime],
})
export class ToolsModule {}
