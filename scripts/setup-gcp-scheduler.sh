#!/bin/bash

# Setup Google Cloud Scheduler for Curriculum Processing Jobs
# This script helps you set up a Cloud Scheduler job to process curriculum uploads

set -e

echo "🚀 Setting up Google Cloud Scheduler for Curriculum Processing"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Error: gcloud CLI is not installed"
    echo "   Install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Get configuration
read -p "Enter your Google Cloud Project ID: " PROJECT_ID
read -p "Enter your application URL (e.g., https://your-domain.com): " APP_URL
read -p "Enter your CRON_SECRET (or press Enter to generate one): " CRON_SECRET

# Generate secret if not provided
if [ -z "$CRON_SECRET" ]; then
    CRON_SECRET=$(openssl rand -hex 32)
    echo "✅ Generated CRON_SECRET: $CRON_SECRET"
    echo "⚠️  IMPORTANT: Save this secret and add it to your environment variables!"
fi

# Get region
read -p "Enter region (default: us-central1): " REGION
REGION=${REGION:-us-central1}

# Get schedule frequency
echo ""
echo "Select schedule frequency:"
echo "1) Every minute (*/1 * * * *)"
echo "2) Every 5 minutes (*/5 * * * *)"
echo "3) Every 10 minutes (*/10 * * * *)"
read -p "Enter choice (1-3, default: 2): " FREQ_CHOICE

case $FREQ_CHOICE in
    1)
        SCHEDULE="*/1 * * * *"
        ;;
    3)
        SCHEDULE="*/10 * * * *"
        ;;
    *)
        SCHEDULE="*/5 * * * *"
        ;;
esac

# Set the project
echo ""
echo "📋 Setting Google Cloud project to $PROJECT_ID..."
gcloud config set project $PROJECT_ID

# Enable required APIs
echo ""
echo "🔧 Enabling required APIs..."
gcloud services enable cloudscheduler.googleapis.com

# Create the scheduler job
JOB_NAME="process-curriculum-jobs"
JOB_URL="${APP_URL}/api/cron/process-curriculum-jobs?cron_secret=${CRON_SECRET}"

echo ""
echo "📤 Creating Cloud Scheduler job..."
echo "   Name: $JOB_NAME"
echo "   URL: $JOB_URL"
echo "   Schedule: $SCHEDULE"
echo "   Region: $REGION"
echo ""

# Check if job already exists
if gcloud scheduler jobs describe $JOB_NAME --location=$REGION --project=$PROJECT_ID &> /dev/null; then
    read -p "Job already exists. Update it? (y/n): " UPDATE
    if [ "$UPDATE" = "y" ]; then
        gcloud scheduler jobs update http $JOB_NAME \
            --location=$REGION \
            --schedule="$SCHEDULE" \
            --uri="$JOB_URL" \
            --http-method=GET \
            --time-zone="America/New_York" \
            --description="Process curriculum upload and analysis jobs"
        echo "✅ Job updated successfully!"
    else
        echo "⏭️  Skipping job creation"
    fi
else
    gcloud scheduler jobs create http $JOB_NAME \
        --location=$REGION \
        --schedule="$SCHEDULE" \
        --uri="$JOB_URL" \
        --http-method=GET \
        --time-zone="America/New_York" \
        --description="Process curriculum upload and analysis jobs"
    echo "✅ Job created successfully!"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Add CRON_SECRET to your environment variables:"
echo "      CRON_SECRET=$CRON_SECRET"
echo ""
echo "   2. Test the job manually:"
echo "      gcloud scheduler jobs run $JOB_NAME --location=$REGION"
echo ""
echo "   3. Monitor job execution:"
echo "      gcloud scheduler jobs describe $JOB_NAME --location=$REGION"
echo ""

