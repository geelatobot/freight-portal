import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

@Global()
@Module({
  providers: [
    {
      provide: PrismaClient,
      useFactory: (configService: ConfigService) => {
        return new PrismaClient({
          datasources: {
            db: {
              url: configService.get('DATABASE_URL'),
            },
          },
          log: [
            { emit: 'stdout', level: 'query' },
            { emit: 'stdout', level: 'info' },
            { emit: 'stdout', level: 'warn' },
            { emit: 'stdout', level: 'error' },
          ],
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [PrismaClient],
})
export class PrismaModule {}
