import type { RetrievalProfile } from './retrieval.service';
import { RETRIEVAL_PROFILES } from './retrieval.service';

export interface RetrievalQuery {
  resourceType: string;
  resourceId: string;
  profile: RetrievalProfile;
  filters?: RetrievalFilter[];
  budget?: ContextBudget;
}

export interface RetrievalFilter {
  type: 'source' | 'type' | 'date' | 'tag';
  value: string;
  operator?: 'equals' | 'contains' | 'after' | 'before';
}

export interface ContextBudget {
  maxTokens: number;
  priority: number;
}

export function createRetrievalQuery(
  resourceType: string,
  resourceId: string,
  profileName: string = 'inspector',
): RetrievalQuery {
  const profile =
    RETRIEVAL_PROFILES[profileName] || RETRIEVAL_PROFILES.inspector;

  return {
    resourceType,
    resourceId,
    profile,
    filters: [],
    budget: {
      maxTokens: profile.maxContextTokens,
      priority: 10,
    },
  };
}
