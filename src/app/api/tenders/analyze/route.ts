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

CRITICAL MATCHING CRITERIA:
1. Shape compatibility (MUST match - e.g., if tender requires "kofferarmaturen" (box-shaped), products must be box-shaped/rectangular)
2. Physical dimensions (must fit requirements)
3. Mounting compatibility (wall/ceiling/pole must match)
4. Technical specifications (power, light output, efficiency, IP rating)
5. Certifications and standards compliance

TENDER REQUIREMENTS:
${JSON.stringify(tender.requirements, null, 2)}

TENDER PHYSICAL SPECIFICATIONS (CRITICAL FOR MATCHING):
Shape Required: ${tender.specifications?.shape || 'Not specified'}
Housing Type: ${tender.specifications?.housing || 'Not specified'}
Dimensions: ${tender.specifications?.dimensions || 'Not specified'}
Mounting: ${tender.specifications?.mounting || 'Not specified'}
Products Specified: ${tender.specifications?.products || 'Not specified'}

FULL TENDER SPECIFICATIONS:
${JSON.stringify(tender.specifications, null, 2)}

AVAILABLE PRODUCTS FROM USER'S CATALOG:
${products.data?.map(p => `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Product: ${p.name}
SHAPE/PHYSICAL:
  - Housing/Shape: ${p.specifications?.housing || 'Not specified'}
  - Dimensions: ${p.specifications?.dimensions || 'Not specified'}
  - Mounting: ${p.specifications?.mounting || 'Not specified'}
  - Optics: ${p.specifications?.optics || 'Not specified'}
TECHNICAL:
  - Power Range: ${p.specifications?.powerRange || 'Not specified'}W
  - Light Output: ${p.specifications?.lightOutput || 'Not specified'} lumens
  - Efficiency: ${p.specifications?.efficiency || 'Not specified'} lm/W
  - IP Rating: ${p.specifications?.ipRating || 'Not specified'}
COMPLIANCE:
  - Certifications: ${p.specifications?.certifications || p.compliance_standards?.join(', ') || 'Not specified'}
  - Features: ${p.features?.join(', ') || 'Not specified'}
Description: ${p.description}
`).join('\n') || 'No products found'}

MATCHING INSTRUCTIONS:
- FIRST check shape/physical compatibility (if tender specifies "kofferarmaturen", only match box-shaped products; if "paaltoparmaturen", only match cylindrical/pole-top products)
- If shape is incompatible, assign low match score (<50%) and explain shape mismatch
- If shape matches, then evaluate technical specs, dimensions, mounting, and certifications
- Include shape compatibility explicitly in "whyMatch" explanation
- Penalize products that don't match the required shape even if technical specs are good

Return JSON with the top 3-5 matching products (or fewer if shape mismatch):
{
  "matchingProducts": [
    {
      "name": "Product name",
      "powerRange": "X-Y W",
      "lightOutput": "X-Y lumens",
      "efficiency": "X lm/W",
      "ipRating": "IPXX",
      "dimensions": "dimensions in mm",
      "housing": "housing/shape type (e.g., box-shaped, cylindrical, spherical)",
      "mounting": "mounting options",
      "optics": "optical characteristics",
      "certifications": "CE, RoHS, etc",
      "matchScore": 85,
      "whyMatch": "MUST include shape compatibility assessment first, then technical match. Example: 'Shape: Box-shaped housing matches tender requirement for kofferarmaturen. Technical: Power range 50-100W fits requirement, IP65 exceeds IP54 minimum, 120lm/W efficiency meets spec.'"
    }
  ]
}

REMEMBER: Shape mismatch is a critical failure. If tender requires box-shaped (kofferarmaturen) but product is cylindrical (paaltoparmaturen), this is incompatible regardless of other specs.
`;

    // Generate AI analysis comparing tender requirements with capabilities
    const analysisPrompt = `
Analyze this tender and compare it with the user's capabilities to provide actionable insights.

TENDER INFORMATION:
Title: ${tender.title}
Description: ${tender.description}
Requirements: ${JSON.stringify(tender.requirements, null, 2)}

TENDER PHYSICAL/SHAPE REQUIREMENTS (CRITICAL):
Shape Required: ${tender.specifications?.shape || 'Not specified'}
Housing Type: ${tender.specifications?.housing || 'Not specified'}
Products Specified: ${tender.specifications?.products || 'Not specified'} (e.g., "Kofferarmaturen" = box-shaped, "Paaltoparmaturen" = cylindrical)
Dimensions: ${tender.specifications?.dimensions || 'Not specified'}
Mounting: ${tender.specifications?.mounting || 'Not specified'}

Full Specifications: ${JSON.stringify(tender.specifications, null, 2)}
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

