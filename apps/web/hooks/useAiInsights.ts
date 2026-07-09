"use client";

import { useState, useEffect, useRef } from "react";
import { getAiInsights, type AiInsightsResponse } from "@/lib/api";

export function useAiInsights() {
  const [data, setData] = useState<AiInsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    getAiInsights()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  return {
    insights: data?.insights ?? [],
    narrative: data?.narrative ?? null,
    generatedAt: data?.generatedAt ?? null,
    loading,
  };
}
