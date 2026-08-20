import { CoachingPushPolicy, selectPushCandidate } from './push-policy';
import type { InsightCandidate } from './insight-source';
import { db } from '../../db/drizzle';

jest.mock('../../db/drizzle', () => ({
  db: { select: jest.fn(), insert: jest.fn() },
}));

// eslint-disable-next-line @typescript-eslint/unbound-method -- jest mock, no `this`
const insert = db.insert as unknown as jest.Mock;
// eslint-disable-next-line @typescript-eslint/unbound-method -- jest mock, no `this`
const select = db.select as unknown as jest.Mock;

function selectChain(rows: any[]) {
  return {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockResolvedValue(rows),
  };
}

function candidate(
  priority: number,
  pushable: boolean,
  ruleId = `r${priority}`,
): InsightCandidate {
  return {
    priority,
    card: {
      id: '',
      ruleId,
      category: 'risk',
      title: `c-${ruleId}`,
      message: 'm',
      metrics: {},
      pushable,
      source: 'analytics',
      createdAt: '',
    },
  };
}

describe('selectPushCandidate', () => {
  it('returns the highest-priority pushable candidate', () => {
    const cands = [
      candidate(1, false),
      candidate(3, true, 'low'),
      candidate(2, true, 'top'),
    ];
    const picked = selectPushCandidate(cands);
    expect(picked!.card.ruleId).toBe('top');
  });

  it('ignores non-pushable candidates', () => {
    const cands = [candidate(1, false), candidate(2, false)];
    expect(selectPushCandidate(cands)).toBeNull();
  });

  it('returns null when empty', () => {
    expect(selectPushCandidate([])).toBeNull();
  });
});

describe('CoachingPushPolicy', () => {
  let policy: CoachingPushPolicy;

  beforeEach(() => {
    jest.clearAllMocks();
    insert.mockReturnValue({
      values: jest.fn().mockResolvedValue(undefined),
    });
    policy = new CoachingPushPolicy();
  });

  it('evaluates to a push and records a dedupe row when not recently pushed', async () => {
    select.mockReturnValue(selectChain([]));
    const cands = [candidate(1, false), candidate(2, true, 'top')];

    const push = await policy.evaluate('u', cands);

    expect(push).not.toBeNull();
    expect(push!.ruleId).toBe('top');
    expect(insert).toHaveBeenCalled();
  });

  it('suppresses the push within the dedupe window', async () => {
    select.mockReturnValue(
      selectChain([
        {
          insightType: 'coaching_push',
          content: 'c-top',
          metadata: { ruleId: 'top' },
          createdAt: new Date(),
        },
      ]),
    );
    const cands = [candidate(2, true, 'top')];

    const push = await policy.evaluate('u', cands);

    expect(push).toBeNull();
    expect(insert).not.toHaveBeenCalled();
  });
});
