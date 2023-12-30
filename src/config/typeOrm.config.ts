import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';
import { ConfigService, ConfigModule } from '@nestjs/config/dist';

export const typeOrmConfig: TypeOrmModuleAsyncOptions = {
  imports: [ConfigModule],
  useFactory: (configService: ConfigService) => ({
    type: 'mysql',
    host: configService.get('DB_HOST') || 'localhost',
    port: +configService.get('DB_PORT') || 3306,
    username: configService.get('DB_USERNAME') || 'root',
    password: configService.get('DB_PASSWORD') || '',
    database: configService.get('DB_DATABASE_NAME') || 'erp',
    entities: [__dirname + './../**/entities/*.entity{.ts,.js}'],
    subscribers: [__dirname + './../**/*.subscriber{.ts,.js}'],
    synchronize: true,
  }),
  inject: [ConfigService],
};
