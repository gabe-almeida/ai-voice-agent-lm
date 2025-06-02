# Knowledge Base Integration for AI Voice Agent

## Overview

Adding a knowledge base to your AI agent significantly improves its ability to handle calls by providing domain-specific information, company policies, product details, and more. This guide covers multiple approaches to implement knowledge base functionality.

## Implementation Approaches

### 1. **Direct System Prompt Enhancement (Immediate Solution)**

The simplest approach is to enhance Emma's system prompt with specific knowledge:

```typescript
// src/config/emma-prompt.ts
export const EMMA_SYSTEM_PROMPT = `
${CURRENT_PROMPT}

COMPANY KNOWLEDGE BASE:
- Service Details: [Your specific services, prices, policies]
- FAQ Responses: [Common questions and answers]
- Business Hours: [Your operating hours]
- Location Information: [Addresses, directions]
`;
```

**Pros:** Immediate implementation, no additional tools needed
**Cons:** Limited by token limits, requires code changes for updates

### 2. **PDF/Document Upload with Vector Search (Recommended)**

Implement a RAG (Retrieval-Augmented Generation) system:

```typescript
// src/services/knowledge-base.service.ts
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { Pinecone } from '@pinecone-database/pinecone';

export class KnowledgeBaseService {
  private pinecone: Pinecone;
  private embeddings: OpenAIEmbeddings;

  async uploadPDF(filePath: string) {
    // 1. Load PDF
    const loader = new PDFLoader(filePath);
    const docs = await loader.load();
    
    // 2. Split into chunks
    const chunks = this.splitIntoChunks(docs);
    
    // 3. Generate embeddings
    const vectors = await this.embeddings.embedDocuments(chunks);
    
    // 4. Store in vector database
    await this.pinecone.upsert(vectors);
  }

  async searchKnowledge(query: string): Promise<string> {
    // 1. Embed the query
    const queryVector = await this.embeddings.embedQuery(query);
    
    // 2. Search vector database
    const results = await this.pinecone.query({
      vector: queryVector,
      topK: 5
    });
    
    // 3. Return relevant context
    return results.matches.map(m => m.metadata.text).join('\n');
  }
}
```

### 3. **Tool-Based Knowledge Retrieval**

Add a new tool for Emma to search the knowledge base:

```typescript
// Add to src/websocket/openai-realtime.ws.ts
const searchKnowledgeTool: ToolDefinition = {
  type: 'function',
  function: {
    name: 'search_knowledge_base',
    description: 'Search company knowledge base for information about services, policies, or procedures',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query to find relevant information'
        }
      },
      required: ['query']
    }
  }
};

// In tool handler
if (name === 'search_knowledge_base') {
  const knowledge = await knowledgeBaseService.searchKnowledge(args.query);
  realtimeService.sendToolResults(toolCall.id, { 
    results: knowledge,
    source: 'company_knowledge_base' 
  });
}
```

### 4. **Structured Knowledge Base with Categories**

Create a more organized approach:

```typescript
// src/types/knowledge-base.types.ts
interface KnowledgeCategory {
  id: string;
  name: string;
  priority: number;
  documents: KnowledgeDocument[];
}

interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  lastUpdated: Date;
}

// src/services/structured-knowledge.service.ts
export class StructuredKnowledgeService {
  private categories: Map<string, KnowledgeCategory> = new Map();

  async addDocument(doc: KnowledgeDocument) {
    // Add to appropriate category
    const category = this.categories.get(doc.category);
    if (category) {
      category.documents.push(doc);
    }
  }

  async searchByIntent(intent: string): Promise<KnowledgeDocument[]> {
    // Smart search based on conversation intent
    // Prioritize by category relevance
  }
}
```

## Implementation Steps

### Step 1: Choose Your Approach

1. **For Quick Start**: Use Direct System Prompt Enhancement
2. **For Scalability**: Implement Vector Search with Pinecone/Weaviate
3. **For Real-time Updates**: Use Tool-Based Retrieval

### Step 2: Set Up Dependencies

```bash
npm install @pinecone-database/pinecone langchain pdf-parse
```

### Step 3: Create Upload Endpoint

```typescript
// src/routes/knowledge.routes.ts
import multer from 'multer';

const upload = multer({ dest: 'uploads/' });

router.post('/knowledge/upload', upload.single('pdf'), async (req, res) => {
  try {
    await knowledgeBaseService.uploadPDF(req.file.path);
    res.json({ success: true, message: 'Knowledge base updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Step 4: Integrate with Emma

Update Emma's prompt to use knowledge base:

```typescript
export const EMMA_SYSTEM_PROMPT = `
...existing prompt...

When answering questions:
1. First check if you need to search the knowledge base using search_knowledge_base tool
2. Use the retrieved information to provide accurate, company-specific answers
3. If information is not in knowledge base, use general knowledge but indicate this
`;
```

## Best Practices

### 1. **Chunk Size Optimization**
- Keep chunks between 200-500 tokens
- Overlap chunks by 10-20% for context continuity

### 2. **Metadata Enhancement**
```typescript
interface ChunkMetadata {
  source: string;      // PDF filename
  page: number;        // Page number
  section: string;     // Section heading
  lastUpdated: Date;   // For versioning
  confidence: number;  // Relevance score
}
```

### 3. **Caching Strategy**
```typescript
class KnowledgeCache {
  private cache = new Map<string, CachedResult>();
  
