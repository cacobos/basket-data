import { NestFactory } from '@nestjs/core';
import { AppModule } from '../nest-api/src/app.module';
import { VercelRequest, VercelResponse } from '@vercel/node';

let app: any;

async function bootstrap() {
  app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: ['http://localhost:4200', 'https://prueba-scrap.vercel.app'],
    credentials: true,
  });
  await app.init();
  return app.getHttpAdapter().getInstance();
}

export default async (req: VercelRequest, res: VercelResponse) => {
  if (!app) {
    const handler = await bootstrap();
    return handler(req, res);
  }
  return app(req, res);
};