USER'S PRODUCTS (with shape information):
${products.data?.map(p => `
Product: ${p.name}
Category: ${p.category}
Shape/Housing: ${p.specifications?.housing || 'Not specified'}
Physical Specs: Dimensions ${p.specifications?.dimensions || 'N/A'}, Mounting ${p.specifications?.mounting || 'N/A'}
Technical Specs: ${JSON.stringify(p.specifications)}
Features: ${p.features?.join(', ')}
Description: ${p.description}
`).join('\n') || 'No products found'}

VECTOR SEARCH RELEVANCE SCORES:
Companies: ${relevantCapabilities.companies.map(c => `${c.metadata?.title}: ${c.score?.toFixed(3)}`).join(', ')}
Products: ${relevantCapabilities.products.map(p => `${p.metadata?.title}: ${p.score?.toFixed(3)}`).join(', ')}

IMPORTANT ANALYSIS GUIDELINES:
1. Check shape compatibility FIRST - if tender specifies "Kofferarmaturen" (box-shaped) and user only has cylindrical products, this is a CRITICAL GAP
2. Shape mismatch should significantly lower the overall match percentage
3. Include shape compatibility in strengths (if match) or gaps (if mismatch)
4. Consider both exact shape matches and "equivalent" options if justified

Please provide a detailed analysis in JSON format with the following structure:
{
  "overallMatch": "percentage match (0-100) - REDUCE if shape mismatch exists",
  "competitiveness": "High/Medium/Low",
  "recommendation": "Should bid / Consider bidding / Don't bid",
  "strengths": ["List strengths - MUST include shape compatibility if products match (e.g., 'Box-shaped products (kofferarmaturen) match tender requirements perfectly'). Include specific product names."],
  "gaps": ["Requirements the user cannot meet - MUST include shape mismatch if exists (e.g., 'Tender requires cylindrical paaltoparmaturen but user only has box-shaped kofferarmaturen')"],
  "opportunities": ["Areas where user has competitive advantage - can include superior shape/physical design"],
  "risks": ["Potential challenges or risks - include shape incompatibility if relevant"],
  "actionItems": ["Specific steps to improve bid chances - include sourcing products with correct shape if needed"],
  "budgetAssessment": "Analysis of budget vs user's capacity",
  "timeline": "Assessment of deadlines and feasibility",
  "strategicAdvice": "High-level strategic recommendations - address shape compatibility"
}

CRITICAL: Always assess shape compatibility first. If tender requires "Kofferarmaturen" (box-shaped), only products with box-shaped/rectangular housing are compatible. Shape mismatch = major gap that should reduce overall match score significantly (by 20-40%).

Focus on practical, actionable advice that helps the user make an informed decision about bidding.
`;

    // Helper function to clean and parse JSON from AI responses
    const cleanAndParseJSON = (content: string): unknown => {
      let cleanContent = content.trim();

      // Remove markdown code blocks if present
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      // Try to extract just the JSON object if there's extra content
      const firstBrace = cleanContent.indexOf('{');
      if (firstBrace !== -1) {
        let braceCount = 0;
        let lastBrace = -1;

        for (let i = firstBrace; i < cleanContent.length; i++) {
          if (cleanContent[i] === '{') {
            braceCount++;
          } else if (cleanContent[i] === '}') {
            braceCount--;
            if (braceCount === 0) {
              lastBrace = i;
              break;
            }
          }
        }

        if (lastBrace !== -1) {
          cleanContent = cleanContent.substring(firstBrace, lastBrace + 1);
        }
      }

      return JSON.parse(cleanContent);
    };

    // Run both AI analyses in parallel
    const [aiResponse, productMatchResponse] = await Promise.all([
      openai.chat.completions.create({
        model: 'gpt-4-1106-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an expert procurement analyst. Provide detailed, practical analysis comparing tender requirements with company capabilities. CRITICAL: Return ONLY valid JSON with no additional commentary, explanations, or text before or after the JSON object. Your entire response must be parseable as JSON.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      }),

      // Only run product matching if products exist
      products.data && products.data.length > 0 ? openai.chat.completions.create({
        model: 'gpt-4-1106-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a technical product matching expert. Analyze product specifications against tender requirements and return matching products with precise technical justifications. CRITICAL: Return ONLY valid JSON with no additional commentary. Your entire response must be parseable as JSON.'
          },
          {
            role: 'user',
            content: productMatchingPrompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      }) : Promise.resolve(null)
    ]);

    // Clean and parse the main analysis JSON response
    const content = aiResponse.choices[0]?.message?.content || '{}';
    const aiAnalysis = cleanAndParseJSON(content);

    // Parse product matching response if available
    let productMatching = { matchingProducts: [] };
    if (productMatchResponse) {
      try {
        const productContent = productMatchResponse.choices[0]?.message?.content || '{}';
        productMatching = cleanAndParseJSON(productContent) as { matchingProducts: unknown[] };
      } catch (error) {
        console.error('Error parsing product matching response:', error);
        console.error('Product content:', productMatchResponse.choices[0]?.message?.content?.substring(0, 500));
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