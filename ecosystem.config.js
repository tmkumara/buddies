module.exports = {
  apps: [
    {
      name: 'giftbox-oms',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: '/opt/giftbox-oms',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
