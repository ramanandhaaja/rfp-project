import pdf from 'pdf-parse-fork';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export interface QuestionPriority {
  lens: string;
  issue: string;
  koRisk: number;
  meatImpact: number;
  euroImpact: number;
  timeImpact: number;
  evidenceRisk: number;
  totalScore: number;
  suggestedQuestion: string;
}

export interface TenderAnalysis {
  title: string;
  referenceNumber: string;
  tenderType: string;
  description: string;
  requirements: {
    scope: string;
    quantities: string;
    technical: string;
    social: string;
    certificates: string;
    financial: string;
  };
  specifications: {
    products: string;
    standards: string;
    tools: string;
    delivery: string;
  };
  evaluationCriteria: {
    price: string;
    quality: string;
    formula: string;
    tieBreakers: string;
  };
  budgetInfo: {
    totalValue: string;
    currency: string;
    breakdown: string;
    indexation: string;
  };
  deadlines: {
    submission: string;
    questions: string;
    validity: string;
    timeline: string;
  };
  contractConditions: {
    warranty: string;
    penalties: string;
    liability: string;
    ip: string;
  };
  riskAnalysis: {
    koRisks: string[];
    ambiguities: string[];
    contradictions: string[];
    missingInfo: string[];
  };
  questionPriorities: QuestionPriority[];
  contactInfo: {
    organization: string;
    contact: string;
    platform: string;
  };
  municipalities: string[];
  categories: string[];
  cpvCode: string;
  extractedSections: {
    keyPoints: string[];
    exclusions: string[];
    mandatoryRequirements: string[];
    optionalRequirements: string[];
    criticalDates: string[];
  };
}

export async function processPDFBuffer(buffer: Buffer): Promise<string> {
  try {
    const data = await pdf(buffer);
    return data.text;
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('Failed to parse PDF document');
  }
}

