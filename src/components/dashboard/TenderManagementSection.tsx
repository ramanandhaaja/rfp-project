'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface TenderDocument {
  id: string;
  title: string;
  referenceNumber: string;
  tenderType: string;
  description: string;
  municipalities: string[];
  categories: string[];
  cpvCode: string;
  createdAt: string;
  requirements?: Record<string, unknown>;
  specifications?: Record<string, unknown>;
  evaluationCriteria?: Record<string, unknown>;
  budgetInfo?: Record<string, unknown>;
  deadlines?: Record<string, unknown>;
  contactInfo?: Record<string, unknown>;
  extractedSections?: Record<string, unknown>;
}

interface QuestionPriority {
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

interface RiskAnalysis {
  koRisks: string[];
  ambiguities: string[];
  contradictions: string[];
  missingInfo: string[];
}

interface ContractConditions {
  warranty: string;
  penalties: string;
  liability: string;
  ip: string;
}

interface LegalAnalysis {
  compliance_status: 'Compliant' | 'Partially Compliant' | 'Non-Compliant' | 'Requires Review';
  applicable_articles: Array<{
    article: string;
    title: string;
    status: 'Met' | 'Partially Met' | 'Not Met' | 'Not Applicable';
    requirements: string[];
    recommendations: string[];
    risk_level: string;
  }>;
  compliance_score: number;
  key_risks: string[];
  action_items: string[];
  legal_recommendations: string[];
}

interface TenderAnalysis {
  overallMatch: string;
  competitiveness: string;
  recommendation: string;
  strengths: string[];
  gaps: string[];
  opportunities: string[];
  risks: string[];
  actionItems: string[];
  budgetAssessment: string;
  timeline: string;
  strategicAdvice: string;
  matchingProducts?: Array<{
    name: string;
    powerRange: string;
    lightOutput: string;
    efficiency: string;
    ipRating?: string;
    certifications?: string;
    matchScore: number;
    whyMatch?: string;
  }>;
  legalAnalysis?: LegalAnalysis;
  riskAnalysis?: RiskAnalysis;
  questionPriorities?: QuestionPriority[];
  contractConditions?: ContractConditions;
  isFromCache?: boolean;
  analyzedAt?: string;
}

interface UploadResult {
  success: boolean;
  tender?: TenderDocument;
  analysis?: Record<string, unknown>;
  summary?: string;
  error?: string;
}

export default function TenderManagementSection() {
  const { data: session } = useSession();
  const [tenders, setTenders] = useState<TenderDocument[]>([]);
  const [selectedTender, setSelectedTender] = useState<TenderDocument | null>(null);
  const [analysis, setAnalysis] = useState<TenderAnalysis | null>(null);
  const [legalAnalysis, setLegalAnalysis] = useState<LegalAnalysis | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLegalAnalyzing, setIsLegalAnalyzing] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analyzedTenders, setAnalyzedTenders] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (session) {
      fetchTenders();
      loadAnalyzedTenders();
    }
  }, [session]);

  const loadAnalyzedTenders = async () => {
    try {
      // This is a simple approach - in a real app you might want a dedicated endpoint
      const response = await fetch('/api/tenders/import');
      if (response.ok) {
        await response.json();
        // For now, we'll check analysis when needed.
        // You could add an endpoint to get analysis status for all tenders
      }
    } catch (error) {
      console.error('Error loading analyzed tenders:', error);
    }
  };

  const fetchTenders = async () => {
    try {
      const response = await fetch('/api/tenders/import');
      if (response.ok) {
        const data = await response.json();
        setTenders(data.tenders || []);
      } else {
        console.error('Failed to fetch tenders');
      }
    } catch (error) {
      console.error('Error fetching tenders:', error);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setUploadResult(null);
    } else {
      alert('Please select a PDF file');
      event.target.value = '';
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('pdfFile', selectedFile);

      const response = await fetch('/api/tenders/import', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setUploadResult(result);
        setTenders(prev => [result.tender, ...prev]);
        setSelectedFile(null);
        // Reset file input
        const fileInput = document.getElementById('tender-file') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        setUploadResult({ success: false, error: result.error || 'Upload failed' });
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadResult({ success: false, error: 'Upload failed' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleAnalyzeTender = async (tender: TenderDocument, forceReanalyze = false) => {
    setIsAnalyzing(true);
    if (forceReanalyze) setAnalysis(null);
    setSelectedTender(tender);

    try {
      const response = await fetch('/api/tenders/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenderId: tender.id,
          forceReanalyze
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setAnalysis({
          ...result.analysis,
          isFromCache: result.isFromCache,
          analyzedAt: result.analyzedAt,
        });
        // Mark this tender as analyzed
        setAnalyzedTenders(prev => new Set([...prev, tender.id]));
      } else {
        console.error('Analysis failed:', result.error);
        alert('Failed to analyze tender: ' + result.error);
      }
    } catch (error) {
      console.error('Analysis error:', error);
      alert('Failed to analyze tender');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLegalAnalysis = async (tender: TenderDocument) => {
    setIsLegalAnalyzing(true);
    setSelectedTender(tender);

    try {
      const response = await fetch('/api/tenders/legal-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenderId: tender.id
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setLegalAnalysis(result.analysis);
      } else {
        console.error('Legal analysis failed:', result.error);
        alert('Failed to perform legal analysis: ' + result.error);
      }
    } catch (error) {
      console.error('Legal analysis error:', error);
      alert('Failed to perform legal analysis');
    } finally {
      setIsLegalAnalyzing(false);
    }
  };

  const getMatchColor = (match: string) => {
    const percentage = parseInt(match);
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCompetitivenessColor = (competitiveness: string) => {
    switch (competitiveness.toLowerCase()) {
      case 'high': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getRecommendationColor = (recommendation: string) => {
    if (recommendation.toLowerCase().includes('should bid')) return 'text-green-600';
    if (recommendation.toLowerCase().includes('consider')) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getComplianceStatusColor = (status: string) => {
    switch (status) {
      case 'Compliant': return 'text-green-600';
      case 'Partially Compliant': return 'text-yellow-600';
      case 'Non-Compliant': return 'text-red-600';
      case 'Requires Review': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  const getArticleStatusColor = (status: string) => {
    switch (status) {
      case 'Met': return 'bg-green-100 text-green-800';
      case 'Partially Met': return 'bg-yellow-100 text-yellow-800';
      case 'Not Met': return 'bg-red-100 text-red-800';
      case 'Not Applicable': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Tender Management</h2>
        <p className="text-gray-600 mb-6">
          Upload and analyze tender documents using AI to assess your competitive position.
        </p>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Upload New Tender Document</h3>

        <div className="space-y-4">
          <div>
            <label htmlFor="tender-file" className="block text-sm font-medium text-gray-700 mb-2">
              Select PDF File
            </label>
            <input
              id="tender-file"
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          {selectedFile && (
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-md">
              <span className="text-sm text-blue-700">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </span>
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {isUploading ? 'Processing...' : 'Upload & Analyze'}
              </button>
            </div>
          )}
        </div>

        {/* Upload Result */}
        {uploadResult && (
          <div className={`mt-4 p-4 rounded-md ${uploadResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {uploadResult.success ? (
              <div>
                <p className="font-medium">✅ Successfully processed tender document!</p>
                <p className="text-sm mt-1">Title: {uploadResult.tender?.title}</p>
                <p className="text-sm">Reference: {uploadResult.tender?.referenceNumber}</p>
              </div>
            ) : (
              <p className="font-medium">❌ {uploadResult.error}</p>
            )}
          </div>
        )}
      </div>

      {/* Tender List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Your Tender Documents</h3>

        {tenders.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No tender documents uploaded yet.</p>
            <p className="text-sm">Upload a PDF tender document to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tenders.map((tender) => (
              <div key={tender.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-start gap-2">
                      <h4 className="font-medium text-lg flex-1">{tender.title}</h4>
                      {analyzedTenders.has(tender.id) && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
                          ✓ Analyzed
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{tender.description}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                        {tender.referenceNumber}
                      </span>
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                        {tender.tenderType}
                      </span>
                      {tender.cpvCode && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                          CPV: {tender.cpvCode}
                        </span>
                      )}
                      {tender.municipalities.map((municipality) => (
                        <span key={municipality} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                          {municipality}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Uploaded: {new Date(tender.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedTender(selectedTender?.id === tender.id ? null : tender)}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
                    >
                      {selectedTender?.id === tender.id ? 'Hide Details' : 'View Details'}
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAnalyzeTender(tender)}
                        disabled={isAnalyzing}
                        className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
                      >
                        {isAnalyzing && selectedTender?.id === tender.id ? 'Analyzing...' :
                         (analysis && selectedTender?.id === tender.id && analysis.isFromCache) ? 'View Analysis' : 'Analyze Fit'}
                      </button>
                      <button
                        onClick={() => handleLegalAnalysis(tender)}
                        disabled={isLegalAnalyzing}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                      >
                        {isLegalAnalyzing && selectedTender?.id === tender.id ? 'Legal Analysis...' : 'Legal Compliance'}
                      </button>
                      {analysis && selectedTender?.id === tender.id && analysis.isFromCache && (
                        <button
                          onClick={() => handleAnalyzeTender(tender, true)}
                          disabled={isAnalyzing}
                          className="px-3 py-2 bg-gray-600 text-white rounded-md text-sm font-medium hover:bg-gray-700 disabled:opacity-50"
                          title="Run fresh analysis"
                        >
                          🔄
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Detailed View */}
                {selectedTender?.id === tender.id && (
                  <div className="border-t pt-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">Basic Information</h5>
                        <div className="space-y-2 text-sm">
                          <div><span className="font-medium">Reference:</span> {tender.referenceNumber}</div>
                          <div><span className="font-medium">Type:</span> {tender.tenderType}</div>
                          <div><span className="font-medium">CPV Code:</span> {tender.cpvCode || 'Not specified'}</div>
                          <div><span className="font-medium">Categories:</span> {tender.categories.join(', ') || 'Not specified'}</div>
                        </div>
                      </div>
                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">Location & Scope</h5>
                        <div className="space-y-2 text-sm">
                          <div><span className="font-medium">Municipalities:</span> {tender.municipalities.join(', ')}</div>
                          <div><span className="font-medium">Description:</span> {tender.description}</div>
                        </div>
                      </div>
                    </div>

                    {/* Requirements Section */}
                    {tender.requirements && Object.keys(tender.requirements).length > 0 && (
                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">📋 Requirements Analysis</h5>
                        <div className="bg-gray-50 p-3 rounded text-sm space-y-2">
                          {Object.entries(tender.requirements).map(([key, value]) => (
                            <div key={key} className="border-l-2 border-blue-200 pl-2">
                              <span className="font-medium text-blue-700 capitalize">
                                {key.replace(/([A-Z])/g, ' $1')}:
                              </span>{' '}
                              <div className="text-gray-700 mt-1">
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Budget Information */}
                    {tender.budgetInfo && Object.keys(tender.budgetInfo).length > 0 && (
                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">Budget Information</h5>
                        <div className="bg-green-50 p-3 rounded text-sm space-y-1">
                          {Object.entries(tender.budgetInfo).map(([key, value]) => (
                            <div key={key}>
                              <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>{' '}
                              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Evaluation Criteria */}
                    {tender.evaluationCriteria && Object.keys(tender.evaluationCriteria).length > 0 && (
                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">Evaluation Criteria</h5>
                        <div className="bg-blue-50 p-3 rounded text-sm space-y-1">
                          {Object.entries(tender.evaluationCriteria).map(([key, value]) => (
                            <div key={key}>
                              <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>{' '}
                              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Deadlines */}
                    {tender.deadlines && Object.keys(tender.deadlines).length > 0 && (
                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">Important Deadlines</h5>
                        <div className="bg-red-50 p-3 rounded text-sm space-y-1">
                          {Object.entries(tender.deadlines).map(([key, value]) => (
                            <div key={key}>
                              <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>{' '}
                              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Contact Information */}
                    {tender.contactInfo && Object.keys(tender.contactInfo).length > 0 && (
                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">Contact Information</h5>
                        <div className="bg-purple-50 p-3 rounded text-sm space-y-1">
                          {Object.entries(tender.contactInfo).map(([key, value]) => (
                            <div key={key}>
                              <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>{' '}
                              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Key Insights */}
                    {tender.extractedSections?.keyPoints && Array.isArray(tender.extractedSections.keyPoints) && (
                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">Key Points for Bidders</h5>
                        <div className="bg-yellow-50 p-3 rounded text-sm">
                          <ul className="list-disc list-inside space-y-1">
                            {tender.extractedSections.keyPoints.map((point: string, index: number) => (
                              <li key={index}>{point}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {(!tender.requirements && !tender.budgetInfo && !tender.evaluationCriteria) && (
                      <div className="text-sm text-gray-500 italic">
                        Click &quot;Analyze Fit&quot; to see detailed requirements, budget info, and competitive analysis.
                      </div>
                    )}
                  </div>
                )}
              </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Analysis Results */}
      {analysis && selectedTender && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-semibold">
              Analysis Results: {selectedTender.title}
            </h3>
            <div className="text-right">
              {analysis.isFromCache ? (
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                    📋 Saved Analysis
                  </span>
                  <button
                    onClick={() => handleAnalyzeTender(selectedTender, true)}
                    disabled={isAnalyzing}
                    className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200"
                  >
                    🔄 Re-analyze
                  </button>
                </div>
              ) : (
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                  ✨ Fresh Analysis
                </span>
              )}
              {analysis.analyzedAt && (
                <p className="text-xs text-gray-500 mt-1">
                  {analysis.isFromCache ? 'Analyzed' : 'Completed'}: {new Date(analysis.analyzedAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Overall Match</p>
              <p className={`text-2xl font-bold ${getMatchColor(analysis.overallMatch)}`}>
                {analysis.overallMatch}%
              </p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Competitiveness</p>
              <p className={`text-xl font-bold ${getCompetitivenessColor(analysis.competitiveness)}`}>
                {analysis.competitiveness}
              </p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Recommendation</p>
              <p className={`text-sm font-bold ${getRecommendationColor(analysis.recommendation)}`}>
                {analysis.recommendation}
              </p>
            </div>
          </div>

          <div className='mb-8'>
              <h4 className="font-medium text-indigo-700 mb-2">🔗 Matching Products</h4>
              {analysis.matchingProducts && analysis.matchingProducts.length > 0 ? (
                <div className="space-y-2">
                  {(analysis.matchingProducts as Array<{name: string; category: string; features: string[]; description: string}>).map((product, index: number) => (
                    <div key={index} className="bg-indigo-50 p-3 rounded-lg border border-indigo-200">
                      <div className="flex justify-between items-start mb-2">
                        <h5 className="font-medium text-indigo-800">{product.name}</h5>
                        <span className="text-xs bg-indigo-200 text-indigo-800 px-2 py-1 rounded">
                          {product.matchScore}% match
                        </span>
                      </div>
                      <div className="space-y-1 text-sm text-indigo-700">
                        <div><span className="font-medium">Power:</span> {product.powerRange}W</div>
                        <div><span className="font-medium">Output:</span> {product.lightOutput} lumens</div>
                        <div><span className="font-medium">Efficiency:</span> {product.efficiency} lm/W</div>
                        {product.ipRating && (
                          <div><span className="font-medium">Protection:</span> {product.ipRating}</div>
                        )}
                        {product.certifications && (
                          <div><span className="font-medium">Certified:</span> {product.certifications}</div>
                        )}
                      </div>
                      {product.whyMatch && (
                        <div className="mt-2 text-xs text-indigo-600 bg-indigo-100 p-2 rounded">
                          <span className="font-medium">Why it matches:</span> {product.whyMatch}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No specific product matches available. Run analysis to get product recommendations.</p>
              )}
            </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            

            <div>
              <h4 className="font-medium text-green-700 mb-2">✅ Strengths</h4>
              <ul className="space-y-1 text-sm">
                {analysis.strengths.map((strength, index) => (
                  <li key={index} className="text-green-600">• {strength}</li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-red-700 mb-2">❌ Gaps</h4>
              <ul className="space-y-1 text-sm">
                {analysis.gaps.map((gap, index) => (
                  <li key={index} className="text-red-600">• {gap}</li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-blue-700 mb-2">🚀 Opportunities</h4>
              <ul className="space-y-1 text-sm">
                {analysis.opportunities.map((opportunity, index) => (
                  <li key={index} className="text-blue-600">• {opportunity}</li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-yellow-700 mb-2">⚠️ Risks</h4>
              <ul className="space-y-1 text-sm">
                {analysis.risks.map((risk, index) => (
                  <li key={index} className="text-yellow-600">• {risk}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-6">
            <h4 className="font-medium text-purple-700 mb-2">📋 Action Items</h4>
            <ul className="space-y-1 text-sm">
              {analysis.actionItems.map((item, index) => (
                <li key={index} className="text-purple-600">• {item}</li>
              ))}
            </ul>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-700 mb-2">💡 Strategic Advice</h4>
            <p className="text-sm text-blue-600">{analysis.strategicAdvice}</p>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-700 mb-2">💰 Budget Assessment</h4>
              <p className="text-sm text-green-600">{analysis.budgetAssessment}</p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <h4 className="font-medium text-orange-700 mb-2">⏰ Timeline Assessment</h4>
              <p className="text-sm text-orange-600">{analysis.timeline}</p>
            </div>
          </div>

          {/* 12-Lens Risk Analysis */}
          {analysis.riskAnalysis && (
            <div className="mt-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">🔍 12-Lens Risk Analysis</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* KO Risks */}
                {analysis.riskAnalysis.koRisks && analysis.riskAnalysis.koRisks.length > 0 && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <h4 className="font-medium text-red-800 mb-2 flex items-center gap-2">
                      🚨 Knock-Out Risks
                      <span className="text-xs bg-red-200 text-red-800 px-2 py-1 rounded">
                        {analysis.riskAnalysis.koRisks.length}
                      </span>
                    </h4>
                    <ul className="space-y-1 text-sm">
                      {analysis.riskAnalysis.koRisks.map((risk, index) => (
                        <li key={index} className="text-red-700">• {risk}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Ambiguities */}
                {analysis.riskAnalysis.ambiguities && analysis.riskAnalysis.ambiguities.length > 0 && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="font-medium text-yellow-800 mb-2 flex items-center gap-2">
                      ❓ Ambiguities
                      <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">
                        {analysis.riskAnalysis.ambiguities.length}
                      </span>
                    </h4>
                    <ul className="space-y-1 text-sm">
                      {analysis.riskAnalysis.ambiguities.map((ambiguity, index) => (
                        <li key={index} className="text-yellow-700">• {ambiguity}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Contradictions */}
                {analysis.riskAnalysis.contradictions && analysis.riskAnalysis.contradictions.length > 0 && (
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <h4 className="font-medium text-purple-800 mb-2 flex items-center gap-2">
                      ⚡ Contradictions
                      <span className="text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded">
                        {analysis.riskAnalysis.contradictions.length}
                      </span>
                    </h4>
                    <ul className="space-y-1 text-sm">
                      {analysis.riskAnalysis.contradictions.map((contradiction, index) => (
                        <li key={index} className="text-purple-700">• {contradiction}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Missing Info */}
                {analysis.riskAnalysis.missingInfo && analysis.riskAnalysis.missingInfo.length > 0 && (
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <h4 className="font-medium text-gray-800 mb-2 flex items-center gap-2">
                      📋 Missing Information
                      <span className="text-xs bg-gray-200 text-gray-800 px-2 py-1 rounded">
                        {analysis.riskAnalysis.missingInfo.length}
                      </span>
                    </h4>
                    <ul className="space-y-1 text-sm">
                      {analysis.riskAnalysis.missingInfo.map((info, index) => (
                        <li key={index} className="text-gray-700">• {info}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Question Priorities */}
          {analysis.questionPriorities && analysis.questionPriorities.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-4">📝 Prioritized NvI Questions</h3>

              <div className="space-y-3">
                {analysis.questionPriorities
                  .sort((a, b) => b.totalScore - a.totalScore)
                  .map((question, index) => {
                    const priority = question.totalScore >= 6 ? 'HIGH' : question.totalScore >= 4 ? 'MEDIUM' : 'LOW';
                    const priorityColor = priority === 'HIGH' ? 'red' : priority === 'MEDIUM' ? 'yellow' : 'green';

                    return (
                      <div key={index} className={`p-4 bg-${priorityColor}-50 border border-${priorityColor}-200 rounded-lg`}>
                        <div className="flex justify-between items-start mb-2">
                          <h4 className={`font-medium text-${priorityColor}-800 flex items-center gap-2`}>
                            <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {question.lens}
                            </span>
                            <span className={`text-xs bg-${priorityColor}-200 text-${priorityColor}-800 px-2 py-1 rounded font-bold`}>
                              {priority} - Score: {question.totalScore}
                            </span>
                          </h4>
                        </div>

                        <p className={`text-sm text-${priorityColor}-700 mb-3`}>
                          <strong>Issue:</strong> {question.issue}
                        </p>

                        <div className="grid grid-cols-5 gap-2 mb-3">
                          <div className="text-center">
                            <span className="text-xs text-gray-500 block">KO Risk</span>
                            <span className={`text-sm font-bold ${question.koRisk >= 2 ? 'text-red-600' : 'text-gray-600'}`}>
                              {question.koRisk}/3
                            </span>
                          </div>
                          <div className="text-center">
                            <span className="text-xs text-gray-500 block">MEAT</span>
                            <span className={`text-sm font-bold ${question.meatImpact >= 2 ? 'text-orange-600' : 'text-gray-600'}`}>
                              {question.meatImpact}/3
                            </span>
                          </div>
                          <div className="text-center">
                            <span className="text-xs text-gray-500 block">€ Impact</span>
                            <span className={`text-sm font-bold ${question.euroImpact >= 2 ? 'text-green-600' : 'text-gray-600'}`}>
                              {question.euroImpact}/3
                            </span>
                          </div>
                          <div className="text-center">
                            <span className="text-xs text-gray-500 block">Time</span>
                            <span className={`text-sm font-bold ${question.timeImpact >= 2 ? 'text-blue-600' : 'text-gray-600'}`}>
                              {question.timeImpact}/3
                            </span>
                          </div>
                          <div className="text-center">
                            <span className="text-xs text-gray-500 block">Evidence</span>
                            <span className={`text-sm font-bold ${question.evidenceRisk >= 2 ? 'text-purple-600' : 'text-gray-600'}`}>
                              {question.evidenceRisk}/3
                            </span>
                          </div>
                        </div>

                        <div className={`p-3 bg-${priorityColor}-100 rounded border-l-4 border-${priorityColor}-400`}>
                          <h5 className={`font-medium text-${priorityColor}-800 text-sm mb-1`}>Suggested NvI Question:</h5>
                          <p className={`text-sm text-${priorityColor}-700 italic`}>{question.suggestedQuestion}</p>
                        </div>
                      </div>
                    );
                  })
                }
              </div>
            </div>
          )}

          {/* Contract Conditions */}
          {analysis.contractConditions && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-4">📄 Contract Conditions Analysis</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysis.contractConditions.warranty && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-800 mb-2">🛡️ Warranty Terms</h4>
                    <p className="text-sm text-blue-700">{analysis.contractConditions.warranty}</p>
                  </div>
                )}

                {analysis.contractConditions.penalties && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <h4 className="font-medium text-red-800 mb-2">⚖️ Penalties & Discounts</h4>
                    <p className="text-sm text-red-700">{analysis.contractConditions.penalties}</p>
                  </div>
                )}

                {analysis.contractConditions.liability && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="font-medium text-yellow-800 mb-2">⚠️ Liability Terms</h4>
                    <p className="text-sm text-yellow-700">{analysis.contractConditions.liability}</p>
                  </div>
                )}

                {analysis.contractConditions.ip && (
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <h4 className="font-medium text-purple-800 mb-2">🔒 Intellectual Property</h4>
                    <p className="text-sm text-purple-700">{analysis.contractConditions.ip}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Legal Analysis Results */}
      {legalAnalysis && selectedTender && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-semibold">
              🏛️ Legal Compliance Analysis: {selectedTender.title}
            </h3>
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
              ⚖️ Dutch Procurement Law
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Compliance Status</p>
              <p className={`text-xl font-bold ${getComplianceStatusColor(legalAnalysis.compliance_status)}`}>
                {legalAnalysis.compliance_status}
              </p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Compliance Score</p>
              <p className={`text-2xl font-bold ${legalAnalysis.compliance_score >= 80 ? 'text-green-600' : legalAnalysis.compliance_score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                {legalAnalysis.compliance_score}%
              </p>
            </div>
          </div>

          {/* Applicable Articles */}
          {legalAnalysis.applicable_articles && legalAnalysis.applicable_articles.length > 0 && (
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-4">📋 Applicable Legal Articles</h4>
              <div className="space-y-3">
                {legalAnalysis.applicable_articles.map((article, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h5 className="font-medium text-gray-900">{article.article}</h5>
                        <p className="text-sm text-gray-600">{article.title}</p>
                      </div>
                      <div className="flex gap-2">
                        <span className={`px-2 py-1 text-xs rounded ${getArticleStatusColor(article.status)}`}>
                          {article.status}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded ${
                          article.risk_level === 'High' ? 'bg-red-100 text-red-800' :
                          article.risk_level === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {article.risk_level} Risk
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                      <div>
                        <h6 className="text-sm font-medium text-gray-700 mb-1">Requirements:</h6>
                        <ul className="text-xs text-gray-600 space-y-1">
                          {article.requirements.map((req, reqIndex) => (
                            <li key={reqIndex}>• {req}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h6 className="text-sm font-medium text-gray-700 mb-1">Recommendations:</h6>
                        <ul className="text-xs text-gray-600 space-y-1">
                          {article.recommendations.map((rec, recIndex) => (
                            <li key={recIndex}>• {rec}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-red-700 mb-2">⚠️ Key Legal Risks</h4>
              <ul className="space-y-1 text-sm">
                {legalAnalysis.key_risks.map((risk, index) => (
                  <li key={index} className="text-red-600">• {risk}</li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-blue-700 mb-2">✅ Legal Action Items</h4>
              <ul className="space-y-1 text-sm">
                {legalAnalysis.action_items.map((item, index) => (
                  <li key={index} className="text-blue-600">• {item}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-700 mb-2">⚖️ Legal Recommendations</h4>
            <ul className="space-y-1 text-sm">
              {legalAnalysis.legal_recommendations.map((rec, index) => (
                <li key={index} className="text-blue-600">• {rec}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}