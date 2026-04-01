import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const defaultOrigins = [
    'http://localhost:4200',
    'https://basket-data.vercel.app',
    'https://basket-data-front-production.up.railway.app',
    'https://basket-data-ga02xh2zt-cacobos-projects.vercel.app',
    'https://basket-data-ncc0eh9ib-cacobos-projects.vercel.app',
  ];
  const envOrigins = (process.env.FRONTEND_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
  const allowedOrigins = Array.from(new Set([...defaultOrigins, ...envOrigins]));

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