export async function analyzeTenderWithLLM(pdfText: string): Promise<TenderAnalysis> {
  const prompt = `
You are an expert tender analyst. Analyze this Dutch tender document using the comprehensive 12-lens framework below.
Extract structured information and identify critical issues using professional tender analysis methodology.

## ANALYSIS FRAMEWORK: 12 LENSES

### 1) Legal & Process (avoiding formal errors)
- Conflicting deadlines, disproportionate requirements, unclear submission rules
- Identify KO-risks and unclear legal basis

### 2) Scope & Lots
- What is/isn't included, lot logic, combination rules
- Flag overlaps, exceptions, duplications

### 3) Knock-outs & Suitability
- Exclusion grounds, ESPD, minimum certificates, financial requirements
- Note "equivalent" certificate options

### 4) Evaluation Method (PKV/MEAT)
- Exact formula/weighting, tie-breakers, rounding rules
- How wishes are scored

### 5) Pricing Mechanism & Quantities
- Weighting factors, counting rules, indexation, fixed/variable items
- Negative/empty field rules

### 6) Technical Requirements
- Measurement conditions, minimum values, tolerances
- System vs component requirements

### 7) Calculation Models & Tools
- Required tools/versions, what can be changed, validation

### 8) Delivery, SLA & Penalties
- Delivery terms, acceptance, penalty curves, service times

### 9) Sustainability, SROI & RBC
- Thresholds, proof requirements, bonus points

### 10) Contract Conditions
- Liability, warranty, IP, indexation, modification rights

### 11) Privacy/IP & Data
- Data ownership, escrow, audit rights, DPIA

### 12) Version Control & Communication
- Valid versions, change procedures, platform issues

## REQUIRED JSON OUTPUT:

{
  "title": "Main title of the tender",
  "referenceNumber": "Reference number or tender ID",
  "tenderType": "Type of procurement",
  "description": "Brief description",
  "requirements": {
    "scope": "What is included/excluded",
    "quantities": "Quantities and lot structure",
    "technical": "Technical requirements with standards",
    "social": "SROI/sustainability requirements",
    "certificates": "Required certificates and equivalents",
    "financial": "Financial capacity requirements"
  },
  "specifications": {
    "products": "Product specifications",
    "standards": "Required standards with measurement conditions",
    "tools": "Calculation tools and models required",
    "delivery": "Delivery and SLA requirements"
  },
  "evaluationCriteria": {
    "price": "Price weighting percentage and calculation method",
    "quality": "Quality weighting and scoring method",
    "formula": "Exact PKV/MEAT formula if specified",
    "tieBreakers": "Tie-breaking rules"
  },
  "budgetInfo": {
    "totalValue": "Total estimated contract value",
    "currency": "Currency used",
    "breakdown": "Budget breakdown by lots/items",
    "indexation": "Price indexation rules"
  },
  "deadlines": {
    "submission": "Bid submission deadline",
    "questions": "Deadline for questions",
    "validity": "Bid validity period",
    "timeline": "Overall procurement timeline"
  },
  "contractConditions": {
    "warranty": "Warranty duration and terms",
    "penalties": "Penalty/discount schemes",
    "liability": "Liability limitations",
    "ip": "Intellectual property arrangements"
  },
  "riskAnalysis": {
    "koRisks": ["Critical knock-out risks"],
    "ambiguities": ["Unclear requirements needing clarification"],
    "contradictions": ["Internal contradictions in documents"],
    "missingInfo": ["Missing critical information"]
  },
  "questionPriorities": [
    {
      "lens": "Legal & Process",
      "issue": "Description of issue",
      "koRisk": 0-3,
      "meatImpact": 0-3,
      "euroImpact": 0-3,
      "timeImpact": 0-3,
      "evidenceRisk": 0-3,
      "totalScore": "sum of above",
      "suggestedQuestion": "Proposed NvI question template"
    }
  ],
  "contactInfo": {
    "organization": "Contracting organization",
    "contact": "Contact details",
    "platform": "Submission platform"
  },
  "municipalities": ["List of municipalities"],
  "categories": ["Product/service categories"],
  "cpvCode": "CPV classification code",
  "extractedSections": {
    "keyPoints": ["Most critical points for bidders"],
    "exclusions": ["What is explicitly excluded"],
    "mandatoryRequirements": ["Must-have requirements"],
    "optionalRequirements": ["Optional/wish requirements"],
    "criticalDates": ["All important dates and deadlines"]
  }
}

## SCORING CRITERIA for questionPriorities:
- koRisk: 0=no risk, 3=high exclusion risk
- meatImpact: 0=no impact, 3=major scoring impact
- euroImpact: 0=minimal cost, 3=major financial impact
- timeImpact: 0=no delay, 3=significant timeline impact
- evidenceRisk: 0=easy to prove, 3=difficult to demonstrate

Questions with totalScore ≥6 are HIGH PRIORITY for NvI submission.

Tender document text:
${pdfText}

Analyze thoroughly using all 12 lenses. Focus on identifying risks, ambiguities, and question-worthy issues that require clarification.
`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-1106-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert in analyzing procurement and tender documents. Extract key information accurately and structure it as requested. Always return valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 100000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Clean and parse the JSON response
    let cleanContent = content.trim();

    // Remove markdown code blocks if present
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const analysis = JSON.parse(cleanContent) as TenderAnalysis;
    return analysis;
  } catch (error) {
    console.error('Error analyzing tender with LLM:', error);
    throw new Error('Failed to analyze tender document with AI');
  }
}

export function generateTenderSummary(analysis: TenderAnalysis): string {
  const summary = `
# Tender Summary: ${analysis.title}

**Reference:** ${analysis.referenceNumber}
**Type:** ${analysis.tenderType}
**Municipalities:** ${analysis.municipalities.join(', ')}
**CPV Code:** ${analysis.cpvCode}

## Description
${analysis.description}

## Key Requirements
- **Scope:** ${analysis.requirements.scope || 'Not specified'}
- **Quantities:** ${analysis.requirements.quantities || 'Not specified'}
- **Technical:** ${analysis.requirements.technical || 'Not specified'}

## Budget Information
- **Total Value:** ${analysis.budgetInfo.totalValue || 'Not disclosed'}
- **Currency:** ${analysis.budgetInfo.currency || 'EUR'}

## Evaluation Criteria
- **Price Weight:** ${analysis.evaluationCriteria.price || 'Not specified'}
- **Quality Weight:** ${analysis.evaluationCriteria.quality || 'Not specified'}

## Important Deadlines
- **Submission:** ${analysis.deadlines.submission || 'Check document'}
- **Questions:** ${analysis.deadlines.questions || 'Check document'}

## Contact
${analysis.contactInfo.organization || 'Not specified'}
Platform: ${analysis.contactInfo.platform || 'TenderNed'}

## Key Points for Bidders
${Array.isArray(analysis.extractedSections.keyPoints) ? analysis.extractedSections.keyPoints.join('\n- ') : 'See full analysis'}
`;

  return summary;
}