# TradeZen Scaling Guide

## Horizontal Scaling

### API Scaling
```bash
# Scale API to 3 instances
docker-compose -f docker-compose.yml -f docker-compose.scaling.yml up -d --scale api=3

# Scale API to 5 instances
docker-compose -f docker-compose.yml -f docker-compose.scaling.yml up -d --scale api=5
```

### Load Balancer
Nginx distributes traffic across API instances. WebSocket connections are sticky via the `Upgrade` header.

### Database
PostgreSQL is single-instance. For read scaling, consider:
- Read replicas with pgpool-II
- Connection pooling with PgBouncer

### Redis
Redis is single-instance. For high availability:
- Redis Sentinel for failover
- Redis Cluster for sharding

### Session Management
WebSocket sessions are stored in memory. For multi-instance:
- Use Redis adapter for Socket.IO: `@socket.io/redis-adapter`
- All instances share the same Redis pub/sub

## Vertical Scaling

### Resource Limits
Current limits in docker-compose.yml:
- PostgreSQL: 1G RAM, 0.5 CPU
- Redis: 256M RAM, 0.25 CPU
- API: 512M RAM, 0.5 CPU
- Web: 512M RAM, 0.5 CPU

Increase these based on load testing results.

## Monitoring
Use Sentry (TZ-080) to track error rates across instances.
