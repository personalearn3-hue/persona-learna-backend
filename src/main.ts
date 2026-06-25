import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Config } from './config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = new DocumentBuilder()
    .setTitle('PersonaLearna')
    .setDescription('The PersonaLearna API description')
    .setVersion('1.0')
    // .addTag('cats')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api', app, documentFactory);

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      // whitelist: true,
      // forbidNonWhitelisted: true,
    }),
  );

  const configService = app.get(ConfigService<Config, true>);
  const cors = configService.get('cors', { infer: true });
   app.enableCors({ origin: cors.origin });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
