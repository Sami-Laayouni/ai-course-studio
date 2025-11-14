import { Storage } from '@google-cloud/storage';

// Initialize Google Cloud Storage client using environment variables
let storage: Storage;
let bucket: any;
let bucketName: string;

try {
  if (!process.env.GOOGLE_PROJECT_ID || !process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    console.warn("⚠️ [GCS] Missing Google Cloud credentials. GCS features will not work.");
  } else {
    storage = new Storage({
      projectId: process.env.GOOGLE_PROJECT_ID,
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
    });

    bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME || 'ai-course-documents';
    bucket = storage.bucket(bucketName);
    
    console.log("✅ [GCS] Google Cloud Storage initialized:", {
      projectId: process.env.GOOGLE_PROJECT_ID,
      bucketName: bucketName,
      hasCredentials: !!process.env.GOOGLE_CLIENT_EMAIL,
    });
  }
} catch (error: any) {
  console.error("❌ [GCS] Failed to initialize Google Cloud Storage:", error.message);
  // Create dummy objects to prevent crashes
  storage = {} as Storage;
  bucket = null;
  bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME || 'ai-course-documents';
}

export { storage, bucket, bucketName };

