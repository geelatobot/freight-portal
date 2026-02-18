'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { orderApi } from '@/lib/api/services';
import { handleApiError } from '@/lib/api/client';
import { Loader2, AlertCircle, ChevronLeft, ChevronRight, Check } from 'lucide-react';

const orderSchema = z.object({
  containerNumber: z.string().min(11, '请输入有效的集装箱号'),
  cargoType: z.string().min(1, '请输入货物类型'),
  weight: z.number().min(0.1, '重量必须大于0'),
  length: z.number().min(0.1, '长度必须大于0'),
  width: z.number().min(0.1, '宽度必须大于0'),
  height: z.number().min(0.1, '高度必须大于0'),
  origin: z.string().min(2, '请输入起运地'),
  destination: z.string().min(2, '请输入目的地'),
  plannedDeparture: z.string().min(1, '请选择计划出发时间'),
  plannedArrival: z.string().min(1, '请选择计划到达时间'),
  requirements: z.string().optional(),
});

type OrderFormData = z.infer<typeof orderSchema>;

const steps = [
  { id: 1, name: '货物信息', description: '填写货物基本信息' },
  { id: 2, name: '尺寸重量', description: '填写货物尺寸和重量' },
  { id: 3, name: '运输路线', description: '填写运输路线信息' },
  { id: 4, name: '确认提交', description: '确认并提交订单' },
];

