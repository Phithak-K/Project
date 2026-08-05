import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

export async function uploadBase64ToStorage(
  base64Data: string,
  pathPrefix: string = 'uploads',
): Promise<string> {
  // หากมันเป็น URL อยู่แล้ว (เช่น http://) ก็ไม่ต้องทำอะไร ส่งกลับได้เลย
  if (base64Data.startsWith('http://') || base64Data.startsWith('https://')) {
    return base64Data;
  }

  try {
    if (admin.apps.length === 0 || !process.env.FIREBASE_STORAGE_BUCKET) {
      // Local/demo mode: keep the data URL in the database so proof of delivery
      // still works without exposing Firebase configuration errors to users.
      return base64Data;
    }

    const bucket = admin
      .storage()
      .bucket(process.env.FIREBASE_STORAGE_BUCKET || undefined);

    // Extract mime type and base64 string
    const matches = base64Data.match(
      /^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/,
    );
    if (!matches || matches.length !== 3) {
      throw new Error(
        'Invalid base64 string format. Must be data:MIME;base64,...',
      );
    }

    const mimeType = matches[1];
    const base64Content = matches[2];
    const extension = mimeType.split('/')[1] || 'png';

    const buffer = Buffer.from(base64Content, 'base64');
    const filename = `${pathPrefix}/${crypto.randomUUID()}.${extension}`;

    const file = bucket.file(filename);
    await file.save(buffer, {
      metadata: {
        contentType: mimeType,
      },
      public: true, // ทำให้ใครก็ดูรูปได้
    });

    const encodedPath = encodeURIComponent(filename);
    return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media`;
  } catch (error: any) {
    console.error('Error uploading to Firebase Storage:', error);
    // กรณีที่ไม่ได้เซ็ต Storage Bucket ไว้ใน Env เราจะ return null หรือ throw ก็ได้
    // แต่เพื่อไม่ให้ระบบพังชั่วคราวเวลาพัฒนา จะ throw ทิ้ง
    throw new Error('ไม่สามารถบันทึกรูปหลักฐานได้ กรุณาลองใหม่อีกครั้ง');
  }
}
