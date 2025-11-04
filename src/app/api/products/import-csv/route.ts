import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserById } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { createProductEmbedding } from '@/lib/embeddings';
import { parseProductsCSV, validateCSVStructure } from '@/lib/csv-parser';

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

    const formData = await request.formData();
    const csvFile = formData.get('csvFile') as File;
    const companyId = formData.get('companyId') as string;

    if (!csvFile) {
      return NextResponse.json({ error: 'CSV file is required' }, { status: 400 });
    }

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    // Verify the company belongs to the user
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name')
      .eq('id', companyId)
      .eq('user_id', user.id)
      .single();

    if (companyError || !company) {
      return NextResponse.json({
        error: 'Company not found or access denied'
      }, { status: 404 });
    }

    // Read CSV file content
    const csvText = await csvFile.text();

    // Validate CSV structure
    const validation = validateCSVStructure(csvText);
    if (!validation.valid) {
      return NextResponse.json({
        error: validation.error,
        headers: validation.headers
      }, { status: 400 });
    }

    // Parse CSV data
    let products;
    try {
      products = await parseProductsCSV(csvText);
    } catch (error) {
      return NextResponse.json({
        error: 'Failed to parse CSV file',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 400 });
    }

    if (products.length === 0) {
      return NextResponse.json({
        error: 'No valid products found in CSV file'
      }, { status: 400 });
    }

    // Import products into database
    const importResults = {
      total: products.length,
      successful: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const product of products) {
      try {
        // Insert product into Supabase
        const { data: insertedProduct, error: insertError } = await supabase
          .from('products')
          .insert({
            company_id: companyId,
            name: product.name,
            category: product.category || 'LED Lighting',
            description: product.description,
            specifications: product.specifications || {},
            features: product.features || [],
            price_range: null, // Not available in this CSV
            availability: 'Available', // Default assumption
            compliance_standards: product.certifications
              ? product.certifications.split(/[,;]/).map(c => c.trim())
              : []
          })
          .select()
          .single();

        if (insertError) {
          importResults.failed++;
          importResults.errors.push(`Failed to import "${product.name}": ${insertError.message}`);
          continue;
        }

        // Create embeddings in Pinecone (async, don't wait for completion)
        if (insertedProduct) {
          createProductEmbedding({
            id: insertedProduct.id,
            name: insertedProduct.name,
            category: insertedProduct.category || '',
            description: insertedProduct.description || '',
            features: insertedProduct.features || [],
            specifications: insertedProduct.specifications || {},
            companyId: insertedProduct.company_id,
            userId: user.id,
          }).catch((error) => {
            console.error(`Error creating embedding for product "${product.name}":`, error);
          });
        }

        importResults.successful++;
      } catch (error) {
        importResults.failed++;
        importResults.errors.push(
          `Unexpected error importing "${product.name}": ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import completed: ${importResults.successful} successful, ${importResults.failed} failed`,
      results: importResults,
      companyName: company.name
    });

  } catch (error) {
    console.error('Error importing CSV:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}