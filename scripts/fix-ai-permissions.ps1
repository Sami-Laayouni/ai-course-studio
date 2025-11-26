# PowerShell script to fix Google Cloud AI permissions
# This reads from .env.local and runs the necessary commands

# Load environment variables from .env.local
if (Test-Path .env.local) {
    $envContent = Get-Content .env.local | Where-Object { $_ -match '^GOOGLE_PROJECT_ID|^GOOGLE_CLIENT_EMAIL' }
    
    foreach ($line in $envContent) {
        if ($line -match '^GOOGLE_PROJECT_ID=(.+)') {
            $env:GOOGLE_PROJECT_ID = $matches[1]
        }
        if ($line -match '^GOOGLE_CLIENT_EMAIL=(.+)') {
            $env:GOOGLE_CLIENT_EMAIL = $matches[1]
        }
    }
} else {
    Write-Host "❌ Error: .env.local file not found" -ForegroundColor Red
    exit 1
}

# Check if variables are set
if (-not $env:GOOGLE_PROJECT_ID -or -not $env:GOOGLE_CLIENT_EMAIL) {
    Write-Host "❌ Error: GOOGLE_PROJECT_ID or GOOGLE_CLIENT_EMAIL not found in .env.local" -ForegroundColor Red
    Write-Host "Please ensure these variables are set in your .env.local file"
    exit 1
}

Write-Host "🔧 Fixing AI Permissions for:" -ForegroundColor Cyan
Write-Host "   Project ID: $env:GOOGLE_PROJECT_ID"
Write-Host "   Service Account: $env:GOOGLE_CLIENT_EMAIL"
Write-Host ""

# Enable required APIs
Write-Host "📡 Enabling Generative Language API..." -ForegroundColor Yellow
gcloud services enable generativelanguage.googleapis.com --project=$env:GOOGLE_PROJECT_ID

Write-Host "📡 Enabling Vertex AI API..." -ForegroundColor Yellow
gcloud services enable aiplatform.googleapis.com --project=$env:GOOGLE_PROJECT_ID

# Grant IAM role
Write-Host "🔐 Granting Vertex AI User role to service account..." -ForegroundColor Yellow
gcloud projects add-iam-policy-binding $env:GOOGLE_PROJECT_ID `
  --member="serviceAccount:$env:GOOGLE_CLIENT_EMAIL" `
  --role="roles/aiplatform.user"

Write-Host ""
Write-Host "✅ Done! Please wait 1-2 minutes for changes to propagate." -ForegroundColor Green
Write-Host "   Then test your application again."

