import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserById } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { createProductEmbedding } from '@/lib/embeddings';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
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

    const body = await request.json();
    const {
      companyId,
      name,
      category,
      description,
      specifications,
      features,
      priceRange,
      availability,
      complianceStandards,
    } = body;

    if (!name || !companyId) {
      return NextResponse.json({
        error: 'Product name and company ID are required'
      }, { status: 400 });
    }

    // Verify the company belongs to the user
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id')
      .eq('id', companyId)
      .eq('user_id', user.id)
      .single();

    if (companyError || !company) {
      return NextResponse.json({
        error: 'Company not found or access denied'
      }, { status: 404 });
    }

    // Insert product data into Supabase
    const { data: product, error: supabaseError } = await supabase
      .from('products')
      .insert({
        company_id: companyId,
        name,
        category,
        description,
        specifications: specifications || {},
        features: features || [],
        price_range: priceRange,
        availability,
        compliance_standards: complianceStandards || [],
      })
      .select()
      .single();

    if (supabaseError) {
      console.error('Supabase error:', supabaseError);
      return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
    }

    // Create embeddings in Pinecone (async, don't wait for completion)
    if (product && description) {
      createProductEmbedding({
        id: product.id,
        name: product.name,
        category: product.category || '',
        description: product.description || '',
        features: product.features || [],
        specifications: product.specifications || {},
        companyId: product.company_id,
        userId: user.id,
      }).catch((error) => {
        console.error('Error creating product embedding:', error);
      });
    }

    return NextResponse.json({
      success: true,
      product: {
        id: product.id,
        name: product.name,
        category: product.category,
        description: product.description,
      }
    });

  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const companyId = url.searchParams.get('companyId');

    let query = supabase
      .from('products')
      .select(`
        *,
        companies!inner(
          id,
          name,
          user_id
        )
      `)
      .eq('companies.user_id', user.id);

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data: products, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching products:', error);
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }

    return NextResponse.json({ products: products || [] });

  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}