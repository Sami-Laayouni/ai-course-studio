# Google Cloud Storage Setup Guide

## Overview

The system uses Google Cloud Storage with **signed URLs** for secure, per-user file uploads. Files are organized in user-specific folders, and users can only access their own files.

## Architecture

### File Organization
```
bucket-name/
  userId/
    curriculum/
      courseId/
        timestamp_filename.pdf
```

### Upload Flow
1. **Frontend** requests signed URL from `/api/curriculum/get-upload-url`
2. **Frontend** uploads file directly to GCS using signed URL (client-side)
3. **Frontend** notifies backend via `/api/courses/[id]/curriculum/upload` to process the file
4. **Backend** extracts text, analyzes, and saves to database

### Access Control
- Users can only see files in their own folder (`userId/`)
- Signed URLs expire after 1 hour (read) or 15 minutes (write)
- Backend service account handles all GCS operations

## Setup Instructions

### 1. Create Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **IAM & Admin** > **Service Accounts**
3. Click **Create Service Account**
4. Name it (e.g., `course-studio-storage`)
5. Click **Create and Continue**

### 2. Grant IAM Roles

Grant these roles to your service account:
- **Storage Object Creator** - For creating/uploading files
- **Storage Object Viewer** - For reading/downloading files

**Steps:**
1. Click on your service account
2. Go to **Permissions** tab
3. Click **Grant Access**
4. Add roles:
   - `Storage Object Creator`
   - `Storage Object Viewer`
5. Click **Save**

### 3. Get Service Account Credentials

1. In the service account page, go to **Keys** tab
2. Click **Add Key** > **Create new key**
3. Select **JSON**
4. Download the key file
5. Open the JSON file and extract:
   - `project_id` → Use as `GOOGLE_PROJECT_ID`
   - `client_email` → Use as `GOOGLE_CLIENT_EMAIL`
   - `private_key` → Use as `GOOGLE_PRIVATE_KEY` (keep the full key including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`)

### 4. Create Storage Bucket

1. Go to **Cloud Storage** > **Buckets**
2. Click **Create Bucket**
3. Name it (e.g., `ai-course-documents`)
4. Choose location and storage class
5. Click **Create**

### 5. Configure Environment Variables

Add to your `.env.local`:

```env
GOOGLE_PROJECT_ID=ai-course-studio
GOOGLE_CLIENT_EMAIL=noteswap-backend@ai-course-studio.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQI...rest-of-key...\n-----END PRIVATE KEY-----\n"
GOOGLE_CLOUD_BUCKET_NAME=ai-course-documents
```

**Important Notes:**
- The `GOOGLE_PRIVATE_KEY` should include the full private key with `\n` characters for newlines
- Keep the quotes around the private key value
- Never commit these values to version control

### 6. Install Dependencies

```bash
npm install @google-cloud/storage
```

## API Endpoints

### Get Upload URL
```typescript
POST /api/curriculum/get-upload-url
Body: { filename: string, courseId: string }
Response: { url: string, filePath: string }
```

### List User Files
```typescript
GET /api/curriculum/list-files?courseId=xxx
Response: { files: Array<{ name, path, url, size, contentType, created }> }
```

### Process Uploaded File
```typescript
POST /api/courses/[id]/curriculum/upload
Body: { filePath: string, title: string, fileSize: number, contentType: string }
Response: { curriculum: CurriculumDocument }
```

## Security Features

✅ **Per-user isolation**: Files stored in `userId/` folders  
✅ **Signed URLs**: Time-limited access (15 min write, 1 hour read)  
✅ **Backend validation**: Server verifies user owns the course  
✅ **No public access**: Files not publicly accessible  
✅ **IAM-based**: Service account handles all operations  

## File Access Pattern

1. **Upload**: Client gets signed URL → uploads directly to GCS
2. **Read**: Backend generates signed URL on-demand
3. **List**: Backend lists files in user's folder only
4. **Delete**: Backend deletes from user's folder only

## Troubleshooting

### "Permission denied" errors
- Verify service account has **Storage Object Creator** and **Storage Object Viewer** roles
- Check that bucket name matches `GOOGLE_CLOUD_BUCKET_NAME`

### "File not found" errors
- Verify file path format: `userId/curriculum/courseId/timestamp_filename.ext`
- Check that file was uploaded successfully

### Signed URL expires
- Signed URLs expire after their time limit
- Backend regenerates URLs when needed
- Frontend should request new URLs if expired

## Best Practices

1. **Never expose service account key** in client-side code
2. **Always validate** user permissions before generating signed URLs
3. **Use signed URLs** instead of public URLs for security
4. **Store file paths** in database for easy reference
5. **Clean up old files** periodically to save storage costs

