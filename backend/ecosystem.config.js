module.exports = {
  apps: [{
    name: 'freight-portal-api',
    script: './dist/main.js',
    instances: 'max',        // 根据CPU核心数启动多进程
    exec_mode: 'cluster',    // 集群模式
    
    // 环境变量
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    
    // 日志配置
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    
    // 自动重启
    max_memory_restart: '1G',  // 内存超限自动重启
    restart_delay: 3000,
    max_restarts: 5,
    min_uptime: '10s',
    
    // 优雅退出
    kill_timeout: 5000,
    listen_timeout: 10000,
    
    // 监控
    monitoring: false,
    
    // 合并日志
    merge_logs: true,
    
    // 日志切割
    log_rotate: true,
    log_max_size: '100M',
    log_retention: '7d'
  }]
};
