import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserById } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { createCompanyEmbedding } from '@/lib/embeddings';

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
      id,
      name,
      industry,
      description,
      website,
      contactEmail,
      contactPhone,
      address,
      foundedYear,
      employeeCount,
      revenueRange,
      certifications,
      capabilities,
    } = body;

    if (!name) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
    }

    let company;
    let supabaseError;

    if (id) {
      // Update existing company
      const result = await supabase
        .from('companies')
        .update({
          name,
          industry,
          description,
          website,
          contact_email: contactEmail,
          contact_phone: contactPhone,
          address,
          founded_year: foundedYear,
          employee_count: employeeCount,
          revenue_range: revenueRange,
          certifications: certifications || [],
          capabilities: capabilities || [],
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      company = result.data;
      supabaseError = result.error;
    } else {
      // Insert new company
      const result = await supabase
        .from('companies')
        .insert({
          user_id: user.id,
          name,
          industry,
          description,
          website,
          contact_email: contactEmail,
          contact_phone: contactPhone,
          address,
          founded_year: foundedYear,
          employee_count: employeeCount,
          revenue_range: revenueRange,
          certifications: certifications || [],
          capabilities: capabilities || [],
        })
        .select()
        .single();

      company = result.data;
      supabaseError = result.error;
    }

    if (supabaseError) {
      console.error('Supabase error:', supabaseError);
      return NextResponse.json({
        error: id ? 'Failed to update company' : 'Failed to create company'
      }, { status: 500 });
    }

    // Create embeddings in Pinecone (async, don't wait for completion)
    if (company && description) {
      createCompanyEmbedding({
        id: company.id,
        name: company.name,
        industry: company.industry || '',
        description: company.description || '',
        capabilities: company.capabilities || [],
        userId: user.id,
      }).catch((error) => {
        console.error('Error creating company embedding:', error);
      });
    }

    return NextResponse.json({
      success: true,
      company: {
        id: company.id,
        name: company.name,
        industry: company.industry,
        description: company.description,
      }
    });

  } catch (error) {
    console.error('Error creating company:', error);
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

    // Fetch user's companies from Supabase
    const { data: companies, error } = await supabase
      .from('companies')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching companies:', error);
      return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 });
    }

    return NextResponse.json({ companies: companies || [] });

  } catch (error) {
    console.error('Error fetching companies:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}