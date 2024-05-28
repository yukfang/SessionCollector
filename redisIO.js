const Redis = require('ioredis');
const redisSrv = require('./redisSrv')





// Create a new Redis client
const redis = new Redis(redisSrv.cacheHostName, {
    password: redisSrv.cachePassword,
    tls: {}, // Required for connecting to Azure Redis Cache over SSL
});

// Log Redis connection events
redis.on('connect', () => {
    console.log('Connected to Redis');
});

redis.on('error', (err) => {
    console.error('Redis error', err);
});

redis.on('reconnecting', (delay) => {
    console.log(`Reconnecting to Redis in ${delay}ms`);
});

module.exports = redis;
