import OpenAI from 'openai';
import { getOrCreateIndex, Namespace } from './pinecone';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface EmbeddingMetadata {
  id: string;
  type: 'company' | 'product' | 'tender' | 'legal';
  title: string;
  content: string;
  userId: string;
  createdAt: string;
  [key: string]: any;
}

export interface CompanyEmbeddingData {
  id: string;
  name: string;
  industry: string;
  description: string;
  capabilities: string[];
  userId: string;
}

export interface ProductEmbeddingData {
  id: string;
  name: string;
  category: string;
  description: string;
  features: string[];
  companyId: string;
  userId: string;
}

export interface TenderEmbeddingData {
  id: string;
  title: string;
  description: string;
  requirements: Record<string, any>;
  specifications: Record<string, any>;
  categories: string[];
  municipalities: string[];
  cpvCode: string;
  userId: string;
}

// Generate embeddings using OpenAI
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error('Failed to generate embedding');
  }
}

// Create embeddings for company data
export async function createCompanyEmbedding(companyData: CompanyEmbeddingData) {
  try {
    const index = await getOrCreateIndex();

    // Combine company information for embedding
    const textToEmbed = [
      companyData.name,
      companyData.industry,
      companyData.description,
      ...(companyData.capabilities || []),
    ].filter(Boolean).join(' ');

    const embedding = await generateEmbedding(textToEmbed);

    const metadata: EmbeddingMetadata = {
      id: companyData.id,
      type: 'company',
      title: companyData.name,
      content: textToEmbed,
      userId: companyData.userId,
      industry: companyData.industry,
      createdAt: new Date().toISOString(),
    };

    await index.namespace('companies').upsert([
      {
        id: `company_${companyData.id}`,
        values: embedding,
        metadata,
      },
    ]);

    return { success: true, id: companyData.id };
  } catch (error) {
    console.error('Error creating company embedding:', error);
    throw error;
  }
}

// Create embeddings for product data
export async function createProductEmbedding(productData: ProductEmbeddingData) {
  try {
    const index = await getOrCreateIndex();

    // Combine product information for embedding
    const textToEmbed = [
      productData.name,
      productData.category,
      productData.description,
      ...(productData.features || []),
    ].filter(Boolean).join(' ');

    const embedding = await generateEmbedding(textToEmbed);

    const metadata: EmbeddingMetadata = {
      id: productData.id,
      type: 'product',
      title: productData.name,
      content: textToEmbed,
      userId: productData.userId,
      companyId: productData.companyId,
      category: productData.category,
      createdAt: new Date().toISOString(),
    };

    await index.namespace('products').upsert([
      {
        id: `product_${productData.id}`,
        values: embedding,
        metadata,
      },
    ]);

    return { success: true, id: productData.id };
  } catch (error) {
    console.error('Error creating product embedding:', error);
    throw error;
  }
}

// Search for similar companies or products
export async function searchSimilarContent(
  query: string,
  namespace: Namespace,
  userId: string,
  topK: number = 5
) {
  try {
    const index = await getOrCreateIndex();
    const embedding = await generateEmbedding(query);

    const searchResults = await index.namespace(namespace).query({
      vector: embedding,
      topK,
      includeMetadata: true,
      filter: {
        userId: { $eq: userId },
      },
    });

    return searchResults.matches || [];
  } catch (error) {
    console.error('Error searching similar content:', error);
    throw error;
  }
}

// Create embeddings for tender data
export async function createTenderEmbedding(tenderData: TenderEmbeddingData) {
  try {
    const index = await getOrCreateIndex();

    // Combine tender information for embedding
    const textToEmbed = [
      tenderData.title,
      tenderData.description,
      tenderData.cpvCode,
      ...(tenderData.categories || []),
      ...(tenderData.municipalities || []),
      // Add requirements and specifications as text
      JSON.stringify(tenderData.requirements),
      JSON.stringify(tenderData.specifications),
    ].filter(Boolean).join(' ');

    const embedding = await generateEmbedding(textToEmbed);

    const metadata: EmbeddingMetadata = {
      id: tenderData.id,
      type: 'tender',
      title: tenderData.title,
      content: textToEmbed,
      userId: tenderData.userId,
      categories: tenderData.categories,
      municipalities: tenderData.municipalities,
      cpvCode: tenderData.cpvCode,
      createdAt: new Date().toISOString(),
    };

    await index.namespace('tenders').upsert([
      {
        id: `tender_${tenderData.id}`,
        values: embedding,
        metadata,
      },
    ]);

    return { success: true, id: tenderData.id };
  } catch (error) {
    console.error('Error creating tender embedding:', error);
    throw error;
  }
}

// Search for relevant companies/products based on tender requirements
export async function findRelevantCapabilities(
  tenderRequirements: string,
  userId: string,
  topK: number = 10
) {
  try {
    const index = await getOrCreateIndex();
    const embedding = await generateEmbedding(tenderRequirements);

    // Search both companies and products
    const [companyResults, productResults] = await Promise.all([
      index.namespace('companies').query({
        vector: embedding,
        topK: Math.ceil(topK / 2),
        includeMetadata: true,
        filter: { userId: { $eq: userId } },
      }),
      index.namespace('products').query({
        vector: embedding,
        topK: Math.ceil(topK / 2),
        includeMetadata: true,
        filter: { userId: { $eq: userId } },
      }),
    ]);

    return {
      companies: companyResults.matches || [],
      products: productResults.matches || [],
    };
  } catch (error) {
    console.error('Error finding relevant capabilities:', error);
    throw error;
  }
}

// Delete embeddings
export async function deleteEmbedding(id: string, type: 'company' | 'product' | 'tender') {
  try {
    const index = await getOrCreateIndex();
    const namespace = type === 'company' ? 'companies' : type === 'product' ? 'products' : 'tenders';

    await index.namespace(namespace).deleteOne(`${type}_${id}`);

    return { success: true };
  } catch (error) {
    console.error('Error deleting embedding:', error);
    throw error;
  }
}