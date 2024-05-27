const fs = require('fs');
const crypto = require('crypto');
const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const Router = require('koa-router');
const redisConn = require('./redis')
const koaApp = new Koa();
const router = new Router();
koaApp.use(bodyParser())
koaApp.use(router.routes()).use(router.allowedMethods())

let redisClient = null

koaApp.use(async (ctx, next) => {
  await next();
  const rt = ctx.response.get('X-Response-Time');
  console.log(`${ctx.method} ${ctx.url} - ${rt}`);
});

// x-response-time
koaApp.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  ctx.set('X-Response-Time', `${ms}ms`);
});

async function listRecords(ctx, next) {
  if (!redisClient.connected || !redisClient.ready) {
    await redisClient.disconnect()
    await redisClient.connect()
  }
  const  num   = Math.max(ctx.params.num || 3, 1)
  const keys   = (await redisClient.keys('*')).sort((a,b) => {
    const ts_a = new Date(a).getTime()
    const ts_b = new Date(b).getTime()
    return ts_b - ts_a // ts desc
  }).slice(0, Math.min(num, 10)); 

  if (keys.length > 0) {
      const values = await redisClient.mGet(keys);
      ctx.body = values.map(v=>JSON.parse(v))
  } else {
      console.log('No keys found.');
  }
}

async function reportRecord(ctx, next){
  console.log(`Get a report request`)
  if (redisClient && (!redisClient.connected || !redisClient.ready)) {
    await redisClient.disconnect()
    await redisClient.connect()
  } else {
    console.log(`Something wrong with redisClient...`)
  }
  const payload       = ctx.request.body || {"cookie":"_ga=GA1.1.247642188.1716791938; _tt_enable_cookie=1; _ttp=zr3xa7SWgzl6wa9n66RdYG8P97c; __gads=ID=3c223c10f8857ad6:T=1716791940:RT=1716793560:S=ALNI_MaZSaAl05VBfUMZ3TD4FzvAO68Lzg; __gpi=UID=00000e2e9525e7c6:T=1716791940:RT=1716793560:S=ALNI_MYtENS2yqnXj8V0udA5HpLTELELpw; __eoi=ID=ea9c2c50d1e0c300:T=1716791940:RT=1716793560:S=AA-AfjZulDGXR96nQ6VhJL6uV8Ty; _ga_J5P36Y96XS=GS1.1.1716791938.1.1.1716793895.0.0.0","pixelid":"CATFG7BC77U5NQUHDT40"}
  console.log(`Payload = ${payload}`)
  const epoch_ts      = Date.now()
  const ts            = (new Date(epoch_ts)).toISOString()
  // const iso_2_epoch   = (new Date(epoch_ts)).getTime()

  // const _tt_params = ctx.headers['_tt_params'] || null
  const ttclid      = payload?.ttclid
  const pre_ttclid  = payload?.pre_ttclid
  const cookie      = payload?.cookie
  console.log(cookie)
  const _ttp        = getCookieValue(cookie, '_ttp')

  ctx.set('Content-Type', 'application/json');
  if(ttclid && _ttp) {
    ctx.body = {
      _ttp,
      ttclid,
      ttclid_hash   : sha256(ttclid),
      pre_ttclid, 

      // cookie,
      // Referer   : ctx.headers['Referer']          || "",
      // PageUrl   : ctx.headers['page-url']         || "",
      // Referer   : "https://himinigame.com/"       ,
      // PageUrl   : "https://himinigame.com/"       ,
      
      // headers: ctx.headers,
      // payload
      ip            : ctx.headers['client-ip']        ,
      ua            : ctx.headers['user-agent']       ,
      ts
    }
    
    // Save to Redis 
    const cacheResult = await redisClient.set(ctx.body.ttclid_hash, JSON.stringify(ctx.body))
    console.log(`set redis cache = ${cacheResult}`)
  } else {
    ctx.body = {
      msg: 'No ttclid found'
    }
  }
}

router.get('/', (ctx, next) =>{
  ctx.body = fs.readFileSync('index.html', {encoding:'utf8', flag:'r'});
  next();
})
router.get('/list/:num?', listRecords)
router.get('/report',     reportRecord)
router.post('/report',    reportRecord)


// response
koaApp.use(async (ctx, next) => {
  if (ctx.path === '/') {
      if(ctx.method === 'POST') {
          ctx.body = 'OK';
      }
  }  else {
      ctx.body = '' + ctx.path;
  }
})

async function init() {
  if(redisClient === null) {
    redisClient = await redisConn()
  }

  if(redisClient) {
    console.log("Init [PING] -> Redis response : " + await redisClient.ping());  
  }
}

function sha256(input) {
  const hash = crypto.createHash('sha256');
  hash.update(input);
  return hash.digest('hex');
}


function getCookieValue(cookieString, key) {
  // Split the cookie string into individual cookies
  const cookies = cookieString.split(';');

  // Iterate through each cookie to find the desired key-value pair
  for (const cookie of cookies) {
    // Trim any leading or trailing whitespace
    const [cookieKey, cookieValue] = cookie.trim().split('=');
    // Check if the cookie key matches the desired key
    if (cookieKey === key) {
      // Return the value if found
      return cookieValue;
    }
  }

  // Return null if the key is not found
  return null;
}

// Example usage:

module.exports = {
  koaApp,
  init,
};
