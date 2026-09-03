import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

// Determine root directory to write /uploads
// FIX (2026-09): Vercel kimi serverless muhitlerde fayl sistemi READ-ONLY-dir;
// yalniz /tmp yazila bilir. Bu olmadan hemin muhitde her fayl yuklemesi
// EROFS xetasi ile 500 qaytarirdi.
// DIQQET: /tmp muveqqetidir - Vercel-de yuklenen fayllar bir muddet sonra itir.
// Daimi saxlama ucun STORAGE_PROVIDER=s3 (Supabase Storage) istifade edin.
const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const rootDir = isServerless ? '/tmp' : path.resolve(process.cwd(), '..');
const localUploadDir = path.join(rootDir, 'uploads');

// Ensure local upload dir exists
try {
  await fs.mkdir(localUploadDir, { recursive: true });
} catch (e) {
  // directory already exists or error
}

class LocalStorageProvider {
  async upload(file) {
    // Generate a unique randomized filename
    const ext = path.extname(file.originalname);
    const randomizedName = `${crypto ? crypto.randomUUID() : Math.random().toString(36).substring(2)}${ext}`;
    const destination = path.join(localUploadDir, randomizedName);

    await fs.writeFile(destination, file.buffer);
    return {
      key: randomizedName,
      url: `/api/admin/applications/cv-file/${randomizedName}`
    };
  }

  async uploadMedia(file) {
    const ext = path.extname(file.originalname);
    const randomizedName = `${crypto ? crypto.randomUUID() : Math.random().toString(36).substring(2)}${ext}`;
    const destination = path.join(localUploadDir, randomizedName);

    await fs.writeFile(destination, file.buffer);
    return {
      key: randomizedName,
      url: `/uploads/${randomizedName}`
    };
  }

  async delete(key) {
    if (!key) return;
    try {
      const filePath = path.join(localUploadDir, key);
      await fs.unlink(filePath);
    } catch (err) {
      console.error(`Local file delete error for key ${key}:`, err);
    }
  }

  async getDownloadStream(key) {
    const filePath = path.join(localUploadDir, key);
    // Return a stream/buffer or let fs.createReadStream do it in the router
    return filePath;
  }
}

class S3StorageProvider {
  constructor() {
    this.client = new S3Client({
      region: process.env.STORAGE_REGION || 'auto',
      endpoint: process.env.STORAGE_ENDPOINT,
      credentials: {
        accessKeyId: process.env.STORAGE_ACCESS_KEY || '',
        secretAccessKey: process.env.STORAGE_SECRET_KEY || ''
      }
    });
    this.bucket = process.env.STORAGE_BUCKET || '';
  }

  async upload(file) {
    const ext = path.extname(file.originalname);
    const randomizedName = `${crypto ? crypto.randomUUID() : Math.random().toString(36).substring(2)}${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: randomizedName,
      Body: file.buffer,
      ContentType: file.mimetype,
      Metadata: {
        originalName: encodeURIComponent(file.originalname)
      }
    });

    await this.client.send(command);
    return {
      key: randomizedName,
      url: `/api/admin/applications/cv-file/${randomizedName}`
    };
  }

  async uploadMedia(file) {
    const ext = path.extname(file.originalname);
    const randomizedName = `${crypto ? crypto.randomUUID() : Math.random().toString(36).substring(2)}${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: randomizedName,
      Body: file.buffer,
      ContentType: file.mimetype,
      Metadata: {
        originalName: encodeURIComponent(file.originalname)
      }
    });

    await this.client.send(command);
    const url = process.env.STORAGE_ENDPOINT 
      ? `${process.env.STORAGE_ENDPOINT.replace(/\/$/, '')}/${this.bucket}/${randomizedName}`
      : `https://${this.bucket}.s3.${process.env.STORAGE_REGION || 'us-east-1'}.amazonaws.com/${randomizedName}`;
    return {
      key: randomizedName,
      url
    };
  }

  async delete(key) {
    if (!key) return;
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key
      });
      await this.client.send(command);
    } catch (err) {
      console.error(`S3 file delete error for key ${key}:`, err);
    }
  }

  async getDownloadStream(key) {
    // S3 stream fetch
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key
    });
    const response = await this.client.send(command);
    return response.Body; // Node Readable stream
  }
}

// Factory instantiation
const provider = process.env.STORAGE_PROVIDER === 's3' || process.env.STORAGE_PROVIDER === 'r2'
  ? new S3StorageProvider()
  : new LocalStorageProvider();

export const StorageService = {
  async upload(file) {
    return provider.upload(file);
  },

  async uploadMedia(file) {
    return provider.uploadMedia(file);
  },

  async delete(key) {
    return provider.delete(key);
  },

  async getDownloadStream(key) {
    return provider.getDownloadStream(key);
  }
};
