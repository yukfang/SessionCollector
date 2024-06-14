const Redis = require('ioredis');
const redisSrv = require('./redisSrv')



// Create a new Redis client
const redis1 = new Redis(redisSrv.cacheHostName, {
    password: redisSrv.cachePassword,
    tls: {}, // Required for connecting to Azure Redis Cache over SSL
});

// Log Redis connection events
redis1.on('connect', () => {
    console.log('Connected to Redis1');
});

redis1.on('error', (err) => {
    console.error('Redis error', err);
});

redis1.on('reconnecting', (delay) => {
    console.log(`Reconnecting to Redis in ${delay}ms`);
});

const redis2 = null

/*
const redis2 = new Redis({
    host: 'yfa.yukfang.net', // Docker maps Redis container's port to host's localhost
    port: 6379        // Default Redis port
  });

// Log Redis connection events
redis2.on('connect', () => {
    console.log('Connected to Redis2');
});

redis2.on('error', (err) => {
    console.error('Redis error', err);
});

redis2.on('reconnecting', (delay) => {
    console.log(`Reconnecting to Redis in ${delay}ms`);
});
*/
module.exports = {
    redis1,  
    redis2
}
