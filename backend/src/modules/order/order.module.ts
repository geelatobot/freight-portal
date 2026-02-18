import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { OrderLifecycleService } from './order-lifecycle.service';
import { OrderLifecycleController, OrderStateMachineController } from './order-lifecycle.controller';
import { AuthModule } from '../auth/auth.module';
import { CodeGeneratorService } from '../../common/utils/code-generator.service';
import { DateUtilService } from '../../common/utils/date-util.service';

@Module({
  imports: [AuthModule],
  providers: [
    OrderService,
    OrderLifecycleService,
    CodeGeneratorService,
    DateUtilService,
  ],
  controllers: [OrderController, OrderLifecycleController, OrderStateMachineController],
  exports: [OrderService, OrderLifecycleService],
})
export class OrderModule {}
