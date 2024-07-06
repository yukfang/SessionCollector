const fs = require('fs')
const PRJ_DIR = process.cwd()
var redisServer = {cacheHostName : process.env.RedisHost, cachePassword : process.env.RedisPassword }



if(fs.existsSync(`${PRJ_DIR}/Redis/redisSrv.local.js`) === true) {
    redisServer = require(`${PRJ_DIR}/Redis/redisSrv.local.js`)
} else {
    
}

module.exports = redisServer
