import type { SemanticDocument, SemanticSourceType } from '../types';
import type { SemanticFormatter } from './types';
import { SemanticSourceType as ST } from '../types';

interface ResearchProjectEntity {
  id: string;
  title: string;
  status: string;
  conviction: string;
  ticker: string | null;
  notes: { content: string; version: number } | null;
  checklist: {
    thesisComplete: boolean;
    valuationComplete: boolean;
    risksReviewed: boolean;
    earningsReviewed: boolean;
  } | null;
}

export class ResearchProjectFormatter implements SemanticFormatter<ResearchProjectEntity> {
  supports(sourceType: SemanticSourceType): boolean {
    return sourceType === ST.RESEARCH_PROJECT;
  }

  format(entity: ResearchProjectEntity, userId: string): SemanticDocument {
    const lines = [
      `Research Project: ${entity.title}`,
      `Status: ${entity.status}`,
      `Conviction: ${entity.conviction}`,
    ];

    if (entity.ticker) {
      lines.push(`Symbol: ${entity.ticker}`);
    }

    if (entity.notes?.content) {
      lines.push(`\nInvestment Thesis:\n${entity.notes.content}`);
    }

    if (entity.checklist) {
      const c = entity.checklist;
      lines.push(
        `\nChecklist: thesis=${c.thesisComplete}, valuation=${c.valuationComplete}, risks=${c.risksReviewed}, earnings=${c.earningsReviewed}`,
      );
    }

    return {
      id: entity.id,
      userId,
      sourceType: ST.RESEARCH_PROJECT,
      title: entity.title,
      content: lines.join('\n'),
      metadata: {
        status: entity.status,
        conviction: entity.conviction,
        ticker: entity.ticker,
      },
    };
  }
}
