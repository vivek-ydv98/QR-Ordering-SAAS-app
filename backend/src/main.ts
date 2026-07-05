import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ValidationError } from './common/errors/app-error';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS: In dev → allow localhost. In production → read from ALLOWED_ORIGINS env var.
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : ['http://localhost:3000'];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., curl, Postman, mobile apps)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS: Origin '${origin}' not allowed`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID'],
  });

  // Attach global prefix for API version control
  app.setGlobalPrefix('v1');

  app.useGlobalFilters(new GlobalExceptionFilter());

  // Enforce global data validation pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) => {
        const getFirstError = (error: any): { field: string; message: string } => {
          if (error.constraints) {
            const firstKey = Object.keys(error.constraints)[0];
            return {
              field: error.property,
              message: error.constraints[firstKey],
            };
          }
          if (error.children && error.children.length > 0) {
            return getFirstError(error.children[0]);
          }
          return {
            field: error.property,
            message: `${error.property} is invalid`,
          };
        };
        const { field, message } = getFirstError(errors[0]);
        return new ValidationError(message, field);
      },
    })
  );

  const PORT = process.env.PORT || 3001;
  await app.listen(PORT);
  console.log(`[BOOTSTRAP] NestJS Multi-Tenant Engine running on port: ${PORT}`);
}
bootstrap();
// Trigger reload after env change

