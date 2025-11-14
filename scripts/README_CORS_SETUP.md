# Configure GCS CORS for File Uploads

This guide helps you configure CORS (Cross-Origin Resource Sharing) on your Google Cloud Storage bucket to allow file uploads from your frontend.

## Quick Setup

### 1. Install Dependencies

```bash
pip install -r scripts/configure_gcs_cors_requirements.txt
```

Or install directly:
```bash
pip install google-cloud-storage
```

### 2. Authenticate with Google Cloud

**Option A: Application Default Credentials (Recommended)**
```bash
gcloud auth application-default login
```

**Option B: Service Account Key**
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/service-account-key.json"
```

### 3. Set Environment Variables (Optional)

```bash
export GOOGLE_CLOUD_BUCKET_NAME="noteswap_ai_course1"
export GOOGLE_PROJECT_ID="ai-course-studio"
```

### 4. Run the Script

```bash
python scripts/configure_gcs_cors.py
```

Or specify bucket name:
```bash
python scripts/configure_gcs_cors.py noteswap_ai_course1
```

Or specify both bucket and project:
```bash
python scripts/configure_gcs_cors.py noteswap_ai_course1 ai-course-studio
```

## What the Script Does

The script configures CORS to allow:
- ✅ `http://localhost:3000` (your development server)
- ✅ `http://localhost:3001` (alternative dev port)
- ✅ `http://127.0.0.1:3000` (localhost IP)
- ✅ `*` (all origins - **remove this in production!**)

HTTP Methods allowed:
- GET, PUT, POST, HEAD, DELETE, OPTIONS

Response Headers:
- Content-Type
- Access-Control-Allow-Origin
- x-goog-resumable
- x-goog-request-id
- x-goog-upload-status
- x-goog-upload-url

## Production Setup

For production, edit `scripts/configure_gcs_cors.py` and:

1. **Remove the wildcard `"*"`** from origins
2. **Add your production domain**:
   ```python
   "origin": [
       "http://localhost:3000",
       "https://your-production-domain.com",
       "https://www.your-production-domain.com",
   ],
   ```

Then run the script again to update CORS.

## Troubleshooting

### Error: "Could not automatically determine credentials"

**Solution**: Run `gcloud auth application-default login`

### Error: "Bucket not found"

**Solution**: 
1. Check the bucket name is correct
2. Make sure you have access to the bucket
3. Verify the project ID is correct

### Error: "Permission denied"

**Solution**: You need one of these IAM roles:
- Storage Admin
- Storage Object Admin
- Or a custom role with `storage.buckets.update` permission

### CORS still not working after configuration

**Solution**:
1. Clear browser cache
2. Check browser console for specific CORS errors
3. Verify the bucket name matches in both the script and your code
4. Make sure you're using the correct origin (check browser's Network tab)

## Verify CORS Configuration

To check if CORS is configured:

```bash
gsutil cors get gs://noteswap_ai_course1
```

Or using Python:
```python
from google.cloud import storage
client = storage.Client()
bucket = client.get_bucket("noteswap_ai_course1")
print(bucket.cors)
```

## Security Note

⚠️ **Important**: The script includes `"*"` (wildcard) to allow all origins. This is convenient for development but should be removed in production for security. Only allow specific trusted domains.

