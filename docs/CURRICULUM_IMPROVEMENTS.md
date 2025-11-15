# Curriculum Improvement System - Complete Fix & Enhancements

## Overview

This document describes the comprehensive fixes and improvements made to the Curriculum Improvement System, including PDF upload to Supabase pgvector, activity-curriculum matching, student analytics visualization, and Google Cloud cron job integration.

## Key Improvements

### 1. Fixed Embedding Storage (Decoder Error Fix)

**Problem**: The error `1E08010C:DECODER routines::unsupported` was occurring when storing embeddings in pgvector.

**Solution**:
- Created SQL helper functions (`upsert_curriculum_section_embedding` and `upsert_activity_embedding`) that properly cast string embeddings to vector type
- Added proper number validation and formatting before storing embeddings
- Implemented fallback mechanism if RPC functions don't exist

**Files Modified**:
- `scripts/013_pgvector_curriculum_embeddings.sql` - Added helper functions
- `app/api/curriculum/generate-embeddings/route.ts` - Fixed embedding storage
- `app/api/activities/generate-embedding/route.ts` - Fixed embedding storage

### 2. Enhanced Activity-Curriculum Matching

**Improvements**:
- Lowered similarity threshold from 0.7 to 0.65 for better matching
- Automatic embedding generation for activities that don't have embeddings
- Automatic mapping refresh to catch new activities
- Better error handling and logging

**Files Modified**:
- `app/api/courses/[id]/curriculum/analytics/route.ts` - Enhanced matching logic

### 3. Three-Tier Color Coding System

**Implementation**:
- **Green** (≥70%): Students understand the concept well
- **Yellow** (50-69%): Medium understanding
- **Red** (<50%): Students are struggling

**Visual Indicators**:
- Section borders colored based on average score
- Background colors for sections
- Icons (CheckCircle for green, AlertCircle for yellow/red)
- Performance legend in PDF viewer

**Files Modified**:
- `app/dashboard/courses/[id]/curriculum/page.tsx` - Enhanced color coding

### 4. Google Cloud Scheduler Integration

**Setup**:
- Created setup script: `scripts/setup-gcp-scheduler.sh`
- Cron endpoint: `/api/cron/process-curriculum-jobs`
- Supports both GET and POST methods
- Secure authentication with CRON_SECRET

**Configuration**:
- Recommended schedule: Every 5 minutes (`*/5 * * * *`)
- Processes up to 10 jobs per run
- Automatic retry on failure

**Files**:
- `app/api/cron/process-curriculum-jobs/route.ts` - Cron endpoint
- `scripts/setup-gcp-scheduler.sh` - Setup script
- `scripts/017_setup_gcp_cloud_scheduler.md` - Documentation

## System Architecture

### PDF Upload Flow

1. **Frontend** requests signed URL from `/api/curriculum/get-upload-url`
2. **Frontend** uploads PDF directly to Google Cloud Storage
3. **Frontend** notifies backend via `/api/courses/[id]/curriculum/upload`
4. **Backend** extracts text using Google Document AI
5. **Backend** creates processing job in database
6. **Cron Job** processes the job asynchronously:
   - Extracts sections from text
   - Generates embeddings for sections
   - Maps activities to sections using vector similarity
   - Calculates student analytics

### Vector Similarity Matching

1. Curriculum sections are embedded using Gemini embedding-001 (768 dimensions)
2. Activities are embedded with the same model
3. Vector similarity search finds matching sections for each activity
4. Mappings are stored in `activity_curriculum_mappings` table
5. Analytics are calculated based on student performance on mapped activities

### Analytics Calculation

For each curriculum section:
1. Find all activities mapped to the section
2. Get student progress data for those activities
3. Calculate:
   - Total students
   - Students attempted
   - Students completed
   - Average score
   - Average time spent
   - Concept mastery percentages
4. Use AI to identify:
   - Common misconceptions
   - Strong concepts (≥70%)
   - Weak concepts (<50%)
   - Improvement suggestions

