import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { CorsOptions } from "@nestjs/common/interfaces/external/cors-options.interface";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true
    })
  );

  const corsOptions: CorsOptions = {
    origin: (origin: string | undefined, callback) => {
      const allowedOrigin = "http://localhost:8080";
      const isDev = process.env.ENVIRONMENT === "dev";

      if (isDev || !origin || origin === allowedOrigin) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    allowedHeaders: ["content-type", "authorization"]
  };

  app.enableCors(corsOptions);

  await app.listen(Number(process.env.PORT) || 3001);
  console.log(`Application is running on: ${await app.getUrl()}`);
}

bootstrap().catch((err) => {
  console.error("Application failed to start", err);
  process.exit(1);
});
