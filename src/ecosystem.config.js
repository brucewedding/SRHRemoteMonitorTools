module.exports = {
    apps: [{
      name: "RealheartServer",
      script: "server/server.js",
      watch: false,
      max_memory_restart: "1G",
      exp_backoff_restart_delay: 100,
      max_restarts: 10,
      restart_delay: 4000,
      error_file: "logs/err.log",
      out_file: "logs/out.log",
      env: {
        NODE_ENV: "production"
      }
    }]
  }