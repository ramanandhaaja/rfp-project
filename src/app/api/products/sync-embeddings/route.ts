import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserById } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { createProductEmbedding } from '@/lib/embeddings';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key"
);

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get company for the user
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (companyError || !company) {
      return NextResponse.json({ error: 'No company found for user' }, { status: 404 });
    }

    // Fetch all products for the company
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .eq('company_id', company.id);

    if (productsError) {
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }

    if (!products || products.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No products to sync',
        synced: 0
      });
    }

    // Sync each product to Pinecone
    const results = await Promise.allSettled(
      products.map(async (product) => {
        return createProductEmbedding({
          id: product.id,
          name: product.name,
          category: product.category || '',
          description: product.description || '',
          features: product.features || [],
          specifications: product.specifications || {},
          companyId: company.id,
          userId: user.id,
        });
      })
    );

    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return NextResponse.json({
      success: true,
      message: `Synced ${succeeded} products to Pinecone`,
      synced: succeeded,
      failed: failed,
      total: products.length,
    });

  } catch (error) {
    console.error('Error syncing products:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
