# What is Google Document AI?

## Overview

**Google Document AI** is a cloud-based service that uses machine learning to extract text, data, and structure from documents like PDFs, forms, invoices, and more. It's part of Google Cloud Platform.

## Why We Use It

For the Curriculum Improvement System, Document AI helps us:
1. **Extract text from PDFs** - Converts PDF pages into readable text
2. **Maintain document structure** - Preserves headings, sections, and formatting
3. **Handle complex layouts** - Works with multi-column documents, tables, etc.
4. **High accuracy** - Better than basic PDF parsers for educational documents

## Setup (Optional)

Document AI is **optional**. We've added a fallback using `pdf-parse` that works without it.

### If You Want to Use Document AI:

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Enable Document AI API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Document AI API"
   - Click "Enable"

3. **Create a Processor**:
   - Go to "Document AI" > "Processors"
   - Click "Create Processor"
   - Choose "Form Parser" or "OCR Processor" (Form Parser is recommended)
   - Select region (e.g., `us`)
   - Click "Create"
   - Copy the Processor ID (looks like: `1234567890abcdef`)

4. **Add to Environment Variables**:
   ```env
   GOOGLE_DOCUMENT_AI_PROCESSOR_ID=your_processor_id_here
   ```

### If You Don't Want to Use Document AI:

**No setup needed!** The system will automatically use `pdf-parse` as a fallback. Just make sure it's installed:

```bash
npm install pdf-parse
```

## Comparison

| Feature | Document AI | pdf-parse (Fallback) |
|---------|------------|---------------------|
| Setup Required | Yes (Google Cloud) | No (npm install) |
| Cost | Pay per page | Free |
| Accuracy | Very High | Good |
| Speed | Fast | Fast |
| Handles Complex Layouts | Yes | Basic |
| Works Offline | No | Yes |

## Current Status

Based on your logs, Document AI is **not configured**, so the system will use the `pdf-parse` fallback. This is perfectly fine and will work for most PDFs!

The background processing job will extract text using `pdf-parse` and then:
1. Extract sections from the text
2. Generate embeddings for each section
3. Store them in the vector database
4. Match activities to sections

## Troubleshooting

### "pdf-parse not available"
Run: `npm install pdf-parse`

### "No text extracted"
- Check if the PDF has text (not just images)
- Try a different PDF
- Check server logs for errors

### Want Better Accuracy?
Set up Document AI following the steps above. It's especially useful for:
- Scanned documents
- Complex layouts
- Multi-column text
- Documents with tables