export default function NewOrderPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    trigger,
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      weight: 0,
      length: 0,
      width: 0,
      height: 0,
    },
  });

  const formData = watch();

  const validateStep = async (step: number) => {
    let fieldsToValidate: string[] = [];
    
    switch (step) {
      case 1:
        fieldsToValidate = ['containerNumber', 'cargoType'];
        break;
      case 2:
        fieldsToValidate = ['weight', 'length', 'width', 'height'];
        break;
      case 3:
        fieldsToValidate = ['origin', 'destination', 'plannedDeparture', 'plannedArrival'];
        break;
    }
    
    const result = await trigger(fieldsToValidate as any);
    return result;
  };

  const handleNext = async () => {
    const isValid = await validateStep(currentStep);
    if (isValid) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
    }
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const onSubmit = async (data: OrderFormData) => {
    try {
      setIsLoading(true);
      setError('');
      
      await orderApi.createOrder({
        cargoInfo: {
          containerNumber: data.containerNumber,
          cargoType: data.cargoType,
          weight: data.weight,
          dimensions: {
            length: data.length,
            width: data.width,
            height: data.height,
          },
        },
        route: {
          origin: data.origin,
          destination: data.destination,
          plannedDeparture: data.plannedDeparture,
          plannedArrival: data.plannedArrival,
        },
        requirements: data.requirements,
      });
      
      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard/orders');
      }, 2000);
    } catch (err: any) {
      setError(handleApiError(err));
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle>订单创建成功！</CardTitle>
              <CardDescription>
                您的订单已成功提交，正在跳转到订单列表...
              </CardDescription>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/orders">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="h-4 w-4 mr-1" />
            返回
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">新建订单</h1>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
                  currentStep > step.id
                    ? 'bg-green-500 text-white'
                    : currentStep === step.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {currentStep > step.id ? (
                  <Check className="h-5 w-5" />
                ) : (
                  step.id
                )}
              </div>
              <div className="mt-2 text-center">
                <p className="text-sm font-medium">{step.name}</p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`w-24 h-0.5 mx-4 ${
                  currentStep > step.id ? 'bg-green-500' : 'bg-slate-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>{steps[currentStep - 1].name}</CardTitle>
            <CardDescription>{steps[currentStep - 1].description}</CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Step 1: Cargo Info */}
            {currentStep === 1 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="containerNumber">集装箱号</Label>
                  <Input
                    id="containerNumber"
                    placeholder="例如: CSLU1234567"
                    {...register('containerNumber')}
                  />
                  {errors.containerNumber && (
                    <p className="text-sm text-red-500">{errors.containerNumber.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="cargoType">货物类型</Label>
                  <Input
                    id="cargoType"
                    placeholder="例如: 电子产品、机械设备"
                    {...register('cargoType')}
                  />
                  {errors.cargoType && (
                    <p className="text-sm text-red-500">{errors.cargoType.message}</p>
                  )}
                </div>
              </>
            )}

            {/* Step 2: Dimensions */}
            {currentStep === 2 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="weight">重量 (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.01"
                    {...register('weight', { valueAsNumber: true })}
                  />
                  {errors.weight && (
                    <p className="text-sm text-red-500">{errors.weight.message}</p>
                  )}
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="length">长度 (m)</Label>
                    <Input
                      id="length"
                      type="number"
                      step="0.01"
                      {...register('length', { valueAsNumber: true })}
                    />
                    {errors.length && (
                      <p className="text-sm text-red-500">{errors.length.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="width">宽度 (m)</Label>
                    <Input
                      id="width"
                      type="number"
                      step="0.01"
                      {...register('width', { valueAsNumber: true })}
                    />
                    {errors.width && (
                      <p className="text-sm text-red-500">{errors.width.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="height">高度 (m)</Label>
                    <Input
                      id="height"
                      type="number"
                      step="0.01"
                      {...register('height', { valueAsNumber: true })}
                    />
                    {errors.height && (
                      <p className="text-sm text-red-500">{errors.height.message}</p>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Step 3: Route */}
            {currentStep === 3 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="origin">起运地</Label>
                    <Input
                      id="origin"
                      placeholder="例如: 上海"
                      {...register('origin')}
                    />
                    {errors.origin && (
                      <p className="text-sm text-red-500">{errors.origin.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="destination">目的地</Label>
                    <Input
                      id="destination"
                      placeholder="例如: 洛杉矶"
                      {...register('destination')}
                    />
                    {errors.destination && (
                      <p className="text-sm text-red-500">{errors.destination.message}</p>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="plannedDeparture">计划出发时间</Label>
                    <Input
                      id="plannedDeparture"
                      type="datetime-local"
                      {...register('plannedDeparture')}
                    />
                    {errors.plannedDeparture && (
                      <p className="text-sm text-red-500">{errors.plannedDeparture.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="plannedArrival">计划到达时间</Label>
                    <Input
                      id="plannedArrival"
                      type="datetime-local"
                      {...register('plannedArrival')}
                    />
                    {errors.plannedArrival && (
                      <p className="text-sm text-red-500">{errors.plannedArrival.message}</p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="requirements">特殊要求 (可选)</Label>
                  <Textarea
                    id="requirements"
                    placeholder="请输入任何特殊运输要求..."
                    rows={3}
                    {...register('requirements')}
                  />
                </div>
              </>
            )}

            {/* Step 4: Review */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-lg space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">集装箱号</p>
                    <p className="font-medium">{formData.containerNumber || '-'}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">货物类型</p>
                      <p className="font-medium">{formData.cargoType || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">重量</p>
                      <p className="font-medium">{formData.weight ? `${formData.weight} kg` : '-'}</p>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground">尺寸</p>
                    <p className="font-medium">
                      {formData.length && formData.width && formData.height
                        ? `${formData.length}m × ${formData.width}m × ${formData.height}m`
                        : '-'}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">起运地</p>
                      <p className="font-medium">{formData.origin || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">目的地</p>
                      <p className="font-medium">{formData.destination || '-'}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">计划出发</p>
                      <p className="font-medium">{formData.plannedDeparture || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">计划到达</p>
                      <p className="font-medium">{formData.plannedArrival || '-'}</p>
                    </div>
                  </div>
                  
                  {formData.requirements && (
                    <div>
                      <p className="text-sm text-muted-foreground">特殊要求</p>
                      <p className="font-medium">{formData.requirements}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
          
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrev}
              disabled={currentStep === 1}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              上一步
            </Button>
            
            {currentStep < steps.length ? (
              <Button type="button" onClick={handleNext}>
                下一步
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    提交中...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    确认提交
                  </>
                )}
              </Button>
            )}
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
