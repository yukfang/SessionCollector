const redis = require("redis");

// Environment variables for cache server
const cacheHostName = process.env.RedisHost
const cachePassword = process.env.RedisPassword

async function getRedisClient() {

    // Connection configuration
    const cacheConnection = redis.createClient({
        // rediss for TLS
        url: `${cacheHostName}`,
        password: cachePassword
    });

    // Connect to Redis
    await cacheConnection.connect();

    // PING command
    if(false) {
        console.log("\nCache command: PING");
        console.log("Cache response : " + await cacheConnection.ping());
    }

    // GET
    if(false) {
        console.log("\nCache command: GET Message");
        console.log("Cache response : " + await cacheConnection.get("Message"));
    }

    // SET
    if(false)
    {
        console.log("\nCache command: SET Message");
        const key = 'ttclid_abc'
        const value = JSON.stringify({
            ts: new Date(),
            session_id : 'session_id_x',
            _ttp: '_ttp_cookie_val'
        })
        console.log("Cache response : " + await cacheConnection.set(key, value));
    
    }

    // DELETE
    if(true) {
        console.log("\nCache command: DELETE Message");
        const key = "ttclid_abc"
        const result = await cacheConnection.del(key);
        if (result === 1) {
            console.log(`Key ${key} deleted successfully.`);
        } else {
            console.log(`Key ${key} does not exist.`);
        }
    }

    // Disconnect
    // cacheConnection.disconnect()

    return cacheConnection
}

// testCache().then((result) => console.log(result)).catch(ex => console.log(ex));
async function test() {
    await getRedisClient()
}
// test();

module.exports = getRedisClient