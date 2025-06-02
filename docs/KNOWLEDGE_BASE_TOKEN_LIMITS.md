# Knowledge Base Token Limits - Real Numbers

## Actual Token Limits for Voice AI Systems

### OpenAI Realtime API (What You're Using)
- **Context Window**: 128,000 tokens (GPT-4o model)
- **Recommended Knowledge Base Size**: 10,000-20,000 tokens
- **Why**: Leave room for conversation history and responses

### Token Size Reference
- **1 token ≈ 4 characters** (rough estimate)
- **1,000 tokens ≈ 750 words**
- **10,000 tokens ≈ 7,500 words** (about 15 pages of text)
- **20,000 tokens ≈ 15,000 words** (about 30 pages of text)

### Production Systems Comparison

| Platform | Context Window | Typical Knowledge Base Size |
|----------|---------------|---------------------------|
| OpenAI GPT-4o | 128k tokens | 10-20k tokens |
| VAPI (using GPT-4) | 8k-32k tokens | 2-5k tokens |
| ElevenLabs | Varies by model | 3-8k tokens |
| Claude 3 | 200k tokens | 20-50k tokens |

## Recommended Approach for Your System

### 1. **Immediate Knowledge (10-20k tokens)**
```typescript
// Update the service to allow more tokens
export class KnowledgePromptBuilder {
  // Current implementation supports much larger knowledge bases
  // The 2000 token limit was overly conservative
  
  static async buildEnhancedPrompt(basePrompt: string): Promise<string> {
    const knowledge = await this.getFormattedKnowledge();
    
    // Check token count (rough estimate)
    const estimatedTokens = (basePrompt.length + knowledge.length) / 4;
    
    if (estimatedTokens > 20000) {
      logger.warn('Knowledge base may be too large', { estimatedTokens });
      // Could implement truncation or prioritization here
    }
    
    return `${basePrompt}\n\nCOMPANY KNOWLEDGE BASE:\n${knowledge}`;
  }
}
```

### 2. **What Fits in Different Token Sizes**

**5,000 tokens (Conservative)**
- Basic service descriptions
- Pricing for 10-20 services
- Core policies
- Business hours and location
- 5-10 FAQs

**10,000 tokens (Recommended)**
- Detailed service catalog (50+ services)
- Complete pricing guide
- All company policies
- Multiple locations
- 20-30 FAQs
- Product details
- Staff information

**20,000 tokens (Comprehensive)**
- Everything above plus:
- Detailed procedure guides
- Complete product specifications
- Historical information
- Seasonal promotions
- Training materials
- Case studies

### 3. **How to Structure Large Knowledge Bases**

```json
{
  "categories": {
    "essential": {
      "priority": 10,
      "content": "Always included - services, pricing, hours"
    },
    "important": {
      "priority": 7,
      "content": "Usually included - policies, FAQs"
    },
    "supplementary": {
      "priority": 3,
      "content": "Include if space - detailed specs, history"
    }
  }
}
```

## Practical Examples

### Small Business (5k tokens)
- 20 services with descriptions
- Business hours for 2 locations
- 10 common policies
- 15 FAQs

### Medium Business (10k tokens)
- 50 services with detailed descriptions
- Multiple location details
- Complete policy handbook
- 30+ FAQs
- Seasonal promotions
- Staff bios

### Enterprise (20k tokens)
- 100+ services/products
- Detailed technical specifications
- Multi-language support info
- Complete procedures manual
- Historical data
- Compliance information

## Token Optimization Tips

1. **Remove Redundancy**
   - Don't repeat information across entries
   - Use references instead of duplication

2. **Prioritize by Usage**
   - Most asked questions first
   - Common services prominently
   - Rare info can be brief

3. **Use Concise Language**
   - "Hours: Tue-Sat 9AM-7PM" vs "We are open Tuesday through Saturday from 9:00 AM to 7:00 PM"

4. **Structure for Scanning**
   - Use bullet points
   - Clear categories
   - Consistent formatting

## Monitoring Token Usage

```typescript
// Add token counting to your service
import { encode } from 'gpt-3-encoder';

function countTokens(text: string): number {
  return encode(text).length;
}

// Log token usage
const tokens = countTokens(enhancedPrompt);
logger.info('Prompt token count', { tokens });
```

## Conclusion

- **Don't limit to 2000 tokens** - that's unnecessarily restrictive
- **10,000-20,000 tokens** is perfectly reasonable for OpenAI Realtime API
- **Monitor actual usage** to optimize
- **Structure by priority** to ensure essential info is always included

Your system can easily handle a comprehensive knowledge base with hundreds of entries!