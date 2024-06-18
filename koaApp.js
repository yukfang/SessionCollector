const fs = require('fs');
const crypto = require('crypto');
const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const Router = require('koa-router');
const {redis1, redis2} = require('./redisIO');
const koaApp = new Koa();
const router = new Router();
koaApp.use(bodyParser())
koaApp.use(router.routes()).use(router.allowedMethods())


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
  const  num   = Math.max(ctx.params.num || 3, 1)
  const keys   = (await redis1.keys('*')).sort((a,b) => {
    const ts_a = new Date(a).getTime()
    const ts_b = new Date(b).getTime()
    return ts_b - ts_a // ts desc
  }).slice(0, Math.min(num, 10)); 

  if (keys.length > 0) {
      const values = await redis1.mget(keys);
      ctx.body = values.map(v=>JSON.parse(v))
  } else {
      console.log('No keys found.');
  }
}

async function reportRecord(ctx, next){

  const payload       = ctx.request.body
  const epoch_ts      = Date.now()
  const ts            = (new Date(epoch_ts)).toISOString()
  // const iso_2_epoch   = (new Date(epoch_ts)).getTime()

  // const _tt_params = ctx.headers['_tt_params'] || null
  const ttclid      = payload?.ttclid
  const pre_ttclid  = payload?.pre_ttclid
  const cookie      = payload?.cookie
  const _ttp        = getCookieValue(cookie, '_ttp')
  const pixel_code  = payload?.pixelid 

  ctx.set('Content-Type', 'application/json');
  if(ttclid) {
    ctx.body = {
      pixel_code,
      _ttp,
      ttclid,
      ttclid_hash   : sha256(ttclid),
      pre_ttclid, 

      // PageUrl   : ctx.headers['page-url']       ,
      // Referer   : "https://himinigame.com/"       ,
      // PageUrl   : "https://himinigame.com/"       ,
      
      // payload,
      // header  : ctx.headers,
      referer       : ctx.headers['referer']    || ''   ,
      ip            : ctx.headers['client-ip']        ,
      ua            : ctx.headers['user-agent']       ,
      ts
    }
    
    // Save to Redis 
    const cacheResult1 = await redis1.set(ctx.body.ttclid_hash, JSON.stringify(ctx.body))
    console.log(`set redis1 cache = ${cacheResult1} `)

    try {
      // const cacheResult2 = await redis2.set(ctx.body.ttclid_hash, JSON.stringify(ctx.body))
      // console.log(`set redis2 cache = ${cacheResult2}`)
    } catch(e) {
      
    }
  } else {
    ctx.body = {
      payload, cookie
    }
    ctx.status = 500
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
  // await redis.ping();
}

function sha256(input) {
  const hash = crypto.createHash('sha256');
  hash.update(input);
  return hash.digest('hex');
}


function getCookieValue(cookieString, key) {
  if(cookieString === null || cookieString === undefined) {
    console.log(`Request doesn't have a cookie...`)
    return ''
  } else {
    console.log(cookieString)
  }
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
