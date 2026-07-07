from __future__ import annotations

import statistics
from .models import Stage, RequestTrace


def percentile(data: list[float], p: int) -> float:
    if not data:
        return 0.0
    sorted_data = sorted(data)
    k = (len(sorted_data) - 1) * (p / 100)
    f = int(k)
    c = f + 1
    if c >= len(sorted_data):
        return sorted_data[f]
    return sorted_data[f] + (k - f) * (sorted_data[c] - sorted_data[f])


class LatencyReporter:
    """Aggregates latency stats across traces."""

    def report(self, traces: list[RequestTrace]) -> dict:
        by_stage: dict[str, dict] = {}
        for stage in Stage:
            latencies = [t.stage_latency(stage) for t in traces if t.stage_latency(stage) > 0]
            if latencies:
                by_stage[stage.value] = {
                    "count": len(latencies),
                    "mean": round(statistics.mean(latencies), 1),
                    "min": round(min(latencies), 1),
                    "max": round(max(latencies), 1),
                    "p50": round(percentile(latencies, 50), 1),
                    "p95": round(percentile(latencies, 95), 1),
                    "p99": round(percentile(latencies, 99), 1),
                }

        totals = [t.total_latency_ms for t in traces]
        return {
            "total_requests": len(traces),
            "by_stage": by_stage,
            "total": {
                "count": len(totals),
                "mean": round(statistics.mean(totals), 1) if totals else 0,
                "min": round(min(totals), 1) if totals else 0,
                "max": round(max(totals), 1) if totals else 0,
                "p50": round(percentile(totals, 50), 1),
                "p95": round(percentile(totals, 95), 1),
            },
        }

    def timeline(self, trace: RequestTrace) -> str:
        """Human-readable timeline for a single request."""
        lines = [f"Request {trace.request_id[:8]}..."]
        seen_stages = set()
        for span in trace.spans:
            if span.stage in seen_stages:
                continue
            seen_stages.add(span.stage)
            latency = trace.stage_latency(span.stage)
            bar_len = min(int(latency / 5), 40)
            bar = "█" * bar_len if bar_len > 0 else "·"
            lines.append(f"  {span.stage.value:<16} {bar} {latency:.1f} ms")
        lines.append(f"  {'Total':<16} {'█' * min(int(trace.total_latency_ms / 5), 40)} {trace.total_latency_ms:.1f} ms")
        return "\n".join(lines)
