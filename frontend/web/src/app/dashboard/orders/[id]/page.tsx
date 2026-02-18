'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { orderApi } from '@/lib/api/services';
import { handleApiError } from '@/lib/api/client';
import { Loader2, AlertCircle, ChevronLeft, Package, MapPin, Clock, Ship, Truck, CheckCircle } from 'lucide-react';

const statusColors: Record<string, string> = {
  'pending': 'bg-yellow-500',
  'confirmed': 'bg-blue-500',
  'in_transit': 'bg-indigo-500',
  'arrived': 'bg-purple-500',
  'delivered': 'bg-green-500',
  'cancelled': 'bg-red-500',
};

const statusLabels: Record<string, string> = {
  'pending': '待确认',
  'confirmed': '已确认',
  'in_transit': '运输中',
  'arrived': '已到达',
  'delivered': '已送达',
  'cancelled': '已取消',
};

interface OrderDetail {
  id: string;
  orderNumber: string;
  containerNumber: string;
  cargoType: string;
  weight: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  origin: string;
  destination: string;
  status: string;
  plannedDeparture: string;
  plannedArrival: string;
  actualDeparture?: string;
  actualArrival?: string;
  createdAt: string;
  timeline: {
    title: string;
    description: string;
    timestamp: string;
    completed: boolean;
  }[];
}

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params.id as string;
  
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (orderId) {
      fetchOrderDetail();
    }
  }, [orderId]);

  const fetchOrderDetail = async () => {
    try {
      setLoading(true);
      const response = await orderApi.getOrderById(orderId);
      setOrder(response.data);
    } catch (err: any) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!order) {
    return (
      <Alert>
        <AlertDescription>订单不存在</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/orders">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="h-4 w-4 mr-1" />
            返回订单列表
          </Button>
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">订单详情</h1>
          <p className="text-muted-foreground">订单号: {order.orderNumber}</p>
        </div>
        <Badge className={`${statusColors[order.status] || 'bg-gray-500'} text-white text-sm px-3 py-1`}>
          {statusLabels[order.status] || order.status}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="h-5 w-5 mr-2" />
              基本信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">集装箱号</p>
                <p className="font-medium">{order.containerNumber}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">货物类型</p>
                <p className="font-medium">{order.cargoType}</p>
              </div>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground">重量</p>
              <p className="font-medium">{order.weight} kg</p>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground">尺寸</p>
              <p className="font-medium">
                {order.dimensions.length}m × {order.dimensions.width}m × {order.dimensions.height}m
              </p>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground">创建时间</p>
              <p className="font-medium">{new Date(order.createdAt).toLocaleString('zh-CN')}</p>
            </div>
          </CardContent>
        </Card>

        {/* Route Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              运输路线
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">起运地</p>
                <p className="font-medium text-lg">{order.origin}</p>
              </div>
              <div className="flex items-center">
                <div className="w-16 h-0.5 bg-slate-300"></div>
                <Ship className="h-5 w-5 mx-2 text-slate-400" />
                <div className="w-16 h-0.5 bg-slate-300"></div>
              </div>
              <div className="flex-1 text-right">
                <p className="text-sm text-muted-foreground">目的地</p>
                <p className="font-medium text-lg">{order.destination}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <p className="text-sm text-muted-foreground">计划出发</p>
                <p className="font-medium">{new Date(order.plannedDeparture).toLocaleString('zh-CN')}</p>
                {order.actualDeparture && (
                  <p className="text-sm text-green-600">
                    实际出发: {new Date(order.actualDeparture).toLocaleString('zh-CN')}
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">计划到达</p>
                <p className="font-medium">{new Date(order.plannedArrival).toLocaleString('zh-CN')}</p>
                {order.actualArrival && (
                  <p className="text-sm text-green-600">
                    实际到达: {new Date(order.actualArrival).toLocaleString('zh-CN')}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            订单状态时间轴
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />
            
            <div className="space-y-6">
              {order.timeline?.map((event, index) => (
                <div key={index} className="relative flex items-start space-x-4">
                  <div 
                    className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center ${
                      event.completed ? 'bg-primary text-primary-foreground' : 'bg-slate-200 text-slate-400'
                    }`}
                  >
                    {event.completed ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Clock className="h-4 w-4" />
                    )}
                  </div>
                  
                  <div className="flex-1 pt-1">
                    <div className="flex items-center justify-between">
                      <h4 className={`font-medium ${event.completed ? 'text-slate-900' : 'text-slate-400'}`}>
                        {event.title}
                      </h4>
                      <span className="text-sm text-muted-foreground">
                        {new Date(event.timestamp).toLocaleString('zh-CN')}
                      </span>
                    </div>
                    <p className={`text-sm ${event.completed ? 'text-muted-foreground' : 'text-slate-300'}`}>
                      {event.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
