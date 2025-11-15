#!/bin/bash

# Script to fix Google Cloud AI permissions
# This reads from .env.local and runs the necessary commands

# Load environment variables from .env.local
if [ -f .env.local ]; then
    export $(grep -v '^#' .env.local | grep -E 'GOOGLE_PROJECT_ID|GOOGLE_CLIENT_EMAIL' | xargs)
else
    echo "❌ Error: .env.local file not found"
    exit 1
fi

# Check if variables are set
if [ -z "$GOOGLE_PROJECT_ID" ] || [ -z "$GOOGLE_CLIENT_EMAIL" ]; then
    echo "❌ Error: GOOGLE_PROJECT_ID or GOOGLE_CLIENT_EMAIL not found in .env.local"
    echo "Please ensure these variables are set in your .env.local file"
    exit 1
fi

echo "🔧 Fixing AI Permissions for:"
echo "   Project ID: $GOOGLE_PROJECT_ID"
echo "   Service Account: $GOOGLE_CLIENT_EMAIL"
echo ""

# Enable required APIs
echo "📡 Enabling Generative Language API..."
gcloud services enable generativelanguage.googleapis.com --project=$GOOGLE_PROJECT_ID

echo "📡 Enabling Vertex AI API..."
gcloud services enable aiplatform.googleapis.com --project=$GOOGLE_PROJECT_ID

# Grant IAM role
echo "🔐 Granting Vertex AI User role to service account..."
gcloud projects add-iam-policy-binding $GOOGLE_PROJECT_ID \
  --member="serviceAccount:$GOOGLE_CLIENT_EMAIL" \
  --role="roles/aiplatform.user"

echo ""
echo "✅ Done! Please wait 1-2 minutes for changes to propagate."
echo "   Then test your application again."

