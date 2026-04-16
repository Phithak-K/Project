import { Injectable, BadRequestException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

@Injectable()
export class UploadService {
  async uploadFileBase64(base64Image: string, pathPrefix: string = 'uploads'): Promise<string> {
    try {
      const bucket = admin.storage().bucket();
      // Extract mime type and base64 string
      const matches = base64Image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        throw new Error('Invalid base64 string');
      }

      const mimeType = matches[1];
      const base64Data = matches[2];
      const extension = mimeType.split('/')[1] || 'png';
      
      const buffer = Buffer.from(base64Data, 'base64');
      const filename = `${pathPrefix}/${crypto.randomUUID()}.${extension}`;
      
      const file = bucket.file(filename);
      await file.save(buffer, {
        metadata: {
          contentType: mimeType,
        },
        public: true,
      });

      // return public URL (Firebase Storage pattern)
      const encodedPath = encodeURIComponent(filename);
      return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media`;
    } catch (error) {
      console.error('Error uploading file to Firebase Storage:', error);
      throw new BadRequestException('อัปโหลดไฟล์ไม่สำเร็จ ทะเบียน Bucket อาจจะยังไม่ได้กำหนด');
    }
  }
}
