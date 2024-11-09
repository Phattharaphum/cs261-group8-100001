import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppService } from './app.service';
import databaseConfig from './config/db.config';
import { ConfigModule } from '@nestjs/config';
import { UsersController } from './users/users.controller';
import { UserService } from './users/users.service';
import { AuthModule } from './auth/auth.module';
import { AdvisorModule } from './advisor/advisor.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
    }),
    AuthModule,
    AdvisorModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'), // Serve static files from the 'public' folder
    }),
  ],
  controllers: [AppController, UsersController],
  providers: [AppService, UserService],
})
export class AppModule {}
