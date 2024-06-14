const Redis = require('ioredis');
const redisSrv = require('./redisSrv');

// Environment variables for configuration
const {
    REDIS1_HOSTNAME = 'tiktok.redis.cache.windows.net',
    REDIS1_PASSWORD = redisSrv.cachePassword,
    REDIS2_HOST = 'yfa.yukfang.net',
    REDIS2_PORT = 6379,
} = process.env;

// Function to create a Redis client and handle connection events
function createRedisClient(options, clientName) {
    const client = new Redis(options);

    return new Promise((resolve, reject) => {
        client.on('connect', () => {
            console.log(`Connected to ${clientName}`);
            resolve(client);
        });

        client.on('error', (err) => {
            console.error(`${clientName} error`, err);
        });

        client.on('reconnecting', (delay) => {
            console.log(`Reconnecting to ${clientName} in ${delay}ms`);
        });

        // Set a timeout to reject the promise if connection is not established
        setTimeout(() => {
            reject(new Error(`Connection to ${clientName} timed out`));
        }, 5000); // Adjust the timeout as needed
    });
}

// Initialize Redis clients
const redis1Promise = createRedisClient({
    host: REDIS1_HOSTNAME,
    port: 6380,
    password: REDIS1_PASSWORD,
    tls: {}, // Required for connecting to Azure Redis Cache over SSL
}, 'Redis1');

const redis2Promise = createRedisClient({
    host: REDIS2_HOST,
    port: REDIS2_PORT,
}, 'Redis2');

// Wait for at least one connection to succeed
Promise.any([redis1Promise, redis2Promise])
    .then((client) => {
        console.log('At least one Redis connection established');
        // Export the connected clients
        module.exports = { 
            redis1: client === redis1Promise ? client : null,
            redis2: client === redis2Promise ? client : null
        };
        // Proceed with application initialization
    }) 
    .catch((err) => {
        console.error('Failed to connect to any Redis instance', err);
        // Handle the case where neither connection could be established
        process.exit(1);
    });
