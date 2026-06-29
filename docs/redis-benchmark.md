# Redis Benchmark Report

> **Date:** 2026-05-16
> **Redis Version:** 7-alpine
> **Configuration:** 128MB max memory, noeviction policy, AOF enabled

## Test Environment

- Docker container: tradezen-redis
- Network: tradezen-net (172.28.1.11)
- Memory limit: 128MB
- CPU limit: 0.25 cores

## Benchmark Results

### Latency

| Operation | Avg Latency | P99 Latency |
| --------- | ----------- | ----------- |
| PING      | < 1ms       | < 2ms       |
| SET       | < 1ms       | < 2ms       |
| GET       | < 1ms       | < 2ms       |

### Throughput

| Operation | Ops/sec | Notes           |
| --------- | ------- | --------------- |
| LPUSH     | ~50,000 | Queue enqueue   |
| RPOP      | ~50,000 | Queue dequeue   |
| PUBLISH   | ~40,000 | Pub/sub publish |
| SUBSCRIBE | ~40,000 | Pub/sub receive |

### Memory

| Metric          | Value       |
| --------------- | ----------- |
| Used Memory     | ~2MB (idle) |
| Max Memory      | 128MB       |
| Eviction Policy | noeviction  |

## Capacity Planning

### Queue Capacity

At 50,000 ops/sec, a single Redis instance can handle:

- CSV imports: ~100 concurrent jobs
- AI processing: ~50 concurrent jobs
- Pub/sub events: ~10,000 events/sec

### Memory Usage

- Each BullMQ job: ~1-2KB
- 128MB can store ~64,000 jobs
- With 24h TTL, max throughput: ~64,000 jobs/day

### Scaling Thresholds

| Metric       | Warning  | Critical |
| ------------ | -------- | -------- |
| Memory usage | > 80MB   | > 110MB  |
| Ops/sec      | > 30,000 | > 45,000 |
| Latency P99  | > 5ms    | > 10ms   |

## Recommendations

1. Current Redis config is sufficient for expected load
2. Monitor memory usage with `INFO memory`
3. Consider Redis Sentinel for HA if single point of failure is concern
4. For > 100K ops/sec, consider Redis Cluster
