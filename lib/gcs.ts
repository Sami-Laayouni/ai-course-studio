import { Storage } from '@google-cloud/storage';

// Initialize Google Cloud Storage client using environment variables
let storage: Storage;
let bucket: any;
let bucketName: string;

try {
  // Check for required environment variables
  const projectId = process.env.GOOGLE_PROJECT_ID;
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  
  if (!projectId || !clientEmail || !privateKey) {
    console.warn("⚠️ [GCS] Missing Google Cloud credentials. GCS features will not work.");
    console.warn("   Required: GOOGLE_PROJECT_ID, GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY");
    console.warn("   Check your .env.local file");
  } else {
    // Fix private key format - ensure proper line breaks
    let formattedPrivateKey = privateKey.replace(/\\n/g, '\n');
    
    // Validate private key format
    if (!formattedPrivateKey.includes('BEGIN') || !formattedPrivateKey.includes('END')) {
      console.error("❌ [GCS] Private key format appears invalid");
      console.error("   Expected format: -----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----");
      throw new Error("Invalid private key format");
    }
    
    storage = new Storage({
      projectId: projectId,
      credentials: {
        client_email: clientEmail,
        private_key: formattedPrivateKey,
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

