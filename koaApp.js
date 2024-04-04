const fs = require('fs');
const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const redisConn = require('./redis')
const koaApp = new Koa();

let redisClient = null
koaApp.use(bodyParser());
// logger
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

// response
koaApp.use(async (ctx, next) => {
    if (ctx.path === '/report') {
        // ctx.body =   ctx.request.body 
        const epoch_ts      = Date.now()
        const ts            = (new Date(epoch_ts)).toISOString()
        // const iso_2_epoch   = (new Date(epoch_ts)).getTime()

        ctx.body = {
          ts,
          ip: ctx.ip,
          ua: ctx.headers['user-agent'],
          // _ttp      : ctx.cookies.get('_ttp')         || "",
          ttclid    : ctx.headers['ttclid']           || ts,
          ttp       : ctx.headers['ttp']              || "",
          Referer   : ctx.headers['Referer']          || "",
          PageUrl   : ctx.headers['page-url']         || "",
          raw: ctx.request.body
        }
        
        // Save to Redis 
        await redisClient.set(ts, JSON.stringify(ctx.body))

    } else if (ctx.path === '/list') {

      const keys = (await redisClient.keys('*')).sort((a,b) => {
          const ts_a = new Date(a).getTime()
          const ts_b = new Date(b).getTime()
          // console.log(`${ts_a} vs ${ts_b} = ${ts_a - ts_b}`)
          return ts_b - ts_a // ts desc
      }).slice(0,3); 
      for(let i = 0 ; i < keys.length; i++) {
        console.log(new Date(keys[i]).getTime())
      }
      if (keys.length > 0) {
          const values = await redisClient.mGet(keys);
          ctx.body = values.map(v=>JSON.parse(v))
          // ctx.body = keys
          // Combine keys and values into a readable format
          // const records = keys.map((key, index) => ({ key, value: values[index] }));
      } else {
          console.log('No keys found.');
      }
    }
    else if (ctx.path === '/') {
        if(ctx.method === 'POST') {
            ctx.body = 'OK';
        } else {
            ctx.body = fs.readFileSync('index.html', {encoding:'utf8', flag:'r'});
        }
    }  else {
        ctx.body = 'Hello World: ' + ctx.path;
    }

    next();
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
