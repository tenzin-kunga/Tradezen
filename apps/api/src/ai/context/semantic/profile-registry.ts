import { Injectable } from '@nestjs/common';
import { RetrievalIntent, type RetrievalProfile } from './types';

@Injectable()
export class ProfileRegistry {
  private profiles: Record<RetrievalIntent, RetrievalProfile> = {
    [RetrievalIntent.CHAT]: {
      maxResults: 15,
      similarityThreshold: 0.7,
      maxTokens: 3000,
    },
    [RetrievalIntent.REVIEW]: {
      maxResults: 10,
      similarityThreshold: 0.7,
      maxTokens: 1500,
    },
    [RetrievalIntent.REPORT]: {
      maxResults: 20,
      similarityThreshold: 0.6,
      maxTokens: 5000,
    },
    [RetrievalIntent.INSPECT]: {
      maxResults: 5,
      similarityThreshold: 0.6,
      maxTokens: 500,
    },
    [RetrievalIntent.COACH]: {
      maxResults: 5,
      similarityThreshold: 0.75,
      maxTokens: 1000,
    },
  };

  get(intent: RetrievalIntent): RetrievalProfile {
    return this.profiles[intent];
  }
}
