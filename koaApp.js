const fs = require('fs');
const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const Router = require('koa-router');
const redisConn = require('./redis')
const koaApp = new Koa();
const router = new Router();
koaApp.use(router.routes()).use(router.allowedMethods()).use(bodyParser())

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
  if (!redisClient.connected || !redisClient.ready) {
    await redisClient.disconnect()
    await redisClient.connect()
  }
  // ctx.body =   ctx.request.body 
  const epoch_ts      = Date.now()
  const ts            = (new Date(epoch_ts)).toISOString()
  // const iso_2_epoch   = (new Date(epoch_ts)).getTime()

  ctx.body = {
    ts,
    ip: ctx.ip,
    ua: ctx.headers['user-agent'],
    _ttp      : ctx.cookies.get('_ttp')         || "",
    ttclid    : ctx.headers['ttclid']           || "",
    ttp       : ctx.headers['ttp']              || "",
    Referer   : ctx.headers['Referer']          || "",
    PageUrl   : ctx.headers['page-url']         || "",
    raw: ctx.request.body
  }
  
  // Save to Redis 
  await redisClient.set(ts, JSON.stringify(ctx.body))
}

router.get('/', (ctx, next) =>{
  ctx.body = fs.readFileSync('index.html', {encoding:'utf8', flag:'r'});
  next();
})
router.get('/list/:num?', listRecords)
router.get('/report',     reportRecord)


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

module.exports = {
  koaApp,
  init,
};
