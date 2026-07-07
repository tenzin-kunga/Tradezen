export interface KnowledgeTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  docType: string;
  content: string;
  frontmatter?: Record<string, unknown>;
}

export const KNOWLEDGE_TEMPLATES: KnowledgeTemplate[] = [
  {
    id: "investment-thesis",
    name: "Investment Thesis",
    icon: "📈",
    description: "Structured analysis for investment decisions",
    docType: "thesis",
    content: `# [Company] Investment Thesis

## Thesis

<!-- Your core investment thesis in 2-3 sentences -->

## Key Metrics

| Metric | Value | Notes |
|--------|-------|-------|
| Market Cap | | |
| PE | | |
| ROE | | |
| Debt/Equity | | |
| Revenue Growth | | |

## Valuation

<!-- DCF, comparable analysis, or other valuation methods -->

## Catalysts

- 

## Risks

- 

## Conclusion

<!-- Final recommendation and reasoning -->
`,
  },
  {
    id: "quarterly-review",
    name: "Quarterly Review",
    icon: "📊",
    description: "Analyze quarterly earnings and results",
    docType: "analysis",
    content: `# [Company] Q[X] Results

## Revenue

## Profitability

## Guidance

## Key Takeaways

## Impact on Thesis

`,
  },
  {
    id: "company-snapshot",
    name: "Company Snapshot",
    icon: "🏢",
    description: "Quick overview of a company",
    docType: "snapshot",
    content: `# [Company] Snapshot

## Business

## Moat

## Management

## Financials

## Risks

`,
  },
  {
    id: "macro-note",
    name: "Macro Note",
    icon: "🌍",
    description: "Macroeconomic analysis and observations",
    docType: "macro",
    content: `# [Topic] Macro Note

## Current Situation

## Historical Context

## Market Impact

## What to Watch

`,
  },
  {
    id: "trading-playbook",
    name: "Trading Playbook",
    icon: "📋",
    description: "Document a trading strategy or setup",
    docType: "playbook",
    content: `# [Strategy] Playbook

## Setup

## Entry Criteria

## Exit Criteria

## Risk Management

## Examples

## Edge Cases

`,
  },
  {
    id: "post-mortem",
    name: "Post-Mortem",
    icon: "🔍",
    description: "Analyze a trade that didn't go as planned",
    docType: "postmortem",
    content: `# Trade Post-Mortem

## What Happened

## What I Expected

## What Went Wrong

## Lessons Learned

## What I'd Do Differently

`,
  },
  {
    id: "market-observation",
    name: "Market Observation",
    icon: "👁",
    description: "Note a market pattern or observation",
    docType: "note",
    content: `# Market Observation

## Date

## Observation

## Evidence

## Implications

## Action Items

`,
  },
];

export function getTemplate(id: string): KnowledgeTemplate | undefined {
  return KNOWLEDGE_TEMPLATES.find((t) => t.id === id);
}
