module.exports = {
  apps : [
    {
      "ignore_watch" : [
        "node_modules", 
      ],
      "watch_options": {
        "followSymlinks": false,
      },


      script: "./index.js",
      "watch": true,
      name: "SessionCollector"
    }
  ]
}
