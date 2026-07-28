module.exports = {
  apps: [
    {
      name: "agent-skill-hub",
      cwd: "/opt/apps/agent-skill-hub",
      script: "node_modules/next/dist/bin/next",
      args: "start --hostname 127.0.0.1 --port 3003",
      env: {
        NODE_ENV: "production"
      },
      max_memory_restart: "512M",
      kill_timeout: 10000,
      listen_timeout: 10000
    }
  ]
};
