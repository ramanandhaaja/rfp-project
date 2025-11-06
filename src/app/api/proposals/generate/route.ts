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

interface ProposalSection {
  title: string;
  content: string;
  type: 'executive_summary' | 'company_intro' | 'methodology' | 'organisation' | 'risk_management' | 'sustainability' | 'why_choose_us';
}

interface GeneratedProposal {
  title: string;
  sections: ProposalSection[];
  executiveSummaryTable: Array<{
    requirement: string;
    solution: string;
    benefit: string;
  }>;
  methodologyPhases: Array<{
    phase: string;
    activities: string;
    deliverables: string;
  }>;
  teamStructure: Array<{
    role: string;
    profile: string;
    responsibility: string;
  }>;
  riskMatrix: Array<{
    risk: string;
    impact: string;
    mitigation: string;
  }>;
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

    // Fetch user's companies and products
    const [companiesResponse, productsResponse] = await Promise.all([
      supabase
        .from('companies')
        .select('*')
        .eq('user_id', user.id),
      supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id)
    ]);

    const tender = tenderResponse.data;
    const analysis = analysisResponse.data;
    const companies = companiesResponse.data || [];
    const products = productsResponse.data || [];

    // Multi-agent proposal generation using different specialized agents
    const proposalAgents = {
      companyIntroAgent: generateCompanyIntroduction,
      executiveSummaryAgent: generateExecutiveSummary,
      methodologyAgent: generateMethodology,
      organizationAgent: generateOrganization,
      riskManagementAgent: generateRiskManagement,
      sustainabilityAgent: generateSustainability,
      differentiationAgent: generateWhyChooseUs
    };

    // Execute all agents in parallel for efficiency
    const [
      companyIntro,
      executiveSummary,
      methodology,
      organization,
      riskManagement,
      sustainability,
      whyChooseUs
    ] = await Promise.all([
      proposalAgents.companyIntroAgent(tender, analysis, companies, products),
      proposalAgents.executiveSummaryAgent(tender, analysis, companies, products),
      proposalAgents.methodologyAgent(tender, analysis, companies, products),
      proposalAgents.organizationAgent(tender, analysis, companies, products),
      proposalAgents.riskManagementAgent(tender, analysis, companies, products),
      proposalAgents.sustainabilityAgent(tender, analysis, companies, products),
      proposalAgents.differentiationAgent(tender, analysis, companies, products)
    ]);

    const proposal: GeneratedProposal = {
      title: `Proposal for ${tender.title}`,
      sections: [
        { title: 'Company Introduction', content: companyIntro.content, type: 'company_intro' },
        { title: 'Executive Summary', content: executiveSummary.content, type: 'executive_summary' },
        { title: 'Methodology & Execution', content: methodology.content, type: 'methodology' },
        { title: 'Organisation & Governance', content: organization.content, type: 'organisation' },
        { title: 'Risk Management', content: riskManagement.content, type: 'risk_management' },
        { title: 'Sustainability & Innovation', content: sustainability.content, type: 'sustainability' },
        { title: 'Why Choose Us', content: whyChooseUs.content, type: 'why_choose_us' }
      ],
      executiveSummaryTable: executiveSummary.table,
      methodologyPhases: methodology.phases,
      teamStructure: organization.team,
      riskMatrix: riskManagement.risks
    };

    // Save proposal to database
    const { data: savedProposal, error: saveError } = await supabase
      .from('proposals')
      .upsert({
        user_id: user.id,
        tender_id: tenderId,
        title: proposal.title,
        content: proposal,
        status: 'draft',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,tender_id'
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving proposal:', saveError);
      // Continue anyway, return the generated proposal
    }

    return NextResponse.json({
      success: true,
      proposal,
      savedProposal
    });

  } catch (error) {
    console.error('Error generating proposal:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Agent 1: Company Introduction Agent
async function generateCompanyIntroduction(tender: any, analysis: any, companies: any[], products: any[]) {
  const prompt = `
Generate a compelling company introduction in storytelling style for a Dutch tender proposal.

TENDER: ${tender.title}
REQUIREMENTS: ${JSON.stringify(tender.requirements)}
COMPANIES: ${companies.map(c => `${c.name}: ${c.description}, Capabilities: ${c.capabilities?.join(', ')}`).join('\n')}

Create a professional introduction following this structure:
- Who we are (background, experience, credibility)
- What we do (specializations, certifications, track record)
- Our Mission (value proposition aligned with tender requirements)

Write in professional Dutch business style, emphasizing EU compliance and public sector experience.

IMPORTANT: Return ONLY valid JSON in this exact format. Do not include any markdown, explanations, or other text:
{ "content": "introduction text here" }

Ensure all quotes inside the content are properly escaped with backslashes.
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4-1106-preview',
    messages: [
      { role: 'system', content: 'You are a proposal writing expert specializing in Dutch public procurement. Write compelling, professional content.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.3,
    max_tokens: 1000
  });

  return safeJsonParse(cleanJsonResponse(response.choices[0]?.message?.content || '{}'));
}

// Agent 2: Executive Summary Agent
async function generateExecutiveSummary(tender: any, analysis: any, companies: any[], products: any[]) {
  const prompt = `
Generate an executive summary table for Dutch tender proposal.

TENDER REQUIREMENTS: ${JSON.stringify(tender.requirements)}
EVALUATION CRITERIA: ${JSON.stringify(tender.evaluation_criteria)}
ANALYSIS STRENGTHS: ${analysis.strengths?.join(', ')}
PRODUCTS: ${products.map(p => `${p.name}: ${p.description}`).join('\n')}

Create a table with 5-7 key requirements mapped to solutions and benefits.
Include: Sustainability, Compliance, Delivery, Innovation, Cost efficiency

IMPORTANT: Return ONLY valid JSON in this exact format. Do not include any markdown, explanations, or other text:
{
  "content": "executive summary introduction text",
  "table": [
    {"requirement": "key requirement", "solution": "our solution", "benefit": "client benefit"}
  ]
}

Ensure all quotes inside the content are properly escaped with backslashes.
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4-1106-preview',
    messages: [
      { role: 'system', content: 'You are an expert in creating executive summaries for public procurement proposals.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.2,
    max_tokens: 1500
  });

  return safeJsonParse(cleanJsonResponse(response.choices[0]?.message?.content || '{}'));
}

// Agent 3: Methodology Agent
async function generateMethodology(tender: any, analysis: any, companies: any[], products: any[]) {
  const prompt = `
Generate methodology and execution plan for Dutch tender.

TENDER SCOPE: ${tender.description}
DEADLINES: ${JSON.stringify(tender.deadlines)}
TECHNICAL REQUIREMENTS: ${JSON.stringify(tender.specifications)}

Create a phased approach with 4-5 phases:
1. Mobilisation
2. Design
3. Implementation
4. Handover
5. (Optional) Operations

IMPORTANT: Return ONLY valid JSON in this exact format. Do not include any markdown, explanations, or other text:
{
  "content": "methodology introduction text",
  "phases": [
    {"phase": "phase name", "activities": "key activities", "deliverables": "main deliverables"}
  ]
}

Ensure all quotes inside the content are properly escaped with backslashes.
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4-1106-preview',
    messages: [
      { role: 'system', content: 'You are a project methodology expert for public sector implementations.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.2,
    max_tokens: 1200
  });

  return safeJsonParse(cleanJsonResponse(response.choices[0]?.message?.content || '{}'));
}

// Agent 4: Organization Agent
async function generateOrganization(tender: any, analysis: any, companies: any[], products: any[]) {
  const prompt = `
Generate organization and governance structure for Dutch tender proposal.

COMPANY SIZE: ${companies[0]?.employee_count || 'Not specified'}
CAPABILITIES: ${companies.map(c => c.capabilities?.join(', ')).join('; ')}
PROJECT COMPLEXITY: Based on tender requirements

Create team structure with 4-6 key roles:
- Project Manager
- Compliance Officer (for GDPR/NIS2)
- Technical Lead
- Service Desk Lead
- Additional specialized roles based on requirements

IMPORTANT: Return ONLY valid JSON in this exact format. Do not include any markdown, explanations, or other text:
{
  "content": "organization introduction text",
  "team": [
    {"role": "role title", "profile": "experience/profile", "responsibility": "key responsibilities"}
  ]
}

Ensure all quotes inside the content are properly escaped with backslashes.
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4-1106-preview',
    messages: [
      { role: 'system', content: 'You are an organizational design expert for public sector projects.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.2,
    max_tokens: 1000
  });

  return safeJsonParse(cleanJsonResponse(response.choices[0]?.message?.content || '{}'));
}

// Agent 5: Risk Management Agent
async function generateRiskManagement(tender: any, analysis: any, companies: any[], products: any[]) {
  const prompt = `
Generate risk management section for Dutch tender proposal.

IDENTIFIED RISKS: ${analysis.risks?.join(', ')}
GAPS: ${analysis.gaps?.join(', ')}
TENDER RISKS: ${analysis.relevant_risks || 'Supply delays, certification issues, timeline pressure'}

Create 4-6 key risks with mitigation strategies:
- Supply delays
- Missing certificates
- Installation delays
- Compliance risks
- Technical risks

IMPORTANT: Return ONLY valid JSON in this exact format. Do not include any markdown, explanations, or other text:
{
  "content": "risk management introduction text",
  "risks": [
    {"risk": "risk description", "impact": "High/Medium/Low", "mitigation": "mitigation strategy"}
  ]
}

Ensure all quotes inside the content are properly escaped with backslashes.
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4-1106-preview',
    messages: [
      { role: 'system', content: 'You are a risk management expert for public procurement projects.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.2,
    max_tokens: 1000
  });

  return safeJsonParse(cleanJsonResponse(response.choices[0]?.message?.content || '{}'));
}

// Agent 6: Sustainability Agent
async function generateSustainability(tender: any, analysis: any, companies: any[], products: any[]) {
  const prompt = `
Generate sustainability and innovation section for Dutch tender.

SUSTAINABILITY REQUIREMENTS: ${JSON.stringify(tender.requirements?.social)}
ENVIRONMENTAL FOCUS: ${tender.categories?.join(', ')}
INNOVATION OPPORTUNITIES: ${analysis.opportunities?.join(', ')}

Focus on:
- EU Green Deal compliance
- Circular economy principles
- CO2 reduction
- Future-proof technology
- Innovation beyond requirements

IMPORTANT: Return ONLY valid JSON in this exact format. Do not include any markdown, explanations, or other text:
{ "content": "sustainability and innovation content text" }

Ensure all quotes inside the content are properly escaped with backslashes.
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4-1106-preview',
    messages: [
      { role: 'system', content: 'You are a sustainability and innovation expert for Dutch public procurement.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.3,
    max_tokens: 800
  });

  return safeJsonParse(cleanJsonResponse(response.choices[0]?.message?.content || '{}'));
}

// Agent 7: Differentiation Agent
async function generateWhyChooseUs(tender: any, analysis: any, companies: any[], products: any[]) {
  const prompt = `
Generate "Why Choose Us" section for Dutch tender proposal.

STRENGTHS: ${analysis.strengths?.join(', ')}
COMPANY ACHIEVEMENTS: ${companies.map(c => c.achievements?.join(', ')).join('; ')}
COMPETITIVE ADVANTAGES: ${analysis.opportunities?.join(', ')}

Create 4-5 compelling differentiators:
- Track record with municipalities
- Compliance credentials
- Communication approach
- Proven cost savings
- Additional unique value propositions

IMPORTANT: Return ONLY valid JSON in this exact format. Do not include any markdown, explanations, or other text:
{ "content": "why choose us content text" }

Ensure all quotes inside the content are properly escaped with backslashes.
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4-1106-preview',
    messages: [
      { role: 'system', content: 'You are a competitive positioning expert for public sector proposals.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.3,
    max_tokens: 800
  });

  return safeJsonParse(cleanJsonResponse(response.choices[0]?.message?.content || '{}'));
}

function cleanJsonResponse(content: string): string {
  let cleaned = content.trim();

  // Remove markdown code blocks
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  // Aggressive but safe cleaning
  cleaned = cleaned
    // Remove control characters that break JSON
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
    // Replace literal newlines in string values with escaped newlines
    .replace(/(?<="[^"]*?)\n(?=[^"]*?")/g, '\\n')
    // Replace literal tabs in string values with escaped tabs
    .replace(/(?<="[^"]*?)\t(?=[^"]*?")/g, '\\t')
    // Replace literal carriage returns in string values with escaped returns
    .replace(/(?<="[^"]*?)\r(?=[^"]*?")/g, '\\r')
    // Clean up any remaining unescaped newlines outside of strings
    .replace(/\n(?![^"]*"[^"]*:)/g, ' ')
    .replace(/\r(?![^"]*"[^"]*:)/g, ' ')
    .replace(/\t(?![^"]*"[^"]*:)/g, ' ')
    // Clean up multiple spaces
    .replace(/\s+/g, ' ')
    .trim();

  // If the regex lookbehind doesn't work, use a simpler approach
  if (!cleaned.startsWith('{')) {
    // Fallback: just remove all problematic characters
    cleaned = content.trim()
      .replace(/^```json\s*/, '').replace(/\s*```$/, '')
      .replace(/^```\s*/, '').replace(/\s*```$/, '')
      .replace(/[\x00-\x1F\x7F-\x9F]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  return cleaned;
}

function safeJsonParse(jsonString: string, fallback: any = {}): any {
  // First try to fix the JSON before parsing
  let fixedJson = jsonString;

  try {
    // Simple but effective JSON fixing
    fixedJson = fixedJson
      // Replace unescaped newlines with escaped ones
      .replace(/([^\\])\n/g, '$1\\n')
      // Replace unescaped tabs with escaped ones
      .replace(/([^\\])\t/g, '$1\\t')
      // Replace unescaped carriage returns
      .replace(/([^\\])\r/g, '$1\\r')
      // Remove trailing commas
      .replace(/,(\s*[}\]])/g, '$1')
      // Fix any leading newlines
      .replace(/^\n/, '\\n')
      .replace(/^\t/, '\\t');

    return JSON.parse(fixedJson);
  } catch (firstError) {
    // If regex fixes failed, try simpler approach
    try {
      // More aggressive cleaning
      fixedJson = jsonString
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t')
        .replace(/"/g, '"') // normalize quotes
        .replace(/"/g, '"')
        .replace(/'/g, "'"); // normalize single quotes

      return JSON.parse(fixedJson);
    } catch (secondError) {
      console.error('JSON Parse Error (after fixes):', secondError);
      console.error('Problematic JSON string:', jsonString.substring(0, 500) + '...');

      // Manual extraction as last resort
      try {
        const result: any = {};

        // Extract content field - handle multiline content better
        const contentMatch = jsonString.match(/"content":\s*"([\s\S]*?)(?=",\s*"|\n\s*"|\n\s*})/);
        if (contentMatch) {
          result.content = contentMatch[1]
            .replace(/\\n/g, '\n')
            .replace(/\\t/g, '\t')
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\')
            .trim();
        } else {
          // Fallback: extract everything between first quotes after "content":
          const fallbackMatch = jsonString.match(/"content":\s*"([^"]+)/);
          if (fallbackMatch) {
            result.content = fallbackMatch[1].trim();
          }
        }

        // Extract table array if it exists
        const tableMatch = jsonString.match(/"table":\s*\[([\s\S]*?)\]/);
        if (tableMatch) {
          try {
            const tableStr = '[' + tableMatch[1] + ']';
            const fixedTableStr = tableStr.replace(/\n/g, ' ').replace(/\t/g, ' ');
            result.table = JSON.parse(fixedTableStr);
          } catch (e) {
            result.table = [];
          }
        }

        // Extract phases array if it exists
        const phasesMatch = jsonString.match(/"phases":\s*\[([\s\S]*?)\]/);
        if (phasesMatch) {
          try {
            const phasesStr = '[' + phasesMatch[1] + ']';
            const fixedPhasesStr = phasesStr.replace(/\n/g, ' ').replace(/\t/g, ' ');
            result.phases = JSON.parse(fixedPhasesStr);
          } catch (e) {
            result.phases = [];
          }
        }

        // Extract team array if it exists
        const teamMatch = jsonString.match(/"team":\s*\[([\s\S]*?)\]/);
        if (teamMatch) {
          try {
            const teamStr = '[' + teamMatch[1] + ']';
            const fixedTeamStr = teamStr.replace(/\n/g, ' ').replace(/\t/g, ' ');
            result.team = JSON.parse(fixedTeamStr);
          } catch (e) {
            result.team = [];
          }
        }

        // Extract risks array if it exists
        const risksMatch = jsonString.match(/"risks":\s*\[([\s\S]*?)\]/);
        if (risksMatch) {
          try {
            const risksStr = '[' + risksMatch[1] + ']';
            const fixedRisksStr = risksStr.replace(/\n/g, ' ').replace(/\t/g, ' ');
            result.risks = JSON.parse(fixedRisksStr);
          } catch (e) {
            result.risks = [];
          }
        }

        // Return what we managed to extract
        if (Object.keys(result).length > 0) {
          console.log('Successfully extracted fields:', Object.keys(result));
          return result;
        }

        // If nothing was extracted, provide a basic fallback
        console.log('No fields extracted, using basic fallback');
        return {
          content: "Content extraction failed, but proposal generation completed.",
          table: [],
          phases: [],
          team: [],
          risks: []
        };

      } catch (extractError) {
        console.error('Content extraction also failed:', extractError);
      }

      return fallback;
    }
  }
}