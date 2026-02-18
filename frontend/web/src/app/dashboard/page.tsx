'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Search, Clock, TrendingUp } from 'lucide-react';

const stats = [
  { name: '进行中的订单', value: '12', icon: Package, color: 'bg-blue-500' },
  { name: '正在跟踪的货物', value: '28', icon: Search, color: 'bg-green-500' },
  { name: '待处理通知', value: '5', icon: Clock, color: 'bg-yellow-500' },
  { name: '本月完成', value: '156', icon: TrendingUp, color: 'bg-purple-500' },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">概览</h1>
        <p className="text-muted-foreground">
          欢迎回来，查看您的货运业务概况
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.name}
                  </p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>快速操作</CardTitle>
            <CardDescription>常用功能快捷入口</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <a 
              href="/dashboard/tracking" 
              className="flex items-center p-3 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <Search className="h-5 w-5 mr-3 text-primary" />
              <div>
                <p className="font-medium">货物跟踪</p>
                <p className="text-sm text-muted-foreground">查询货物实时位置和状态</p>
              </div>
            </a>
            <a 
              href="/dashboard/orders" 
              className="flex items-center p-3 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <Package className="h-5 w-5 mr-3 text-primary" />
              <div>
                <p className="font-medium">订单管理</p>
                <p className="text-sm text-muted-foreground">查看和管理您的所有订单</p>
              </div>
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>最近活动</CardTitle>
            <CardDescription>您最近的货运动态</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { action: '订单已发货', detail: '集装箱 #CSLU1234567 已离港', time: '2小时前' },
                { action: '货物已到达', detail: '集装箱 #MSCU7654321 已到达目的地', time: '5小时前' },
                { action: '新订单创建', detail: '订单 #ORD-2024-001 已创建', time: '1天前' },
              ].map((item, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="w-2 h-2 mt-2 rounded-full bg-primary" />
                  <div className="flex-1">
                    <p className="font-medium">{item.action}</p>
                    <p className="text-sm text-muted-foreground">{item.detail}</p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
