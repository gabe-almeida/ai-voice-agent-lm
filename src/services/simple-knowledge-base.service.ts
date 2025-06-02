/**
 * Simple Knowledge Base Service
 * A basic implementation that can be enhanced with vector search later
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

export class SimpleKnowledgeBaseService {
  private knowledgeBase: Map<string, KnowledgeEntry> = new Map();
  private keywordIndex: Map<string, Set<string>> = new Map();
  
  constructor() {
    this.loadKnowledgeBase();
  }

  /**
   * Load knowledge base from JSON file
   */
  private async loadKnowledgeBase() {
    try {
      const knowledgePath = path.join(__dirname, '../../data/knowledge-base.json');
      const data = await fs.readFile(knowledgePath, 'utf-8');
      const entries: KnowledgeEntry[] = JSON.parse(data);
      
      // Build knowledge base and keyword index
      entries.forEach(entry => {
        this.knowledgeBase.set(entry.id, entry);
        
        // Index keywords
        entry.keywords.forEach(keyword => {
          const normalized = keyword.toLowerCase();
          if (!this.keywordIndex.has(normalized)) {
            this.keywordIndex.set(normalized, new Set());
          }
          this.keywordIndex.get(normalized)!.add(entry.id);
        });
      });
      
      logger.info(`Loaded ${entries.length} knowledge base entries`);
    } catch (error) {
      logger.warn('No knowledge base file found, starting with empty knowledge base');
    }
  }

  /**
   * Search knowledge base for relevant information
   */
  async search(query: string): Promise<string> {
    const normalizedQuery = query.toLowerCase();
    const words = normalizedQuery.split(/\s+/);
    
    // Score each entry based on keyword matches
    const scores = new Map<string, number>();
    
    words.forEach(word => {
      const entryIds = this.keywordIndex.get(word);
      if (entryIds) {
        entryIds.forEach(id => {
          scores.set(id, (scores.get(id) || 0) + 1);
        });
      }
    });
    
    // Sort by score and priority
    const sortedEntries = Array.from(scores.entries())
      .sort((a, b) => {
        const scoreA = a[1];
        const scoreB = b[1];
        if (scoreA !== scoreB) return scoreB - scoreA;
        
        // If scores are equal, sort by priority
        const entryA = this.knowledgeBase.get(a[0])!;
        const entryB = this.knowledgeBase.get(b[0])!;
        return entryB.priority - entryA.priority;
      })
      .slice(0, 3); // Top 3 results
    
    // Format results
    if (sortedEntries.length === 0) {
      return "I don't have specific information about that in my knowledge base.";
    }
    
    const results = sortedEntries.map(([id]) => {
      const entry = this.knowledgeBase.get(id)!;
      return entry.answer;
    });
    
    return results.join('\n\n');
  }

  /**
   * Add or update a knowledge entry
   */
  async addEntry(entry: KnowledgeEntry) {
    this.knowledgeBase.set(entry.id, entry);
    
    // Update keyword index
    entry.keywords.forEach(keyword => {
      const normalized = keyword.toLowerCase();
      if (!this.keywordIndex.has(normalized)) {
        this.keywordIndex.set(normalized, new Set());
      }
      this.keywordIndex.get(normalized)!.add(entry.id);
    });
    
    // Save to file
    await this.saveKnowledgeBase();
  }

  /**
   * Save knowledge base to file
   */
  private async saveKnowledgeBase() {
    const entries = Array.from(this.knowledgeBase.values());
    const knowledgePath = path.join(__dirname, '../../data/knowledge-base.json');
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(knowledgePath), { recursive: true });
    
    await fs.writeFile(
      knowledgePath,
      JSON.stringify(entries, null, 2),
      'utf-8'
    );
  }

  /**
   * Get all categories
   */
  getCategories(): string[] {
    const categories = new Set<string>();
    this.knowledgeBase.forEach(entry => {
      categories.add(entry.category);
    });
    return Array.from(categories);
  }

  /**
   * Get entries by category
   */
  getByCategory(category: string): KnowledgeEntry[] {
    const entries: KnowledgeEntry[] = [];
    this.knowledgeBase.forEach(entry => {
      if (entry.category === category) {
        entries.push(entry);
      }
    });
    return entries.sort((a, b) => b.priority - a.priority);
  }
}

// Singleton instance
export const knowledgeBaseService = new SimpleKnowledgeBaseService();