## Database Schema

### Key Tables

- `curriculum_documents` - Stores uploaded PDFs and metadata
- `curriculum_section_embeddings` - Vector embeddings for sections
- `activity_embeddings` - Vector embeddings for activities
- `activity_curriculum_mappings` - Maps activities to curriculum sections
- `curriculum_analytics` - Stores calculated analytics per section
- `curriculum_processing_jobs` - Job queue for background processing

### Key Functions

- `upsert_curriculum_section_embedding` - Stores section embeddings with proper vector casting
- `upsert_activity_embedding` - Stores activity embeddings with proper vector casting
- `update_activity_curriculum_mappings` - Finds and creates activity-section mappings
- `find_similar_curriculum_sections` - Finds similar sections for an activity

## Setup Instructions

### 1. Database Setup

Run the SQL migration scripts in order:
```bash
# In Supabase SQL Editor
1. scripts/012_curriculum_system.sql
2. scripts/013_pgvector_curriculum_embeddings.sql
```

### 2. Environment Variables

Ensure these are set in your `.env.local`:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Google Cloud
GOOGLE_PROJECT_ID=your_project_id
GOOGLE_CLIENT_EMAIL=your_service_account_email
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_CLOUD_BUCKET_NAME=your_bucket_name
GOOGLE_DOCUMENT_AI_PROCESSOR_ID=your_processor_id

# Application
NEXT_PUBLIC_APP_URL=https://your-domain.com
CRON_SECRET=your_secret_token
```

### 3. Google Cloud Scheduler Setup

**Option A: Using Setup Script**
```bash
chmod +x scripts/setup-gcp-scheduler.sh
./scripts/setup-gcp-scheduler.sh
```

**Option B: Manual Setup**
1. Go to [Google Cloud Console](https://console.cloud.google.com/cloudscheduler)
2. Create a new job with:
   - Name: `process-curriculum-jobs`
   - Schedule: `*/5 * * * *` (every 5 minutes)
   - URL: `https://your-domain.com/api/cron/process-curriculum-jobs?cron_secret=YOUR_SECRET`
   - Method: GET

### 4. Test the System

1. Upload a PDF curriculum document
2. Wait for processing (check status in UI)
3. View analytics for each section
4. Verify color coding (green/yellow/red)

## Troubleshooting

### Decoder Error

If you see `1E08010C:DECODER routines::unsupported`:
1. Ensure SQL functions are created (run `scripts/013_pgvector_curriculum_embeddings.sql`)
2. Check that embeddings are properly formatted as `[1,2,3,...]` strings
3. Verify pgvector extension is enabled: `CREATE EXTENSION IF NOT EXISTS vector;`

### Embeddings Not Generating

1. Check Google AI credentials are correct
2. Verify `GOOGLE_PROJECT_ID` and `GOOGLE_CLIENT_EMAIL` are set
3. Check API quotas and limits
4. Review server logs for errors

### Activities Not Matching

1. Ensure both curriculum sections and activities have embeddings
2. Check similarity threshold (default: 0.65)
3. Verify `activity_curriculum_mappings` table has data
4. Review analytics endpoint logs

### Cron Job Not Running

1. Verify `CRON_SECRET` is set in environment
2. Check Cloud Scheduler job is enabled
3. Review Cloud Scheduler execution logs
4. Test endpoint manually: `curl "https://your-domain.com/api/cron/process-curriculum-jobs?cron_secret=YOUR_SECRET"`

## Performance Considerations

- Embedding generation: ~200ms per section/activity
- Vector similarity search: Very fast with ivfflat index
- Analytics calculation: Depends on number of students and activities
- Recommended: Process jobs every 5 minutes to balance responsiveness and resource usage

## Future Enhancements

- Real-time progress updates via WebSockets
- Batch embedding generation for better performance
- Caching of analytics results
- Export analytics to CSV/PDF
- Integration with learning management systems

