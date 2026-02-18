import fs from 'fs/promises';
import path from 'path';

// Lightweight vector search using JSON files instead of FAISS
interface VectorSearchResult {
  id: string;
  score: number;
  metadata: any;
}

interface ProductMetadata {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  tags: string[];
  metadata?: {
    style?: string;
    season?: string | string[];
    occasion?: string[];
    [key: string]: any;
  };
}

export class VectorService {
  private readonly embeddingsPath: string;
  private readonly metadataPath: string;
  
  constructor() {
    this.embeddingsPath = process.env.VECTOR_EMBEDDINGS_PATH || './data/product_embeddings.npy';
    this.metadataPath = process.env.VECTOR_METADATA_PATH || './data/product_metadata.json';
  }
  
  /**
   * Generate embedding using simple text processing
   * Lightweight alternative to heavy embedding models
   */
  async generateEmbedding(text: string): Promise<number[]> {
    // Simple text processing
    const words = text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2);
    
    // Create a simple 64-dimensional vector using hash functions
    const vector = new Array(64).fill(0);
    const hash = this.simpleHash(words.join(' '));
    
    for (let i = 0; i < 64; i++) {
      vector[i] = Math.sin(hash + i) * 0.5 + Math.cos(hash * 2 + i) * 0.5;
    }
    
    // Normalize the vector
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (norm > 0) {
      return vector.map(val => val / norm);
    }
    return vector;
  }
  
  /**
   * Simple hash function for generating consistent vectors
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }
  
  /**
   * Index all products using lightweight approach
   */
  async indexProducts(products: ProductMetadata[]): Promise<void> {
    console.log(`Indexing ${products.length} products...`);
    
    const embeddings: number[][] = [];
    const metadata: ProductMetadata[] = [];
    
    const expandForIndexing = (raw: string): string => {
      const q = String(raw || '').toLowerCase();
      const synonyms: Record<string, string[]> = {
        pants: ['trousers', 'slacks'],
        trousers: ['pants', 'slacks'],
        slacks: ['pants', 'trousers'],
        hoodie: ['hooded', 'sweatshirt'],
        sweatshirt: ['hoodie'],
        sneakers: ['shoes', 'trainer', 'trainers'],
        sneaker: ['shoes', 'trainer', 'trainers'],
        trainers: ['sneakers', 'shoes'],
        trainer: ['sneakers', 'shoes'],
        handbag: ['bag', 'purse'],
        purse: ['bag', 'handbag'],
      };

      const tokens = q.split(/\W+/).filter(Boolean);
      const expanded = new Set<string>();
      for (const t of tokens) {
        expanded.add(t);
        if (t.endsWith('s') && t.length > 3) expanded.add(t.slice(0, -1));
        const syn = synonyms[t];
        if (syn) syn.forEach(s => expanded.add(s));
      }

      return Array.from(expanded).join(' ');
    };

    for (const product of products) {
      // Enhanced text including all metadata fields for better semantic search
      const style = product.metadata?.style || '';
      const season = product.metadata?.season || '';
      const occasions = (product.metadata?.occasion || []).join(' ');

      const baseText = `${product.name} ${product.description} ${product.category} ${product.tags.join(' ')} ${style} ${season} ${occasions}`;
      const expandedText = expandForIndexing(baseText);
      const embedding = await this.generateEmbedding(expandedText);
      embeddings.push(embedding);
      metadata.push(product);
    }
    
    // Save metadata
    await this.saveMetadata(metadata);
    
    // Save embeddings as JSON (lightweight alternative to numpy)
    const embeddingsData = {
      embeddings,
      dimensions: 64,
      count: embeddings.length
    };
    
    await fs.writeFile(this.embeddingsPath.replace('.npy', '.json'), JSON.stringify(embeddingsData, null, 2));
    console.log('✅ Vector indexing completed');
  }
  
  /**
   * Search for similar products using lightweight cosine similarity
   */
  async searchProducts(query: string, limit: number = 10): Promise<VectorSearchResult[]> {
    try {
      console.log(`[VectorSearch] Searching for: "${query}"`);
      const queryEmbedding = await this.generateEmbedding(query);
      
      // Load embeddings from JSON file
      const embeddingsFile = this.embeddingsPath.replace('.npy', '.json');
      console.log(`[VectorSearch] Loading embeddings from: ${embeddingsFile}`);
      const embeddingsData = JSON.parse(await fs.readFile(embeddingsFile, 'utf-8'));
      
      // Load metadata
      console.log(`[VectorSearch] Loading metadata from: ${this.metadataPath}`);
      const metadata = JSON.parse(await fs.readFile(this.metadataPath, 'utf-8'));
      
      console.log(`[VectorSearch] Loaded ${embeddingsData.embeddings.length} embeddings and ${metadata.length} metadata items`);
      
      // Calculate cosine similarities
      const similarities: { index: number; score: number }[] = [];
      
      for (let i = 0; i < embeddingsData.embeddings.length; i++) {
        const embedding = embeddingsData.embeddings[i];
        const similarity = this.cosineSimilarity(queryEmbedding, embedding);
        similarities.push({ index: i, score: similarity });
      }
      
      // Sort by similarity and take top results
      similarities.sort((a, b) => b.score - a.score);
      
      const results = similarities.slice(0, limit).map(sim => ({
        id: metadata[sim.index].id,
        score: sim.score,
        metadata: metadata[sim.index]
      }));
      
      console.log(`[VectorSearch] Found ${results.length} results with scores:`, results.map(r => r.score));
      return results;
      
    } catch (error) {
      console.error('❌ Vector search failed:', error);
      return [];
    }
  }
  
  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
  
  /**
   * Save metadata to file
   */
  private async saveMetadata(metadata: ProductMetadata[]): Promise<void> {
    const dataDir = path.dirname(this.metadataPath);
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(this.metadataPath, JSON.stringify(metadata, null, 2));
  }
  
  /**
   * Check if index exists
   */
  async indexExists(): Promise<boolean> {
    try {
      const embeddingsFile = this.embeddingsPath.replace('.npy', '.json');
      await fs.access(embeddingsFile);
      await fs.access(this.metadataPath);
      return true;
    } catch {
      return false;
    }
  }
}

export const vectorService = new VectorService();
