# Curriculum Improvement System

## Overview

The Curriculum Improvement System allows teachers to upload curriculum documents and automatically analyze student performance against curriculum sections. The system uses background job processing to handle heavy computational tasks without blocking the UI.

## Architecture

### Background Job Processing

The system uses a **job queue** pattern with Supabase database triggers:

1. **Job Creation**: When a curriculum document is uploaded, a database trigger automatically creates a processing job
2. **Background Workers**: Jobs are processed by calling `/api/curriculum/process-jobs`
3. **Status Tracking**: Real-time status updates via polling (every 2 seconds)
4. **Progress Tracking**: Progress percentage (0-100%) tracked throughout processing

### Database Schema

- `curriculum_documents` - Stores uploaded documents with processing status
- `curriculum_processing_jobs` - Job queue for background processing
- `activity_curriculum_mappings` - Maps activities to curriculum sections
- `curriculum_analytics` - Stores calculated analytics per section

### Processing Pipeline

1. **Upload** (10%) - File uploaded to Google Cloud Storage
2. **Extract** (20-40%) - Extract text from PDF using Google Document AI
3. **Analyze** (40-80%) - AI extracts sections and structure
4. **Map** (80-90%) - Auto-map activities to sections using AI
5. **Calculate** (90-100%) - Calculate performance analytics
6. **Complete** - Analytics ready for viewing

## Setup

### 1. Run Database Migration

```sql
-- Run scripts/012_curriculum_system.sql in Supabase SQL Editor
```

### 2. Set Up Background Worker

You have two options:

#### Option A: Cron Job (Recommended for Production)

Set up a cron job to call the processing endpoint every minute:

```bash
# Add to your crontab or use a service like cron-job.org
*/1 * * * * curl -X POST https://your-domain.com/api/curriculum/process-jobs \
  -H "Content-Type: application/json" \
  -d '{"max_jobs": 10}'
```

Or use the cron endpoint with authentication:

```bash
*/1 * * * * curl -X GET https://your-domain.com/api/cron/process-curriculum-jobs \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

#### Option B: Manual Trigger (Development)

You can manually trigger processing by calling:

```bash
POST /api/curriculum/process-jobs
Body: { "max_jobs": 5 }
```

### 3. Environment Variables

Ensure these are set in `.env.local`:

```env
GOOGLE_PROJECT_ID=your-project-id
GOOGLE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY=your-private-key
GOOGLE_CLOUD_BUCKET_NAME=ai-course-documents
GOOGLE_DOCUMENT_AI_PROCESSOR_ID=your-processor-id
CRON_SECRET=your-secret-token (optional, for cron endpoint)
```

## Features

### Visual Highlighting

- **Green Border/Indicator**: Sections where students score ≥70% (students understand well)
- **Red Border/Indicator**: Sections where students score <50% (students struggle)
- **Performance Legend**: Shows color coding in document viewer

### Real-Time Status Updates

- Status badges show current processing stage
- Progress bar shows completion percentage
- Automatic polling updates status every 2 seconds
- Analytics panel shows "Processing..." message during analysis

### Smart Analytics

- **Auto-Mapping**: AI automatically maps activities to curriculum sections
- **Performance Insights**: Identifies strong and weak concepts
- **Common Misconceptions**: AI-generated list of student misconceptions
- **Suggestions**: Actionable recommendations for curriculum improvement

## Usage

1. **Upload Curriculum**: Click "Improve Curriculum" on course page
2. **Upload Document**: Select PDF, Word, or PowerPoint file
3. **Wait for Processing**: System processes in background (2-5 minutes)
4. **View Analytics**: Select sections to see performance insights
5. **Review Insights**: See which concepts students understand vs struggle with

## API Endpoints

- `POST /api/courses/[id]/curriculum/upload` - Upload curriculum document
- `POST /api/curriculum/process-jobs` - Process pending jobs (background worker)
- `GET /api/curriculum/process-jobs?curriculum_id=...` - Get processing status
- `POST /api/courses/[id]/curriculum/analytics` - Calculate analytics (called by worker)
- `GET /api/cron/process-curriculum-jobs` - Cron endpoint for scheduled processing

## Performance Considerations

- **Scalable**: Job queue handles multiple concurrent uploads
- **Efficient**: Only processes when needed, results cached
- **Smart**: AI-powered analysis reduces manual mapping
- **Non-blocking**: Teachers can continue working while processing happens

## Troubleshooting

### Jobs Not Processing

1. Check that background worker is running (cron job or manual trigger)
2. Verify job status in `curriculum_processing_jobs` table
3. Check for errors in `processing_error` field

### Analytics Not Appearing

1. Ensure processing status is "completed"
2. Check that activities exist for the course
3. Verify student progress data exists

### Upload Fails

1. Check Google Cloud Storage credentials
2. Verify bucket exists and is accessible
3. Check file size limits

