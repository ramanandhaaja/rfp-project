import { Pinecone } from '@pinecone-database/pinecone';

if (!process.env.NEXT_PINECODE_API) {
  throw new Error('NEXT_PINECODE_API environment variable is required');
}

const pinecone = new Pinecone({
  apiKey: process.env.NEXT_PINECODE_API,
});

// Index configuration
export const PINECONE_INDEX_NAME = 'company-knowledge';
export const VECTOR_DIMENSION = 1536; // OpenAI embedding dimension

// Namespaces for different data types
export const NAMESPACES = {
  COMPANIES: 'companies',
  PRODUCTS: 'products',
  TENDERS: 'tenders',
  LEGAL: 'legal',
} as const;

export type Namespace = typeof NAMESPACES[keyof typeof NAMESPACES];

// Initialize or get existing index
export async function getOrCreateIndex() {
  try {
    // Check if index exists
    const indexList = await pinecone.listIndexes();
    const existingIndex = indexList.indexes?.find(
      (index) => index.name === PINECONE_INDEX_NAME
    );

    if (existingIndex) {
      return pinecone.index(PINECONE_INDEX_NAME);
    }

    // Create index if it doesn't exist
    await pinecone.createIndex({
      name: PINECONE_INDEX_NAME,
      dimension: VECTOR_DIMENSION,
      metric: 'cosine',
      spec: {
        serverless: {
          cloud: 'aws',
          region: 'us-east-1',
        },
      },
    });

    // Wait for index to be ready
    await new Promise((resolve) => setTimeout(resolve, 5000));

    return pinecone.index(PINECONE_INDEX_NAME);
  } catch (error) {
    console.error('Error creating/getting Pinecone index:', error);
    throw error;
  }
}

export { pinecone };