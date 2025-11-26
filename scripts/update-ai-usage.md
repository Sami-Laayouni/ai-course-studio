# AI Usage Update Guide

All AI model references should use the centralized configuration from `lib/ai-config.ts`.

## Pattern to Use

### For simple text generation:
```typescript
import { generateText } from "@/lib/ai-helpers";
const text = await generateText("Your prompt");
```

### For streaming:
```typescript
import { generateTextStream } from "@/lib/ai-helpers";
for await (const chunk of generateTextStream("Your prompt")) {
  // handle chunk
}
```

### For direct access:
```typescript
import { ai, getModelName, getDefaultConfig } from "@/lib/ai-config";

const response = await ai.models.generateContent({
  model: getModelName(), // Uses centralized model
  config: getDefaultConfig(),
  contents: "Your prompt",
});
```

### For advanced usage with rate limiting:
```typescript
import { generateContent, createCacheKey } from "@/lib/genai-utils";

const text = await generateContent("Your prompt", {
  cacheKey: createCacheKey("endpoint", id),
  userId: user.id,
  endpoint: "endpoint-name",
});
```

## Files Updated

All API routes now use the centralized configuration. The model can be changed globally by editing `lib/ai-config.ts`.

