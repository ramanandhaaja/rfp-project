import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserById } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
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
  compliance_status: 'Compliant' | 'Partially Compliant' | 'Non-Compliant' | 'Requires Review';
  applicable_articles: Array<{
    article: string;
    title: string;
    status: 'Met' | 'Partially Met' | 'Not Met' | 'Not Applicable' | 'Requires Review';
    requirements: string[];
    recommendations: string[];
    risk_level: string;
  }>;
  compliance_score: number;
  key_risks: string[];
  action_items: string[];
  legal_recommendations: string[];
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

    // Generate AI-enhanced legal analysis
    const legalAnalysisPrompt = `
As a Dutch procurement law expert, analyze this tender for legal compliance with the Aanbestedingswet.

TENDER INFORMATION:
Title: ${tender.title}
Description: ${tender.description}
Requirements: ${JSON.stringify(tender.requirements, null, 2)}
Specifications: ${JSON.stringify(tender.specifications, null, 2)}
Evaluation Criteria: ${JSON.stringify(tender.evaluation_criteria, null, 2)}
Deadlines: ${JSON.stringify(tender.deadlines, null, 2)}

APPLICABLE LEGAL ARTICLES:
${applicableRules.map(rule => `
Article: ${rule.article_number}
Title: ${rule.title}
Category: ${rule.category}
Requirements: ${rule.compliance_requirements.join(', ')}
Risk Level: ${rule.risk_level}
`).join('\n')}

Provide legal compliance analysis in JSON format:
{
  "compliance_status": "Compliant/Partially Compliant/Non-Compliant/Requires Review",
  "applicable_articles": [
    {
      "article": "Art. X.XX",
      "title": "Article title",
      "status": "Met/Partially Met/Not Met/Not Applicable",
      "requirements": ["requirement 1", "requirement 2"],
      "recommendations": ["action 1", "action 2"],
      "risk_level": "High/Medium/Low"
    }
  ],
  "compliance_score": 85,
  "key_risks": ["risk 1", "risk 2"],
  "action_items": ["action 1", "action 2"],
  "legal_recommendations": ["recommendation 1", "recommendation 2"]
}

Focus on Dutch procurement law compliance and practical recommendations.
`;

    const aiResponse = await openai.chat.completions.create({
      model: 'gpt-4-1106-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert in Dutch procurement law (Aanbestedingswet). Provide detailed legal compliance analysis with specific article references. Always return valid JSON.'
        },
        {
          role: 'user',
          content: legalAnalysisPrompt
        }
      ],
      temperature: 0.1,
      max_tokens: 2000,
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
        compliance_status: 'Requires Review',
        applicable_articles: applicableRules.map(rule => ({
          article: rule.article_number,
          title: rule.title,
          status: 'Requires Review' as const,
          requirements: rule.compliance_requirements,
          recommendations: ['Review tender requirements against this article'],
          risk_level: rule.risk_level
        })),
        compliance_score: 75,
        key_risks: ['Manual review required for complete compliance assessment'],
        action_items: ['Conduct detailed legal review with procurement specialist'],
        legal_recommendations: ['Ensure all applicable legal requirements are met before submission']
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