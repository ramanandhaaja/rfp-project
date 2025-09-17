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

interface NvIQuestion {
  lens: string;
  issue: string;
  question: string;
  koRisk: number;
  meatImpact: number;
  euroImpact: number;
  timeImpact: number;
  evidenceRisk: number;
  priorityScore: number;
  justification: string;
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

    // Fetch tender document and analysis
    const [tenderResponse, analysisResponse] = await Promise.all([
      supabase
        .from('tender_documents')
        .select('*')
        .eq('id', tenderId)
        .eq('user_id', user.id)
        .single(),
      supabase
        .from('tender_analysis')
        .select('*')
        .eq('tender_id', tenderId)
        .eq('user_id', user.id)
        .single()
    ]);

    if (tenderResponse.error || !tenderResponse.data) {
      return NextResponse.json({ error: 'Tender not found' }, { status: 404 });
    }

    if (analysisResponse.error || !analysisResponse.data) {
      return NextResponse.json({ error: 'Tender analysis not found. Please analyze the tender first.' }, { status: 404 });
    }

    const tender = tenderResponse.data;
    const analysis = analysisResponse.data;

    // Generate NvI questions using specialized agent
    const nviQuestions = await generateNvIQuestions(tender, analysis);

    // Save NvI questions to database
    const questionsToSave = nviQuestions.map(q => ({
      user_id: user.id,
      tender_id: tenderId,
      lens: q.lens,
      issue: q.issue,
      question: q.question,
      priority_score: q.priorityScore,
      ko_risk: q.koRisk,
      meat_impact: q.meatImpact,
      euro_impact: q.euroImpact,
      time_impact: q.timeImpact,
      evidence_risk: q.evidenceRisk,
      status: 'draft'
    }));

    // First, delete existing questions for this tender to avoid duplicates
    await supabase
      .from('nvi_questions')
      .delete()
      .eq('user_id', user.id)
      .eq('tender_id', tenderId);

    // Insert new questions
    const { data: savedQuestions, error: saveError } = await supabase
      .from('nvi_questions')
      .insert(questionsToSave)
      .select();

    if (saveError) {
      console.error('Error saving NvI questions:', saveError);
      return NextResponse.json({ error: 'Failed to save NvI questions' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      questions: nviQuestions,
      saved: savedQuestions?.length || 0
    });

  } catch (error) {
    console.error('Error generating NvI questions:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function generateNvIQuestions(tender: any, analysis: any): Promise<NvIQuestion[]> {
  const prompt = `
You are an expert Dutch procurement consultant specializing in Nota van Inlichtingen (NvI) questions.

Analyze this tender and generate strategic clarification questions based on the 12-lens framework.

TENDER INFORMATION:
Title: ${tender.title}
Requirements: ${JSON.stringify(tender.requirements)}
Specifications: ${JSON.stringify(tender.specifications)}
Evaluation Criteria: ${JSON.stringify(tender.evaluation_criteria)}
Budget: ${JSON.stringify(tender.budget_info)}
Deadlines: ${JSON.stringify(tender.deadlines)}

ANALYSIS RESULTS:
KO Risks: ${analysis.relevant_companies?.map((c: any) => c.name).join(', ') || 'None identified'}
Ambiguities: ${analysis.gaps?.join(', ') || 'None identified'}
Contradictions: ${analysis.risks?.join(', ') || 'None identified'}
Missing Info: ${analysis.action_items?.join(', ') || 'None identified'}

Generate 8-12 strategic NvI questions covering these lenses:
1. Legal & Process (avoiding formal errors)
2. Scope & Lots (what is/isn't included)
3. Knock-outs & Suitability (exclusion grounds, certificates)
4. Evaluation Method (PKV/MEAT formula)
5. Pricing Mechanism & Quantities (weighting, indexation)
6. Technical Requirements (measurement, tolerances)
7. Calculation Models & Tools (required software)
8. Delivery, SLA & Penalties (acceptance, penalty curves)
9. Sustainability, SROI & RBC (thresholds, proof)
10. Contract Conditions (liability, warranty, IP)
11. Privacy/IP & Data (ownership, DPIA requirements)
12. Version Control & Communication (valid versions, platform)

For each question, score 0-3 for:
- koRisk: Risk of disqualification if unclear
- meatImpact: Impact on quality scoring
- euroImpact: Financial impact on bid
- timeImpact: Impact on project timeline
- evidenceRisk: Difficulty proving compliance

Priority questions have totalScore ≥ 6.

Return JSON array:
[
  {
    "lens": "Legal & Process",
    "issue": "Ambiguous deadline for technical documentation",
    "question": "Can the authority clarify whether technical documentation must be submitted by the main deadline or can be provided during the technical evaluation phase?",
    "koRisk": 3,
    "meatImpact": 1,
    "euroImpact": 2,
    "timeImpact": 2,
    "evidenceRisk": 1,
    "priorityScore": 9,
    "justification": "Critical for avoiding disqualification due to late submission"
  }
]

Focus on strategic questions that:
- Reduce disqualification risk
- Clarify evaluation methodology
- Address technical ambiguities
- Confirm equivalent certifications
- Clarify financial terms
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4-1106-preview',
    messages: [
      {
        role: 'system',
        content: 'You are a Dutch procurement expert specializing in strategic tender analysis and NvI question formulation. Generate practical, high-impact clarification questions.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.2,
    max_tokens: 4000
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  let cleanContent = content.trim();
  if (cleanContent.startsWith('```json')) {
    cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleanContent.startsWith('```')) {
    cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  // Remove control characters (except newlines, tabs, and carriage returns which are valid in JSON strings)
  cleanContent = cleanContent.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');

  try {
    return JSON.parse(cleanContent);
  } catch (error) {
    console.error('JSON Parse Error in NvI generation:', error);
    console.error('Problematic JSON string:', cleanContent.substring(0, 200) + '...');
    throw new Error('Failed to parse AI response for NvI questions');
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

    const { searchParams } = new URL(request.url);
    const tenderId = searchParams.get('tenderId');

    if (!tenderId) {
      return NextResponse.json({ error: 'Tender ID is required' }, { status: 400 });
    }

    // Fetch NvI questions for the tender
    const { data: questions, error } = await supabase
      .from('nvi_questions')
      .select('*')
      .eq('user_id', user.id)
      .eq('tender_id', tenderId)
      .order('priority_score', { ascending: false });

    if (error) {
      console.error('Error fetching NvI questions:', error);
      return NextResponse.json({ error: 'Failed to fetch NvI questions' }, { status: 500 });
    }

    return NextResponse.json({ questions: questions || [] });

  } catch (error) {
    console.error('Error fetching NvI questions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}