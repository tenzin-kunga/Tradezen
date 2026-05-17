import { Injectable, Logger } from '@nestjs/common';
import { StateGraph, Annotation, END } from '@langchain/langgraph';
import { createLLM } from '../langgraph.config';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

function extractText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter(
        (c): c is { type: string; text: string } =>
          typeof c === 'object' && c !== null && 'text' in c,
      )
      .map((c) => c.text)
      .join('');
  }
  return String(content);
}

const CoachingState = Annotation.Root({
  userId: Annotation<string>,
  analytics: Annotation<Record<string, unknown>>,
  behavioralScores: Annotation<Record<string, number>>,
  triggers: Annotation<string[]>,
  coachingMessage: Annotation<string>,
  severity: Annotation<string>,
});

@Injectable()
export class CoachingWorkflow {
  private readonly logger = new Logger('CoachingWorkflow');
  private graph: any;

  constructor() {
    const workflow = new StateGraph(CoachingState)
      .addNode('evaluate_triggers', this.evaluateTriggers.bind(this))
      .addNode('assess_severity', this.assessSeverity.bind(this))
      .addNode('generate_message', this.generateMessage.bind(this))
      .addEdge('__start__', 'evaluate_triggers')
      .addEdge('evaluate_triggers', 'assess_severity')
      .addEdge('assess_severity', 'generate_message')
      .addEdge('generate_message', END);

    this.graph = workflow.compile();
  }

  async run(
    analytics: Record<string, unknown>,
    behavioralScores: Record<string, number>,
  ) {
    const result = await this.graph.invoke({
      userId: '',
      analytics,
      behavioralScores,
      triggers: [],
      coachingMessage: '',
      severity: 'low',
    });

    return {
      triggers: result.triggers,
      coachingMessage: result.coachingMessage,
      severity: result.severity,
    };
  }

  private async evaluateTriggers(state: typeof CoachingState.State) {
    const triggers: string[] = [];
    const a = state.analytics;

    if ((a as any).winRate < 40 && (a as any).totalTrades > 20) {
      triggers.push(
        'Win rate below 40% with 20+ trades — strategy review needed',
      );
    }
    if ((a as any).profitFactor < 1.0) {
      triggers.push('Profit factor below 1.0 — losses exceed gains');
    }
    if (
      (a as any).currentStreak?.type === 'loss' &&
      (a as any).currentStreak?.count >= 5
    ) {
      triggers.push(
        `5+ trade losing streak (${(a as any).currentStreak.count}) — consider taking a break`,
      );
    }
    if (
      (a as any).behavioralStats?.fomoCount /
        Math.max((a as any).totalTrades, 1) >
      0.3
    ) {
      triggers.push(
        '30%+ of trades are FOMO entries — emotional trading detected',
      );
    }
    if ((a as any).sharpeRatio < 0) {
      triggers.push('Negative Sharpe ratio — risk-adjusted returns are poor');
    }

    const bs = state.behavioralScores;
    if (bs.fomoScore > 70)
      triggers.push('High FOMO score — trading emotionally');
    if (bs.revengeScore > 60) triggers.push('Revenge trading pattern detected');
    if (bs.discipline < 50)
      triggers.push('Low discipline — use stop losses and follow your plan');
    if (bs.consistency < 60) triggers.push('Inconsistent trading behavior');

    return { ...state, triggers };
  }

  private async assessSeverity(state: typeof CoachingState.State) {
    const count = state.triggers.length;
    let severity = 'low';
    if (count >= 4) severity = 'critical';
    else if (count >= 2) severity = 'medium';
    else if (count >= 1) severity = 'low';

    return { ...state, severity };
  }

  private async generateMessage(state: typeof CoachingState.State) {
    const llm = createLLM(undefined, 0.7);

    const context = `
Triggers:
${state.triggers.map((t, i) => `${i + 1}. ${t}`).join('\n')}

Severity: ${state.severity}

Analytics Summary:
- Win Rate: ${(state.analytics as any).winRate}%
- Total PnL: ${(state.analytics as any).totalPnl}
- Profit Factor: ${(state.analytics as any).profitFactor}
- FOMO Score: ${state.behavioralScores.fomoScore}/100
- Discipline Score: ${state.behavioralScores.discipline}/100
    `;

    const systemPrompt =
      state.severity === 'critical'
        ? 'You are a compassionate but firm trading coach. The user is in a critical state. Be direct about the issues but supportive. Provide 3 specific actionable recommendations. Keep it under 200 words.'
        : 'You are a supportive trading coach. Provide personalized feedback based on the triggers and analytics. Be encouraging but honest. Provide 2-3 actionable recommendations. Keep it under 150 words.';

    const response = await llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(context),
    ]);

    return { ...state, coachingMessage: extractText(response.content) };
  }
}
