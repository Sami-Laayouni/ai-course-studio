# Fix Webpack Module Error

## The Error
```
Error: Cannot find module './vendor-chunks/@swc+helpers@0.5.5.js'
```

## Solution

This is a Next.js build cache issue. Follow these steps:

### Step 1: Stop the Dev Server
Press `Ctrl+C` in the terminal where `pnpm dev` is running

### Step 2: Delete .next Folder
```powershell
Remove-Item -Recurse -Force .next
```

Or manually delete the `.next` folder in your project root.

### Step 3: Restart Dev Server
```bash
pnpm dev
```

## Alternative: If That Doesn't Work

1. **Clear all caches:**
   ```powershell
   Remove-Item -Recurse -Force .next
   Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue
   ```

2. **Reinstall dependencies:**
   ```bash
   pnpm install
   ```

3. **Restart dev server:**
   ```bash
   pnpm dev
   ```

## Why This Happens

Next.js caches compiled modules in the `.next` folder. Sometimes the cache gets corrupted or out of sync, especially after:
- Installing new packages
- Updating dependencies
- Changing build configuration

Deleting `.next` forces Next.js to rebuild everything from scratch.

