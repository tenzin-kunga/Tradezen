#!/bin/bash
# TradeZen Redis Benchmark Script
# Tests throughput and latency for queue operations

set -e

REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
ITERATIONS="${ITERATIONS:-10000}"

echo "=== TradeZen Redis Benchmark ==="
echo "Host: $REDIS_HOST:$REDIS_PORT"
echo "Iterations: $ITERATIONS"
echo ""

# Test 1: PING latency
echo "--- PING Latency ---"
redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" --latency-history -i 1 &
PING_PID=$!
sleep 3
kill $PING_PID 2>/dev/null || true
echo ""

# Test 2: SET throughput
echo "--- SET Throughput ---"
redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" --csv -r "$ITERATIONS" randomkey > /dev/null
echo "SET operations: $ITERATIONS randomkey reads completed"
echo ""

# Test 3: LPUSH/RPOP (queue simulation)
echo "--- Queue Simulation (LPUSH/RPOP) ---"
START_TIME=$(date +%s%N)
for i in $(seq 1 $ITERATIONS); do
  redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" LPUSH test:queue "item:$i" > /dev/null
done
PUSH_TIME=$(( ($(date +%s%N) - $START_TIME) / 1000000 ))
PUSH_RATE=$(( ITERATIONS * 1000 / PUSH_TIME ))
echo "LPUSH: $ITERATIONS operations in ${PUSH_TIME}ms ($PUSH_RATE ops/sec)"

START_TIME=$(date +%s%N)
for i in $(seq 1 $ITERATIONS); do
  redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" RPOP test:queue > /dev/null
done
POP_TIME=$(( ($(date +%s%N) - $START_TIME) / 1000000 ))
POP_RATE=$(( ITERATIONS * 1000 / POP_TIME ))
echo "RPOP: $ITERATIONS operations in ${POP_TIME}ms ($POP_RATE ops/sec)"

# Cleanup
redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" DEL test:queue > /dev/null

echo ""
echo "--- Memory Usage ---"
redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" INFO memory | grep -E "used_memory_human|maxmemory_human"

echo ""
echo "=== Benchmark Complete ==="
