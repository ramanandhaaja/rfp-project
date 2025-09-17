import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserById } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { processPDFBuffer, analyzeTenderWithLLM, generateTenderSummary } from '@/lib/pdf-processor';
import { createTenderEmbedding } from '@/lib/embeddings';

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
    const pdfFile = formData.get('pdfFile') as File;

    if (!pdfFile) {
      return NextResponse.json({ error: 'PDF file is required' }, { status: 400 });
    }

    if (pdfFile.type !== 'application/pdf') {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 });
    }

    // Convert file to buffer
    const buffer = Buffer.from(await pdfFile.arrayBuffer());

    // Process PDF and extract text
    console.log('Processing PDF...');
    const pdfText = await processPDFBuffer(buffer);

    if (!pdfText || pdfText.trim().length === 0) {
      return NextResponse.json({ error: 'Could not extract text from PDF' }, { status: 400 });
    }

    // Analyze with LLM
    console.log('Analyzing with LLM...');
    const analysis = await analyzeTenderWithLLM(pdfText);

    // Store in Supabase
    console.log('Storing in database...');
    const { data: tender, error: dbError } = await supabase
      .from('tender_documents')
      .insert({
        user_id: user.id,
        title: analysis.title,
        reference_number: analysis.referenceNumber,
        tender_type: analysis.tenderType,
        description: analysis.description,
        requirements: analysis.requirements,
        specifications: analysis.specifications,
        evaluation_criteria: analysis.evaluationCriteria,
        budget_info: analysis.budgetInfo,
        deadlines: analysis.deadlines,
        contact_info: analysis.contactInfo,
        municipalities: analysis.municipalities,
        categories: analysis.categories,
        cpv_code: analysis.cpvCode,
        file_path: pdfFile.name,
        file_size: pdfFile.size,
        mime_type: pdfFile.type,
        processed_content: pdfText,
        extracted_sections: analysis.extractedSections,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json({
        error: 'Failed to save tender document'
      }, { status: 500 });
    }

    // Create embeddings in Pinecone (async, don't wait for completion)
    if (tender) {
      createTenderEmbedding({
        id: tender.id,
        title: tender.title,
        description: tender.description || '',
        requirements: tender.requirements || {},
        specifications: tender.specifications || {},
        categories: tender.categories || [],
        municipalities: tender.municipalities || [],
        cpvCode: tender.cpv_code || '',
        userId: user.id,
      }).catch((error) => {
        console.error('Error creating tender embedding:', error);
      });
    }

    // Generate summary for response
    const summary = generateTenderSummary(analysis);

    return NextResponse.json({
      success: true,
      tender: {
        id: tender.id,
        title: tender.title,
        referenceNumber: tender.reference_number,
        tenderType: tender.tender_type,
        description: tender.description,
        municipalities: tender.municipalities,
        categories: tender.categories,
        cpvCode: tender.cpv_code,
        requirements: tender.requirements,
        specifications: tender.specifications,
        evaluationCriteria: tender.evaluation_criteria,
        budgetInfo: tender.budget_info,
        deadlines: tender.deadlines,
        contactInfo: tender.contact_info,
        extractedSections: tender.extracted_sections,
        createdAt: tender.created_at,
      },
      analysis,
      summary,
    });

  } catch (error) {
    console.error('Error importing tender:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
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

    // Fetch user's tender documents from Supabase
    const { data: tenders, error } = await supabase
      .from('tender_documents')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tenders:', error);
      return NextResponse.json({ error: 'Failed to fetch tenders' }, { status: 500 });
    }

    // Transform the tender data to match frontend interface
    const transformedTenders = (tenders || []).map(tender => ({
      id: tender.id,
      title: tender.title,
      referenceNumber: tender.reference_number,
      tenderType: tender.tender_type,
      description: tender.description,
      municipalities: tender.municipalities,
      categories: tender.categories,
      cpvCode: tender.cpv_code,
      requirements: tender.requirements,
      specifications: tender.specifications,
      evaluationCriteria: tender.evaluation_criteria,
      budgetInfo: tender.budget_info,
      deadlines: tender.deadlines,
      contactInfo: tender.contact_info,
      extractedSections: tender.extracted_sections,
      createdAt: tender.created_at,
    }));

    return NextResponse.json({ tenders: transformedTenders });

  } catch (error) {
    console.error('Error fetching tenders:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}