  async get(query: string): Promise<string | null> {
    const cached = this.cache.get(query);
    if (cached && !this.isExpired(cached)) {
      return cached.result;
    }
    return null;
  }
}
```

### 4. **Real-time Updates**
```typescript
// WebSocket endpoint for knowledge updates
ws.on('knowledge.update', async (data) => {
  await knowledgeBaseService.updateDocument(data.id, data.content);
  // Notify all active agents
  broadcastKnowledgeUpdate(data);
});
```

## Example Integration

### Complete Knowledge-Enhanced Agent

```typescript
// src/services/enhanced-emma.service.ts
export class EnhancedEmmaService {
  private knowledgeBase: KnowledgeBaseService;
  private realtimeService: OpenAIRealtimeService;

  async handleConversation(ws: WebSocket) {
    // Configure with knowledge tools
    this.realtimeService = new OpenAIRealtimeService({
      tools: [
        getAppointmentAvailabilityTool,
        createAppointmentEventTool,
        searchKnowledgeTool // New!
      ]
    });

    // Enhanced system prompt
    await this.realtimeService.updateSession({
      instructions: `${EMMA_SYSTEM_PROMPT}
      
      You have access to a comprehensive knowledge base. Always search it when:
      - Asked about company policies, services, or products
      - Unsure about specific details
      - Need current pricing or availability`
    });
  }
}
```

## Storage Options

### 1. **Vector Databases**
- **Pinecone**: Managed, scalable, easy setup
- **Weaviate**: Open-source, self-hosted option
- **Chroma**: Lightweight, good for development
- **Qdrant**: High-performance, Rust-based

### 2. **Traditional Databases**
- PostgreSQL with pgvector extension
- Elasticsearch for full-text search
- Redis for caching frequent queries

### 3. **Hybrid Approach**
```typescript
class HybridKnowledgeStore {
  private vectorDB: Pinecone;        // For semantic search
  private postgres: PostgreSQL;      // For structured data
  private redis: Redis;             // For caching
  
  async search(query: string) {
    // 1. Check cache
    const cached = await this.redis.get(query);
    if (cached) return cached;
    
    // 2. Semantic search
    const semantic = await this.vectorDB.search(query);
    
    // 3. Keyword search
    const keyword = await this.postgres.fullTextSearch(query);
    
    // 4. Combine and rank results
    return this.rankResults(semantic, keyword);
  }
}
```

## Cost Optimization

### 1. **Embedding Caching**
Don't re-embed documents that haven't changed:
```typescript
const documentHash = crypto.createHash('md5').update(content).digest('hex');
if (existingHash === documentHash) {
  // Skip re-embedding
}
```

### 2. **Selective Retrieval**
Only search when necessary:
```typescript
const KNOWLEDGE_TRIGGERS = [
  'what is', 'how much', 'policy', 'procedure',
  'service', 'product', 'price', 'hours'
];

const needsKnowledge = KNOWLEDGE_TRIGGERS.some(trigger => 
  query.toLowerCase().includes(trigger)
);
```

### 3. **Response Caching**
Cache common queries:
```typescript
const CACHE_DURATION = 3600; // 1 hour
await redis.setex(`kb:${queryHash}`, CACHE_DURATION, response);
```

## Next Steps

1. **Choose your implementation approach** based on your needs
2. **Set up vector database** (Pinecone free tier is good for testing)
3. **Create upload interface** for PDFs/documents
4. **Test with sample knowledge base**
5. **Monitor and optimize** based on usage patterns

## Example Knowledge Base Structure

```
knowledge-base/
├── policies/
│   ├── refund-policy.pdf
│   ├── privacy-policy.pdf
│   └── terms-of-service.pdf
├── products/
│   ├── service-catalog.pdf
│   ├── pricing-guide.pdf
│   └── feature-comparison.pdf
├── procedures/
│   ├── appointment-booking.pdf
│   ├── customer-onboarding.pdf
│   └── complaint-handling.pdf
└── faqs/
    ├── general-questions.pdf
    └── technical-support.pdf
```

This structure allows Emma to provide accurate, company-specific information during calls, significantly improving customer experience and reducing the need for human intervention.