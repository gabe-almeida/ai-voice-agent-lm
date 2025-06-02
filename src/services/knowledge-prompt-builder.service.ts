/**
 * Knowledge Prompt Builder Service
 * Builds enhanced system prompts with embedded knowledge base
 * This approach matches how VAPI and ElevenLabs handle knowledge bases
 */

import fs from 'fs/promises';
import path from 'path';
import logger from '../utils/logger';

interface KnowledgeEntry {
  id: string;
  category: string;
  question: string;
  answer: string;
  keywords: string[];
  priority: number;
}

export class KnowledgePromptBuilder {
  private static knowledgeCache: string | null = null;
  private static lastUpdated: Date | null = null;
  private static CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Build an enhanced prompt with embedded knowledge
   * This is how VAPI and ElevenLabs typically handle knowledge bases
   */
  static async buildEnhancedPrompt(basePrompt: string): Promise<string> {
    const knowledge = await this.getFormattedKnowledge();
    
    return `${basePrompt}

COMPANY KNOWLEDGE BASE:
${knowledge}

IMPORTANT: Always use the above knowledge base information when answering questions about:
- Services and pricing
- Business hours and location
- Company policies
- Appointment preparation
- Products and brands
- Any other business-specific information

If information is not in the knowledge base above, you may use general knowledge but indicate that you're providing general information.`;
  }

  /**
   * Get formatted knowledge, using cache if available
   */
  private static async getFormattedKnowledge(): Promise<string> {
    // Check cache
    if (this.knowledgeCache && this.lastUpdated) {
      const age = Date.now() - this.lastUpdated.getTime();
      if (age < this.CACHE_DURATION) {
        return this.knowledgeCache;
      }
    }

    // Load and format knowledge
    try {
      const knowledgePath = path.join(__dirname, '../../data/knowledge-base.json');
      const data = await fs.readFile(knowledgePath, 'utf-8');
      const entries: KnowledgeEntry[] = JSON.parse(data);
      
      // Sort by priority and category
      entries.sort((a, b) => {
        if (a.priority !== b.priority) return b.priority - a.priority;
        return a.category.localeCompare(b.category);
      });

      // Format knowledge by category
      const categories = this.groupByCategory(entries);
      const formatted = this.formatCategories(categories);
      
      // Update cache
      this.knowledgeCache = formatted;
      this.lastUpdated = new Date();
      
      logger.info('Knowledge base loaded and cached', {
        entries: entries.length,
        size: formatted.length
      });
      
      return formatted;
    } catch (error) {
      logger.error('Failed to load knowledge base', { error });
      return 'No additional knowledge base available.';
    }
  }

  /**
   * Group entries by category
   */
  private static groupByCategory(entries: KnowledgeEntry[]): Map<string, KnowledgeEntry[]> {
    const categories = new Map<string, KnowledgeEntry[]>();
    
    entries.forEach(entry => {
      if (!categories.has(entry.category)) {
        categories.set(entry.category, []);
      }
      categories.get(entry.category)!.push(entry);
    });
    
    return categories;
  }

  /**
   * Format categories into a readable string
   */
  private static formatCategories(categories: Map<string, KnowledgeEntry[]>): string {
    const sections: string[] = [];
    
    // Define category display names and order
    const categoryOrder = [
      { key: 'services', name: 'SERVICES & OFFERINGS' },
      { key: 'pricing', name: 'PRICING' },
      { key: 'hours', name: 'BUSINESS HOURS' },
      { key: 'location', name: 'LOCATION' },
      { key: 'policies', name: 'POLICIES' },
      { key: 'booking', name: 'BOOKING INFORMATION' },
      { key: 'preparation', name: 'APPOINTMENT PREPARATION' },
      { key: 'products', name: 'PRODUCTS & BRANDS' },
      { key: 'duration', name: 'APPOINTMENT DURATION' },
      { key: 'special-events', name: 'SPECIAL EVENTS' }
    ];
    
    categoryOrder.forEach(({ key, name }) => {
      const entries = categories.get(key);
      if (entries && entries.length > 0) {
        const section = `${name}:\n${entries.map(e => `- ${e.answer}`).join('\n')}`;
        sections.push(section);
      }
    });
    
    return sections.join('\n\n');
  }

  /**
   * Update knowledge base from uploaded file
   * This is how VAPI/ElevenLabs handle PDF uploads
   */
  static async updateFromFile(filePath: string, fileType: 'pdf' | 'txt' | 'json'): Promise<void> {
    // In a real implementation, you would:
    // 1. Parse PDF/TXT files
    // 2. Extract Q&A pairs or structured data
    // 3. Update the knowledge-base.json file
    // 4. Clear the cache
    
    this.knowledgeCache = null;
    this.lastUpdated = null;
    
    logger.info('Knowledge base updated from file', { filePath, fileType });
  }

  /**
   * Clear the knowledge cache (useful after updates)
   */
  static clearCache(): void {
    this.knowledgeCache = null;
    this.lastUpdated = null;
  }
}