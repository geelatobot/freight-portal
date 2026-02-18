'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { trackingApi } from '@/lib/api/services';
import { handleApiError } from '@/lib/api/client';
import { Search, Loader2, AlertCircle, Bell, BellOff, Trash2, CheckCircle } from 'lucide-react';

interface Subscription {
  id: string;
  containerNumber: string;
  status: string;
  origin: string;
  destination: string;
  eta: string;
  subscribedAt: string;
}

const statusColors: Record<string, string> = {
  'in_transit': 'bg-blue-500',
  'at_port': 'bg-yellow-500',
  'delivered': 'bg-green-500',
  'pending': 'bg-gray-500',
  'customs': 'bg-orange-500',
};

const statusLabels: Record<string, string> = {
  'in_transit': '运输中',
  'at_port': '港口停靠',
  'delivered': '已送达',
  'pending': '待处理',
  'customs': '清关中',
};

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [containerNumber, setContainerNumber] = useState('');
  const [subscribing, setSubscribing] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const response = await trackingApi.getSubscriptions();
      setSubscriptions(response.data);
    } catch (err: any) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!containerNumber.trim()) return;
    
    try {
      setSubscribing(true);
      setError('');
      setMessage('');
      
      await trackingApi.subscribe(containerNumber.trim());
      setMessage('订阅成功！');
      setContainerNumber('');
      fetchSubscriptions();
      
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setError(handleApiError(err));
    } finally {
      setSubscribing(false);
    }
  };

  const handleUnsubscribe = async (containerNumber: string) => {
    try {
      await trackingApi.unsubscribe(containerNumber);
      fetchSubscriptions();
    } catch (err: any) {
      setError(handleApiError(err));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">订阅管理</h1>
        <p className="text-muted-foreground">管理您的货物跟踪订阅，及时获取状态更新</p>
      </div>

      {/* Subscribe Form */}
      <Card>
        <CardHeader>
          <CardTitle>新增订阅</CardTitle>
          <CardDescription>输入集装箱号订阅货物状态更新通知</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="输入集装箱号 (例如: CSLU1234567)"
                  className="pl-10"
                  value={containerNumber}
                  onChange={(e) => setContainerNumber(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubscribe()}
                />
              </div>
            </div>
            
            <Button onClick={handleSubscribe} disabled={subscribing}>
              {subscribing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  订阅中...
                </>
              ) : (
                <>
                  <Bell className="mr-2 h-4 w-4" />
                  订阅
                </>
              )}
            </Button>
          </div>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {message && (
            <Alert className="mt-4 bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Subscriptions List */}
      <Card>
        <CardHeader>
          <CardTitle>我的订阅</CardTitle>
          <CardDescription>共 {subscriptions.length} 个订阅</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="text-center py-12">
              <BellOff className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-muted-foreground">暂无订阅</p>
              <p className="text-sm text-muted-foreground">订阅货物以接收状态更新通知</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>集装箱号</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>路线</TableHead>
                  <TableHead>预计到达</TableHead>
                  <TableHead>订阅时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">{sub.containerNumber}</TableCell>
                    <TableCell>
                      <Badge className={`${statusColors[sub.status] || 'bg-gray-500'} text-white`}>
                        {statusLabels[sub.status] || sub.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {sub.origin} → {sub.destination}
                    </TableCell>
                    <TableCell>{sub.eta}</TableCell>
                    <TableCell>
                      {new Date(sub.subscribedAt).toLocaleDateString('zh-CN')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUnsubscribe(sub.containerNumber)}
                      >
                        <Trash2 className="h-4 w-4 mr-1 text-red-500" />
                        取消订阅
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
