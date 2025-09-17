import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserById } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { findRelevantCapabilities } from '@/lib/embeddings';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

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

    const { tenderId, forceReanalyze = false } = await request.json();

    if (!tenderId) {
      return NextResponse.json({ error: 'Tender ID is required' }, { status: 400 });
    }

    // Fetch tender document
    const { data: tender, error: tenderError } = await supabase
      .from('tender_documents')
      .select('*')
      .eq('id', tenderId)
      .eq('user_id', user.id)
      .single();

    if (tenderError || !tender) {
      return NextResponse.json({
        error: 'Tender not found or access denied'
      }, { status: 404 });
    }

    // Check for existing analysis if not forcing re-analysis
    if (!forceReanalyze) {
      const { data: existingAnalysis, error: analysisError } = await supabase
        .from('tender_analysis')
        .select('*')
        .eq('tender_id', tenderId)
        .eq('user_id', user.id)
        .single();

      if (!analysisError && existingAnalysis) {
        // Return existing analysis
        return NextResponse.json({
          success: true,
          tender: {
            id: tender.id,
            title: tender.title,
            description: tender.description,
            referenceNumber: tender.reference_number,
          },
          analysis: {
            overallMatch: existingAnalysis.overall_match,
            competitiveness: existingAnalysis.competitiveness,
            recommendation: existingAnalysis.recommendation,
            strengths: existingAnalysis.strengths || [],
            gaps: existingAnalysis.gaps || [],
            opportunities: existingAnalysis.opportunities || [],
            risks: existingAnalysis.risks || [],
            actionItems: existingAnalysis.action_items || [],
            budgetAssessment: existingAnalysis.budget_assessment,
            timeline: existingAnalysis.timeline_assessment,
            strategicAdvice: existingAnalysis.strategic_advice,
            matchingProducts: existingAnalysis.matching_products || [],
          },
          relevantCapabilities: {
            companies: existingAnalysis.relevant_companies || [],
            products: existingAnalysis.relevant_products || [],
          },
          matchedCompanies: [],
          matchedProducts: [],
          isFromCache: true,
          analyzedAt: existingAnalysis.created_at,
        });
      }
    }

    // Create search query from tender requirements
    const searchQuery = [
      tender.title,
      tender.description,
      JSON.stringify(tender.requirements),
      JSON.stringify(tender.specifications),
      ...(tender.categories || []),
    ].join(' ');

    // Find relevant capabilities using vector search
    const relevantCapabilities = await findRelevantCapabilities(searchQuery, user.id, 20);

    // Get detailed company and product information
    const companyIds = relevantCapabilities.companies.map(c => c.metadata?.id).filter(Boolean);
    const productIds = relevantCapabilities.products.map(p => p.metadata?.id).filter(Boolean);

    const [companies, products] = await Promise.all([
      companyIds.length > 0 ? supabase
        .from('companies')
        .select('*')
        .in('id', companyIds)
        .eq('user_id', user.id) : Promise.resolve({ data: [] }),
      productIds.length > 0 ? supabase
        .from('products')
        .select('*')
        .in('id', productIds)
        .eq('company_id', companyIds[0] || '') : Promise.resolve({ data: [] })
    ]);

    // Generate product matching analysis
    const productMatchingPrompt = `
Analyze the tender requirements and match them with specific products from the user's catalog.

TENDER REQUIREMENTS:
${JSON.stringify(tender.requirements, null, 2)}
${JSON.stringify(tender.specifications, null, 2)}

AVAILABLE PRODUCTS:
${products.data?.map(p => `
Product: ${p.name}
Power Range: ${p.specifications?.powerRange || 'Not specified'}W
Light Output: ${p.specifications?.lightOutput || 'Not specified'} lumens
Efficiency: ${p.specifications?.efficiency || 'Not specified'} lm/W
IP Rating: ${p.specifications?.ipRating || 'Not specified'}
Certifications: ${p.specifications?.certifications || p.compliance_standards?.join(', ') || 'Not specified'}
Features: ${p.features?.join(', ') || 'Not specified'}
Description: ${p.description}
`).join('\n') || 'No products found'}

Return JSON with the top 3-5 matching products:
{
  "matchingProducts": [
    {
      "name": "Product name",
      "powerRange": "X-Y",
      "lightOutput": "X-Y lumens",
      "efficiency": "X lm/W",
      "ipRating": "IPXX",
      "certifications": "CE, RoHS, etc",
      "matchScore": 85,
      "whyMatch": "Specific explanation of why this product matches the requirements"
    }
  ]
}

Focus on specific technical matches between tender requirements and product specifications.
`;

    // Generate AI analysis comparing tender requirements with capabilities
    const analysisPrompt = `
Analyze this tender and compare it with the user's capabilities to provide actionable insights.

TENDER INFORMATION:
Title: ${tender.title}
Description: ${tender.description}
Requirements: ${JSON.stringify(tender.requirements, null, 2)}
Specifications: ${JSON.stringify(tender.specifications, null, 2)}
Evaluation Criteria: ${JSON.stringify(tender.evaluation_criteria, null, 2)}
Budget: ${JSON.stringify(tender.budget_info, null, 2)}

USER'S COMPANIES:
${companies.data?.map(c => `
Company: ${c.name}
Industry: ${c.industry}
Description: ${c.description}
Capabilities: ${c.capabilities?.join(', ')}
Certifications: ${c.certifications?.join(', ')}
`).join('\n') || 'No companies found'}

USER'S PRODUCTS:
${products.data?.map(p => `
Product: ${p.name}
Category: ${p.category}
Description: ${p.description}
Features: ${p.features?.join(', ')}
Specifications: ${JSON.stringify(p.specifications)}
`).join('\n') || 'No products found'}

VECTOR SEARCH RELEVANCE SCORES:
Companies: ${relevantCapabilities.companies.map(c => `${c.metadata?.title}: ${c.score?.toFixed(3)}`).join(', ')}
Products: ${relevantCapabilities.products.map(p => `${p.metadata?.title}: ${p.score?.toFixed(3)}`).join(', ')}

Please provide a detailed analysis in JSON format with the following structure:
{
  "overallMatch": "percentage match (0-100)",
  "competitiveness": "High/Medium/Low",
  "recommendation": "Should bid / Consider bidding / Don't bid",
  "strengths": ["List of user's strengths for this tender - include specific product names when mentioning capabilities"],
  "gaps": ["Requirements the user cannot meet"],
  "opportunities": ["Areas where user has competitive advantage"],
  "risks": ["Potential challenges or risks"],
  "actionItems": ["Specific steps to improve bid chances"],
  "budgetAssessment": "Analysis of budget vs user's capacity",
  "timeline": "Assessment of deadlines and feasibility",
  "strategicAdvice": "High-level strategic recommendations"
}

Focus on practical, actionable advice that helps the user make an informed decision about bidding.
`;

    // Run both AI analyses in parallel
    const [aiResponse, productMatchResponse] = await Promise.all([
      openai.chat.completions.create({
        model: 'gpt-4-1106-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an expert procurement analyst. Provide detailed, practical analysis comparing tender requirements with company capabilities. Always return valid JSON.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2000,
      }),

      // Only run product matching if products exist
      products.data && products.data.length > 0 ? openai.chat.completions.create({
        model: 'gpt-4-1106-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a technical product matching expert. Analyze product specifications against tender requirements and return matching products with precise technical justifications. Always return valid JSON.'
          },
          {
            role: 'user',
            content: productMatchingPrompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1500,
      }) : Promise.resolve(null)
    ]);

    // Clean and parse the main analysis JSON response
    let content = aiResponse.choices[0]?.message?.content || '{}';
    content = content.trim();

    // Remove markdown code blocks if present
    if (content.startsWith('```json')) {
      content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (content.startsWith('```')) {
      content = content.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const aiAnalysis = JSON.parse(content);

    // Parse product matching response if available
    let productMatching = { matchingProducts: [] };
    if (productMatchResponse) {
      try {
        let productContent = productMatchResponse.choices[0]?.message?.content || '{}';
        productContent = productContent.trim();

        // Remove markdown code blocks if present
        if (productContent.startsWith('```json')) {
          productContent = productContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (productContent.startsWith('```')) {
          productContent = productContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        productMatching = JSON.parse(productContent);
      } catch (error) {
        console.error('Error parsing product matching response:', error);
        productMatching = { matchingProducts: [] };
      }
    }

    // Merge the analyses
    const combinedAnalysis = {
      ...aiAnalysis,
      matchingProducts: productMatching.matchingProducts || []
    };

    // Save the analysis results to database
    const relevantCompaniesData = relevantCapabilities.companies.map(c => ({
      id: c.metadata?.id,
      name: c.metadata?.title,
      score: c.score,
      type: c.metadata?.type,
    }));

    const relevantProductsData = relevantCapabilities.products.map(p => ({
      id: p.metadata?.id,
      name: p.metadata?.title,
      score: p.score,
      type: p.metadata?.type,
    }));

    // Upsert analysis results
    const { error: saveError } = await supabase
      .from('tender_analysis')
      .upsert({
        user_id: user.id,
        tender_id: tenderId,
        overall_match: combinedAnalysis.overallMatch,
        competitiveness: combinedAnalysis.competitiveness,
        recommendation: combinedAnalysis.recommendation,
        strengths: combinedAnalysis.strengths || [],
        gaps: combinedAnalysis.gaps || [],
        opportunities: combinedAnalysis.opportunities || [],
        risks: combinedAnalysis.risks || [],
        action_items: combinedAnalysis.actionItems || [],
        budget_assessment: combinedAnalysis.budgetAssessment,
        timeline_assessment: combinedAnalysis.timeline,
        strategic_advice: combinedAnalysis.strategicAdvice,
        matching_products: combinedAnalysis.matchingProducts || [],
        relevant_companies: relevantCompaniesData,
        relevant_products: relevantProductsData,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,tender_id'
      });

    if (saveError) {
      console.error('Error saving analysis:', saveError);
      // Continue anyway, don't fail the request
    }

    return NextResponse.json({
      success: true,
      tender: {
        id: tender.id,
        title: tender.title,
        description: tender.description,
        referenceNumber: tender.reference_number,
      },
      analysis: combinedAnalysis,
      relevantCapabilities: {
        companies: relevantCompaniesData,
        products: relevantProductsData,
      },
      matchedCompanies: companies.data || [],
      matchedProducts: products.data || [],
      isFromCache: false,
      analyzedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error analyzing tender:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}