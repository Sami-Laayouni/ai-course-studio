# Setup Google Cloud Scheduler for Curriculum Processing

This guide shows you how to set up Google Cloud Scheduler to automatically process curriculum jobs in the background.

## Option 1: Google Cloud Scheduler (Recommended for Production)

### Step 1: Create a Cloud Scheduler Job

1. Go to [Google Cloud Console](https://console.cloud.google.com/cloudscheduler)
2. Click "Create Job"
3. Configure:
   - **Name**: `process-curriculum-jobs`
   - **Region**: Choose closest to your app
   - **Frequency**: `*/5 * * * *` (every 5 minutes) or `*/1 * * * *` (every minute)
   - **Timezone**: Your timezone
   - **Target Type**: HTTP
   - **URL**: `https://your-domain.com/api/cron/process-curriculum-jobs?cron_secret=YOUR_CRON_SECRET`
   - **HTTP Method**: GET
   - **Headers**: (optional) `Authorization: Bearer YOUR_CRON_SECRET`

### Step 2: Set Environment Variable

Make sure `CRON_SECRET` is set in your production environment:
```bash
CRON_SECRET=your-super-secret-random-string-here
```

### Step 3: Test the Job

1. Click "Run Now" in Cloud Scheduler
2. Check your application logs to verify it's working
3. Monitor the job execution in Cloud Scheduler dashboard

## Option 2: Vercel Cron Jobs (If using Vercel)

1. Update `vercel.json` with your actual `CRON_SECRET`
2. Deploy to Vercel
3. Vercel will automatically run the cron job

## Option 3: Manual Trigger (For Testing)

You can manually trigger processing by calling:
```bash
curl -X POST "https://your-domain.com/api/curriculum/process-jobs" \
  -H "Content-Type: application/json" \
  -d '{"max_jobs": 5}'
```

## Monitoring

- Check Cloud Scheduler logs for execution history
- Monitor your application logs for processing results
- Check Supabase for job status in `curriculum_processing_jobs` table

