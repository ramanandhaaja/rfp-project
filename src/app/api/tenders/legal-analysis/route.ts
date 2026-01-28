import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserById } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key"
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

interface LegalComplianceRule {
  id: string;
  article_number: string;
  title: string;
  description: string;
  category: string;
  trigger_keywords: string[];
  compliance_requirements: string[];
  risk_level: string;
}

interface LegalAnalysisResult {
  // Risk Summary
  risk_matrix: Array<{
    category: string;
    risk: string;
    price_impact: string;
    priority: number; // 1-5
  }>;
  total_risk_premium: string; // e.g., "8-12%"

  // Detailed Findings (10 categories)
  detailed_findings: Array<{
    category: string;
    provisions_found: string[];
    market_standard: string;
    deviation: string;
    financial_impact: string;
    recommendation: 'Accept' | 'Negotiate' | 'Dealbreaker';
  }>;

  // Recommendations
  nvi_questions: string[];  // Must-Haves for Nota van Inlichtingen
  negotiation_points: string[];
  pricing_structure: {
    base_price_note: string;
    risk_premium_warranties: string;
    risk_premium_penalties: string;
    risk_premium_other: string;
    total_recommended_margin: string;
  };

  // Dealbreakers
  dealbreakers: string[];

  // Backwards compatibility fields
  compliance_status: 'Compliant' | 'Partially Compliant' | 'Non-Compliant' | 'Requires Review';
  compliance_score: number;
  key_risks: string[];
  action_items: string[];
}

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

    const { tenderId } = await request.json();

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

    // Check for existing legal analysis
    const { data: existingAnalysis } = await supabase
      .from('legal_analysis')
      .select('*')
      .eq('tender_id', tenderId)
      .eq('user_id', user.id)
      .single();

    if (existingAnalysis) {
      return NextResponse.json({
        success: true,
        analysis: existingAnalysis.analysis_result,
        isFromCache: true,
        analyzedAt: existingAnalysis.created_at,
      });
    }

    // Get all legal compliance rules
    const { data: legalRules, error: rulesError } = await supabase
      .from('legal_compliance_rules')
      .select('*');

    if (rulesError) {
      console.error('Error fetching legal rules:', rulesError);
      return NextResponse.json({ error: 'Failed to fetch legal rules' }, { status: 500 });
    }

    // Analyze tender content against legal rules
    const tenderContent = [
      tender.title,
      tender.description,
      JSON.stringify(tender.requirements),
      JSON.stringify(tender.specifications),
      JSON.stringify(tender.evaluation_criteria),
      JSON.stringify(tender.deadlines),
    ].join(' ').toLowerCase();

    // Find applicable rules based on keyword matching
    const applicableRules = legalRules?.filter((rule: LegalComplianceRule) => {
      return rule.trigger_keywords.some(keyword =>
        tenderContent.includes(keyword.toLowerCase())
      );
    }) || [];

    // Generate AI-enhanced legal analysis with comprehensive 10-category framework
    const legalAnalysisPrompt = `
You are a legal analyst specializing in Dutch public procurement for the lighting and fixtures sector.
Analyze this tender document and deliver a structured report identifying all legal and commercial risks that impact pricing.
Compare against UAV 2012, UAV-GC 2005, ARVODI standards.

TENDER INFORMATION:
Title: ${tender.title}
Description: ${tender.description}
Requirements: ${JSON.stringify(tender.requirements, null, 2)}
Specifications: ${JSON.stringify(tender.specifications, null, 2)}
Evaluation Criteria: ${JSON.stringify(tender.evaluation_criteria, null, 2)}
Deadlines: ${JSON.stringify(tender.deadlines, null, 2)}

APPLICABLE LEGAL ARTICLES FROM DATABASE:
${applicableRules.map(rule => `
Article: ${rule.article_number}
Title: ${rule.title}
Category: ${rule.category}
Requirements: ${rule.compliance_requirements.join(', ')}
Risk Level: ${rule.risk_level}
`).join('\n')}

Analyze the following 10 CATEGORIES thoroughly:

1. WARRANTY PROVISIONS
   - Product warranty (standard is 2-5 years for LED fixtures)
   - Installation warranty
   - Performance warranty (lumen maintenance, color stability)
   - Extended warranty requirements
   - Warranty exclusions and conditions

2. LIABILITY & INDEMNIFICATION
   - Liability caps (market standard: contract value or 2x annual fee)
   - Indemnification clauses
   - Insurance requirements (CAR, AVB, professional liability)
   - Consequential damages
   - IP indemnification

3. PENALTY CLAUSES & DEDUCTIONS
   - Delay penalties (Staat der Nederlanden: max 0.5%/week, 5% cap)
   - Performance penalties
   - Quality deductions
   - Escalation mechanisms
   - Force majeure provisions

4. DELIVERY TERMS
   - Incoterms (DDP standard for NL municipal)
   - Delivery timelines and milestones
   - Partial deliveries acceptance
   - Stock holding requirements
   - Installation responsibilities

5. PAYMENT TERMS
   - Payment periods (30 days standard, watch for 60-90)
   - Invoicing requirements
   - Retention money (5-10% is typical)
   - Price indexation (CBS indices)
   - Pre-financing requirements

6. CONTRACT DURATION & TERMINATION
   - Initial term and extensions
   - Notice periods
   - Termination for convenience
   - Transition-out obligations
   - Exit costs

7. INTELLECTUAL PROPERTY
   - Design ownership
   - License terms for software/firmware
   - Documentation rights
   - Open-source requirements

8. COMPLIANCE & CERTIFICATIONS
   - CE marking requirements
   - ENEC/KEMA certification
   - Sustainability certifications (BREEAM, Cradle-to-Cradle)
   - Circular economy requirements
   - SROI/Social Return obligations

9. SERVICE LEVEL AGREEMENTS
   - Response times (emergency, standard)
   - Availability guarantees
   - Maintenance requirements
   - Reporting obligations
   - Help desk requirements

10. SPECIAL PROVISIONS
    - Most Favored Customer (MFC) clauses
    - Benchmark clauses
    - Audit rights
    - Supply chain transparency
    - GDPR/data processing requirements

Provide analysis in this exact JSON format:
{
  "risk_matrix": [
    {
      "category": "Category name",
      "risk": "Brief risk description",
      "price_impact": "+X% to +Y%",
      "priority": 1-5
    }
  ],
  "total_risk_premium": "X-Y%",
  "detailed_findings": [
    {
      "category": "Category name (one of the 10 above)",
      "provisions_found": ["Specific provision 1", "Specific provision 2"],
      "market_standard": "What is typical in the market",
      "deviation": "How this tender deviates from standard",
      "financial_impact": "Estimated cost impact",
      "recommendation": "Accept/Negotiate/Dealbreaker"
    }
  ],
  "nvi_questions": [
    "Question 1 for Nota van Inlichtingen to clarify risks",
    "Question 2 for Nota van Inlichtingen"
  ],
  "negotiation_points": [
    "Key point 1 to negotiate",
    "Key point 2 to negotiate"
  ],
  "pricing_structure": {
    "base_price_note": "Note about base pricing approach",
    "risk_premium_warranties": "+X% for extended/non-standard warranties",
    "risk_premium_penalties": "+X% for penalty exposure",
    "risk_premium_other": "+X% for other risks",
    "total_recommended_margin": "X-Y% total recommended margin above base"
  },
  "dealbreakers": [
    "Critical provision 1 that makes participation inadvisable",
    "Critical provision 2"
  ],
  "compliance_status": "Compliant/Partially Compliant/Non-Compliant/Requires Review",
  "compliance_score": 0-100,
  "key_risks": ["Summary risk 1", "Summary risk 2"],
  "action_items": ["Action 1", "Action 2"]
}

IMPORTANT:
- Be specific about financial impacts where possible
- Flag any provisions that deviate significantly from UAV 2012 or market standards
- Prioritize risks by their actual price impact
- For dealbreakers, only include truly critical issues that would make bidding inadvisable
- Always return valid JSON
`;

    const aiResponse = await openai.chat.completions.create({
      model: 'gpt-4-1106-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a legal analyst specializing in Dutch public procurement for the lighting and fixtures sector. Analyze tender documents and deliver structured reports identifying all legal and commercial risks that impact pricing. Compare against UAV 2012, UAV-GC 2005, ARVODI standards. Always return valid JSON.'
        },
        {
          role: 'user',
          content: legalAnalysisPrompt
        }
      ],
      temperature: 0.1,
      max_tokens: 4000,
    });

    // Parse AI response
    let content = aiResponse.choices[0]?.message?.content || '{}';
    content = content.trim();

    // Remove markdown code blocks if present
    if (content.startsWith('```json')) {
      content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (content.startsWith('```')) {
      content = content.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    let legalAnalysis: LegalAnalysisResult;

    try {
      legalAnalysis = JSON.parse(content);
    } catch (parseError) {
      console.error('Error parsing legal analysis JSON:', parseError);

      // Fallback analysis based on applicable rules
      legalAnalysis = {
        risk_matrix: applicableRules.map(rule => ({
          category: rule.category,
          risk: `Review required for ${rule.title}`,
          price_impact: 'TBD',
          priority: rule.risk_level === 'High' ? 5 : rule.risk_level === 'Medium' ? 3 : 1
        })),
        total_risk_premium: 'TBD - Manual review required',
        detailed_findings: [{
          category: 'General Review',
          provisions_found: ['Unable to parse tender provisions automatically'],
          market_standard: 'UAV 2012 / ARVODI standards',
          deviation: 'Manual review required',
          financial_impact: 'Unknown - requires manual assessment',
          recommendation: 'Negotiate' as const
        }],
        nvi_questions: ['Request clarification on contract terms and conditions'],
        negotiation_points: ['Review all contract terms against market standards'],
        pricing_structure: {
          base_price_note: 'Manual assessment required',
          risk_premium_warranties: 'TBD',
          risk_premium_penalties: 'TBD',
          risk_premium_other: 'TBD',
          total_recommended_margin: 'TBD - Complete manual review first'
        },
        dealbreakers: [],
        compliance_status: 'Requires Review',
        compliance_score: 75,
        key_risks: ['Manual review required for complete compliance assessment'],
        action_items: ['Conduct detailed legal review with procurement specialist']
      };
    }

    // Save legal analysis results
    const { error: saveError } = await supabase
      .from('legal_analysis')
      .insert({
        user_id: user.id,
        tender_id: tenderId,
        analysis_result: legalAnalysis,
        applicable_rules: applicableRules.map(rule => rule.id),
        created_at: new Date().toISOString(),
      });

    if (saveError) {
      console.error('Error saving legal analysis:', saveError);
      // Continue anyway, don't fail the request
    }

    return NextResponse.json({
      success: true,
      analysis: legalAnalysis,
      applicableRulesCount: applicableRules.length,
      isFromCache: false,
      analyzedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error in legal analysis:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}