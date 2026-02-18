#!/usr/bin/env python3
"""
FAISS Vector Database Setup Script for TrendZone
This script sets up FAISS for local vector search functionality.
"""

import os
import sys
import json
import numpy as np
from pathlib import Path

def install_requirements():
    """Install required Python packages"""
    print("📦 Installing required Python packages...")
    
    packages = [
        'numpy',  # Only numpy needed for basic vector operations
    ]
    
    for package in packages:
        try:
            __import__(package)
            print(f"✅ {package} already installed")
        except ImportError:
            print(f"📥 Installing {package}...")
            os.system(f"pip install {package}")

def create_sample_index():
    """Create a simple vector index with product data (lightweight version)"""
    
    # Create data directory
    data_dir = Path("./data")
    data_dir.mkdir(exist_ok=True)
    
    # Sample product data
    sample_products = [
        {
            "id": "sample-1",
            "name": "Classic White Sneakers",
            "description": "Comfortable and stylish white sneakers perfect for everyday wear",
            "category": "Shoes",
            "tags": ["sneakers", "casual", "white"],
            "price": 89.99
        },
        {
            "id": "sample-2", 
            "name": "Denim Jacket",
            "description": "Classic denim jacket with modern fit and styling",
            "category": "Clothes",
            "tags": ["jacket", "denim", "casual"],
            "price": 129.99
        },
        {
            "id": "sample-3",
            "name": "Leather Tote Bag", 
            "description": "Genuine leather tote bag with spacious interior",
            "category": "Bags",
            "tags": ["tote", "leather", "spacious"],
            "price": 159.99
        }
    ]
    
    # Generate simple embeddings using basic text processing
    embeddings = []
    metadata = []
    
    for product in sample_products:
        # Create a simple text representation
        text = f"{product['name']} {product['description']} {product['category']} {' '.join(product['tags'])}"
        
        # Generate a simple 64-dimensional embedding using hash functions
        embedding = generate_simple_embedding(text)
        embeddings.append(embedding)
        metadata.append(product)
    
    # Save embeddings and metadata as simple JSON files
    embeddings_array = np.array(embeddings)
    
    # Save embeddings
    embeddings_path = "./data/product_embeddings.npy"
    np.save(embeddings_path, embeddings_array)
    print(f"✅ Embeddings saved to {embeddings_path}")
    
    # Save metadata
    metadata_path = "./data/product_metadata.json"
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"✅ Metadata saved to {metadata_path}")
    
    print(f"📊 Created index with {len(embeddings)} vectors")

def generate_simple_embedding(text: str, dim: int = 64) -> np.ndarray:
    """Generate a simple embedding using basic text processing"""
    # Simple text processing
    words = text.lower().replace('[^a-z0-9\\s]', '').split()
    words = [w for w in words if len(w) > 2]
    
    # Create a simple hash-based embedding
    embedding = np.zeros(dim)
    
    for i, word in enumerate(words):
        # Use word hash to distribute values across dimensions
        word_hash = hash(word)
        for j in range(dim):
            # Create pseudo-random but deterministic values
            embedding[j] += np.sin(word_hash + i * j) * 0.1
    
    # Normalize the embedding
    norm = np.linalg.norm(embedding)
    if norm > 0:
        embedding = embedding / norm
    
    return embedding.astype('float32')

def test_search():
    """Test the lightweight search functionality"""
    try:
        # Load embeddings
        embeddings_path = "./data/product_embeddings.npy"
        metadata_path = "./data/product_metadata.json"
        
        if not os.path.exists(embeddings_path) or not os.path.exists(metadata_path):
            print("❌ Embeddings or metadata not found. Run setup first.")
            return
        
        print("🔍 Loading embeddings...")
        embeddings = np.load(embeddings_path)
        
        # Load metadata
        with open(metadata_path, 'r') as f:
            metadata = json.load(f)
        
        # Test search
        query_text = "white sneakers"
        query_embedding = generate_simple_embedding(query_text)
        
        print(f"🔍 Searching for: {query_text}")
        
        # Simple cosine similarity search
        similarities = []
        for i, embedding in enumerate(embeddings):
            similarity = np.dot(query_embedding, embedding) / (
                np.linalg.norm(query_embedding) * np.linalg.norm(embedding)
            )
            similarities.append((i, similarity))
        
        # Sort by similarity
        similarities.sort(key=lambda x: x[1], reverse=True)
        
        print("📋 Search results:")
        for i, (idx, similarity) in enumerate(similarities[:3]):
            if idx < len(metadata):
                product = metadata[idx]
                print(f"  {i+1}. {product['name']} (Score: {similarity:.3f})")
                print(f"     Category: {product['category']}")
                print(f"     Price: ${product['price']}")
        
    except Exception as e:
        print(f"❌ Search test failed: {e}")

def main():
    """Main setup function"""
    print("🚀 TrendZone FAISS Setup")
    print("=" * 40)
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "install":
            install_requirements()
        elif command == "create":
            create_sample_index()
        elif command == "test":
            test_search()
        else:
            print("Usage: python setup_faiss.py [install|create|test]")
    else:
        print("🔧 Setting up FAISS for TrendZone...")
        install_requirements()
        create_sample_index()
        test_search()
        
        print("\n" + "=" * 40)
        print("✅ Setup completed!")
        print("\nNext steps:")
        print("1. Install Node.js dependencies: npm install")
        print("2. Set up PostgreSQL database")
        print("3. Run migration: npm run migrate")
        print("4. Seed data: npm run seed")
        print("5. Start server: npm run dev")

if __name__ == "__main__":
    main()
