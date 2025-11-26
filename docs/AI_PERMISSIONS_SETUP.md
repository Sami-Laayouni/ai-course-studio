# Google Cloud AI Permissions Setup Guide

## Error: "Request had insufficient authentication scopes"

If you're getting this error:
```
ApiError: Request had insufficient authentication scopes.
reason: ACCESS_TOKEN_SCOPE_INSUFFICIENT
service: generativelanguage.googleapis.com
```

This means your service account doesn't have the necessary permissions to access the Generative Language API (Gemini).

## Solution: Enable APIs and Grant Permissions

### Step 1: Enable Required APIs

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (the one specified in `GOOGLE_PROJECT_ID`)
3. Navigate to **APIs & Services** > **Library**
4. Search for and enable these APIs:
   - **Generative Language API** (`generativelanguage.googleapis.com`)
   - **Vertex AI API** (`aiplatform.googleapis.com`) - Recommended for better access

### Step 2: Grant IAM Roles to Service Account

1. Go to **IAM & Admin** > **IAM** in Google Cloud Console
2. Find your service account (the email in `GOOGLE_CLIENT_EMAIL`)
3. Click the **Edit** (pencil) icon next to the service account
4. Click **ADD ANOTHER ROLE**
5. Add one of these roles (choose based on your needs):

   **Option A: Vertex AI User (Recommended)**
   - Role: `Vertex AI User` (`roles/aiplatform.user`)
   - This provides access to Vertex AI services including Gemini models
   - Best for production use

   **Option B: Generative Language API User**
   - Role: `Generative Language API User` 
   - This provides direct access to the Generative Language API
   - Good for testing

   **Option C: Service Account Token Creator (if using Vertex AI)**
   - Role: `Service Account Token Creator` (`roles/iam.serviceAccountTokenCreator`)
   - Needed if you're using Vertex AI with service account impersonation

6. Click **SAVE**

### Step 3: Verify Service Account Permissions

After granting permissions, wait 1-2 minutes for changes to propagate, then test your application again.

### Step 4: Check API Quotas (Optional)

1. Go to **APIs & Services** > **Quotas**
2. Search for "Generative Language API" or "Vertex AI"
3. Ensure you have sufficient quota for your usage

## Quick Fix via gcloud CLI

If you have `gcloud` CLI installed, you can run:

```bash
# Set your project
gcloud config set project YOUR_PROJECT_ID

# Enable the APIs
gcloud services enable generativelanguage.googleapis.com
gcloud services enable aiplatform.googleapis.com

# Grant Vertex AI User role to service account
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:YOUR_SERVICE_ACCOUNT_EMAIL" \
  --role="roles/aiplatform.user"
```

Replace:
- `YOUR_PROJECT_ID` with your `GOOGLE_PROJECT_ID`
- `YOUR_SERVICE_ACCOUNT_EMAIL` with your `GOOGLE_CLIENT_EMAIL`

## Common Issues

### Issue: Still getting 403 after granting permissions
- **Solution**: Wait 2-5 minutes for IAM changes to propagate globally
- **Solution**: Verify the service account email matches exactly in your `.env.local`
- **Solution**: Check that you're using the correct project ID

### Issue: API not enabled
- **Solution**: Make sure both `generativelanguage.googleapis.com` and `aiplatform.googleapis.com` are enabled
- **Solution**: Check the API status in **APIs & Services** > **Enabled APIs**

### Issue: Billing not enabled
- **Solution**: Ensure billing is enabled for your Google Cloud project
- **Solution**: Some APIs require billing even for free tier usage

## Required Environment Variables

Make sure these are set in your `.env.local`:

```env
GOOGLE_PROJECT_ID=your-project-id
GOOGLE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_CLOUD_LOCATION=us-central1  # Optional, defaults to us-central1
```

## Testing

After completing the setup, test by making a request to your AI endpoint. The error should be resolved.

## Additional Resources

- [Vertex AI IAM Roles](https://cloud.google.com/vertex-ai/docs/general/access-control)
- [Generative Language API Documentation](https://cloud.google.com/vertex-ai/docs/generative-ai/learn/overview)
- [Service Account Best Practices](https://cloud.google.com/iam/docs/best-practices-service-accounts)

