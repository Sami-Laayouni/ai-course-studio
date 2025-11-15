# Fix Next.js Build Cache Issues
Write-Host "🔧 Fixing Next.js build cache..." -ForegroundColor Cyan

# Stop any running Next.js processes
Write-Host "`n1. Stopping Node processes..." -ForegroundColor Yellow
Write-Host "   Please stop your dev server manually (Ctrl+C) if it's running" -ForegroundColor Yellow
Start-Sleep -Seconds 1

# Delete .next folder
Write-Host "2. Deleting .next folder..." -ForegroundColor Yellow
if (Test-Path .next) {
    try {
        Remove-Item -Recurse -Force .next -ErrorAction Stop
        Write-Host "   ✅ Deleted .next folder" -ForegroundColor Green
    } catch {
        Write-Host "   ⚠️  Could not delete .next folder (may be locked)" -ForegroundColor Yellow
        Write-Host "   Please close all terminals/editors and run this script again" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "   ℹ️  .next folder doesn't exist" -ForegroundColor Gray
}

# Delete node_modules cache
Write-Host "3. Clearing node_modules cache..." -ForegroundColor Yellow
if (Test-Path "node_modules\.cache") {
    Remove-Item -Recurse -Force "node_modules\.cache" -ErrorAction SilentlyContinue
    Write-Host "   ✅ Cleared cache" -ForegroundColor Green
}

Write-Host ""
Write-Host "Done! Now restart your dev server with: pnpm dev" -ForegroundColor Green

