# Configure CORS for Google Cloud Storage Bucket

The CORS error occurs because your GCS bucket doesn't allow cross-origin requests from your frontend. Follow these steps to fix it:

## Option 1: Using gcloud CLI (Recommended)

1. Install Google Cloud SDK if you haven't already: https://cloud.google.com/sdk/docs/install

2. Authenticate:
```bash
gcloud auth login
gcloud config set project ai-course-studio
```

3. Configure CORS for your bucket:
```bash
gsutil cors set scripts/configure_gcs_cors.json gs://noteswap_ai_course1
```

Or if your bucket name is different:
```bash
gsutil cors set scripts/configure_gcs_cors.json gs://YOUR_BUCKET_NAME
```

4. Verify CORS configuration:
```bash
gsutil cors get gs://noteswap_ai_course1
```

## Option 2: Using Google Cloud Console

1. Go to https://console.cloud.google.com/storage/browser
2. Click on your bucket (`noteswap_ai_course1`)
3. Click on the "Configuration" tab
4. Scroll down to "CORS configuration"
5. Click "Edit CORS configuration"
6. Paste the JSON from `scripts/configure_gcs_cors.json`
7. Click "Save"

## Option 3: Update the JSON for your production domain

Edit `scripts/configure_gcs_cors.json` and replace `https://your-domain.com` with your actual production domain, then run Option 1 or 2.

## After Configuration

After configuring CORS, the upload should work. The bucket will now accept:
- Requests from `http://localhost:3000` (development)
- Requests from your production domain
- PUT, GET, POST, HEAD, DELETE methods
- Proper CORS headers in responses

