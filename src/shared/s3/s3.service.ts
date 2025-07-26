import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { BadRequestException, Injectable } from "@nestjs/common";
import { MulterFile } from "multer";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class S3Service {
  private readonly bucketName: string = process.env.MINIO_BUCKET_NAME;

  private s3Client = new S3Client({
    region: "us-east-1",
    endpoint: process.env.MINIO_ENDPOINT,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.MINIO_ACCESS_KEY,
      secretAccessKey: process.env.MINIO_SECRET_KEY
    }
  });

  async uploadImage(
    file: MulterFile,
    folder: string = "images"
  ): Promise<string> {
    if (!file.mimetype.startsWith("image/")) {
      throw new BadRequestException("O arquivo deve ser uma imagem");
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException("A imagem deve ter no máximo 5MB");
    }

    const fileExtension = file.originalname.split(".").pop();
    const fileName = `${folder}/${uuidv4()}.${fileExtension}`;

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: "public-read",
        Metadata: {
          originalName: file.originalname,
          uploadedAt: new Date().toISOString()
        }
      });

      await this.s3Client.send(command);

      const imageUrl = `${process.env.MINIO_ENDPOINT}/${this.bucketName}/${fileName}`;

      return imageUrl;
    } catch (error) {
      console.error("Erro ao fazer upload da imagem:", error);
      throw new BadRequestException("Erro ao fazer upload da imagem");
    }
  }
}
