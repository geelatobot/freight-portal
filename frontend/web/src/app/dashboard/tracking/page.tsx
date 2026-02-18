'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { trackingApi } from '@/lib/api/services';
import { handleApiError } from '@/lib/api/client';
import { Search, Loader2, AlertCircle, MapPin, Clock, Package, Ship, Truck } from 'lucide-react';

const trackingSchema = z.object({
  containerNumber: z.string().min(11, '请输入有效的集装箱号'),
});

type TrackingFormData = z.infer<typeof trackingSchema>;

interface CargoStatus {
  containerNumber: string;
  status: string;
  location: string;
  eta: string;
  lastUpdate: string;
  milestones: {
    title: string;
    description: string;
    timestamp: string;
    completed: boolean;
    icon?: string;
  }[];
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

export default function TrackingPage() {
  const [cargoStatus, setCargoStatus] = useState<CargoStatus | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TrackingFormData>({
    resolver: zodResolver(trackingSchema),
  });

  const onSubmit = async (data: TrackingFormData) => {
    try {
      setIsLoading(true);
      setError('');
      
      const response = await trackingApi.getCargoStatus(data.containerNumber);
      setCargoStatus(response.data);
    } catch (err: any) {
      setError(handleApiError(err));
      setCargoStatus(null);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'in_transit':
        return Ship;
      case 'delivered':
        return Package;
      default:
        return MapPin;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">货物跟踪</h1>
        <p className="text-muted-foreground">
          实时查询您的货物运输状态
        </p>
      </div>

      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle>查询货物</CardTitle>
          <CardDescription>输入集装箱号查询货物状态</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="请输入集装箱号 (例如: CSLU1234567)"
                {...register('containerNumber')}
              />
              {errors.containerNumber && (
                <p className="text-sm text-red-500 mt-1">{errors.containerNumber.message}</p>
              )}
            </div>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  查询中...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  查询
                </>
              )}
            </Button>
          </form>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Cargo Status */}
      {cargoStatus && (
        <div className="space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>集装箱 #{cargoStatus.containerNumber}</CardTitle>
                  <CardDescription>货物实时状态</CardDescription>
                </div>
                <Badge 
                  className={`${statusColors[cargoStatus.status] || 'bg-gray-500'} text-white`}
                >
                  {statusLabels[cargoStatus.status] || cargoStatus.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <MapPin className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">当前位置</p>
                    <p className="font-medium">{cargoStatus.location}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Clock className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">预计到达</p>
                    <p className="font-medium">{cargoStatus.eta}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Ship className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">最后更新</p>
                    <p className="font-medium">{cargoStatus.lastUpdate}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>运输时间轴</CardTitle>
              <CardDescription>货物运输全程节点</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />
                <div className="space-y-6">
                  {cargoStatus.milestones?.map((milestone, index) => {
                    const Icon = milestone.icon === 'truck' ? Truck : 
                                 milestone.icon === 'ship' ? Ship : 
                                 milestone.icon === 'package' ? Package : MapPin;
                    
                    return (
                      <div key={index} className="relative flex items-start space-x-4">
                        <div 
                          className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center ${
                            milestone.completed ? 'bg-primary text-primary-foreground' : 'bg-slate-200 text-slate-400'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        
                        <div className="flex-1 pt-1">
                          <div className="flex items-center justify-between">
                            <h4 className={`font-medium ${milestone.completed ? 'text-slate-900' : 'text-slate-400'}`}>
                              {milestone.title}
                            </h4>
                            <span className="text-sm text-muted-foreground">
                              {milestone.timestamp}
                            </span>
                          </div>
                          <p className={`text-sm ${milestone.completed ? 'text-muted-foreground' : 'text-slate-300'}`}>
                            {milestone.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
