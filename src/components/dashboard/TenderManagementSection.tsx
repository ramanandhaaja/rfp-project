'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
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
  // Risk Summary
  risk_matrix: Array<{
    category: string;
    risk: string;
    price_impact: string;
    priority: number; // 1-5
  }>;
  total_risk_premium: string;

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
  nvi_questions: string[];
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

  // Backwards compatibility
  compliance_status: 'Compliant' | 'Partially Compliant' | 'Non-Compliant' | 'Requires Review';
  compliance_score: number;
  key_risks: string[];
  action_items: string[];
}

interface FrequentlyUsedProduct {
  name: string;
  type?: string;
  lumenRange?: string;
  efficiency?: string;
  ipRating?: string;
  ikRating?: string;
  dimensions?: string;
  weight?: string;
  cctOptions?: string;
  mounting?: string;
  certifications?: string;
  matchScore: number;
  isRecommended?: boolean;
  whyMatch?: string;
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
    dimensions?: string;
    housing?: string;
    mounting?: string;
    optics?: string;
    certifications?: string;
    matchScore: number;
    whyMatch?: string;
  }>;
  frequentlyUsedMatching?: FrequentlyUsedProduct[];
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
  const [isSyncingProducts, setIsSyncingProducts] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (session) {
      fetchTenders();
    }
  }, [session]);

  const fetchTenders = async () => {
    try {
      const response = await fetch('/api/tenders/import');
      if (response.ok) {
        const data = await response.json();
        const fetchedTenders = data.tenders || [];
        setTenders(fetchedTenders);
        if (fetchedTenders.length === 0) setIsUploadExpanded(true);
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
        setAnalyzedTenders(prev => new Set([...prev, tender.id]));
        setTimeout(() => analysisZoneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
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

  const handleSyncProducts = async () => {
    setIsSyncingProducts(true);
    setSyncResult(null);

    try {
      const response = await fetch('/api/products/sync-embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (response.ok) {
        setSyncResult({
          success: true,
          message: `Synced ${result.synced} products to search index. You can now use Standard Matching.`
        });
      } else {
        setSyncResult({
          success: false,
          message: result.error || 'Failed to sync products'
        });
      }
    } catch (error) {
      console.error('Sync error:', error);
      setSyncResult({
        success: false,
        message: 'Failed to sync products'
      });
    } finally {
      setIsSyncingProducts(false);
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
        setAnalysisTab('legal');
        setTimeout(() => analysisZoneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
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

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 5: return 'bg-red-100 text-red-800 border-red-300';
      case 4: return 'bg-orange-100 text-orange-800 border-orange-300';
      case 3: return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 2: return 'bg-blue-100 text-blue-800 border-blue-300';
      case 1: return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getLegalRecommendationColor = (rec: string) => {
    switch (rec) {
      case 'Accept': return 'bg-green-100 text-green-800';
      case 'Negotiate': return 'bg-yellow-100 text-yellow-800';
      case 'Dealbreaker': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const [expandedFindings, setExpandedFindings] = useState<Set<number>>(new Set());
  const [productMatchTab, setProductMatchTab] = useState<'frequently-used' | 'standard'>('frequently-used');
  const [analysisTab, setAnalysisTab] = useState<'overview' | 'products' | 'risk' | 'nvi' | 'legal'>('overview');
  const [isUploadExpanded, setIsUploadExpanded] = useState(false);
  const analysisZoneRef = useRef<HTMLDivElement>(null);

  const toggleFinding = (index: number) => {
    setExpandedFindings(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const analysisTabs = useMemo(() => [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'products' as const, label: 'Products', count: analysis?.matchingProducts?.length || analysis?.frequentlyUsedMatching?.length || 0 },
    { id: 'risk' as const, label: 'Risk & SWOT' },
    { id: 'nvi' as const, label: 'NvI Questions', count: analysis?.questionPriorities?.length || 0 },
    { id: 'legal' as const, label: 'Legal', hasAlert: !!(legalAnalysis?.dealbreakers && legalAnalysis.dealbreakers.length > 0) },
  ], [analysis, legalAnalysis]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Tender Management</h2>
        <p className="text-sm text-gray-500 mt-1">Upload, analyze, and assess tender documents</p>
      </div>

      {/* ── Upload Section (Collapsible) ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <button
          onClick={() => setIsUploadExpanded(!isUploadExpanded)}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/60 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-gray-800">Upload New Tender</span>
          </div>
          <svg className={`w-4 h-4 text-gray-400 transition-transform ${isUploadExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isUploadExpanded && (
          <div className="px-5 pb-5 border-t border-gray-100">
            <div className="mt-4 space-y-3">
              <label htmlFor="tender-file" className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                PDF Document
              </label>
              <input
                id="tender-file"
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100 file:cursor-pointer file:uppercase file:tracking-wide"
              />
            </div>

            {selectedFile && (
              <div className="mt-3 flex items-center justify-between p-3 bg-indigo-50/60 rounded-lg border border-indigo-100">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm text-indigo-700 font-medium">{selectedFile.name}</span>
                  <span className="text-xs text-indigo-400">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
                <button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors uppercase tracking-wide"
                >
                  {isUploading ? 'Processing...' : 'Upload & Analyze'}
                </button>
              </div>
            )}

            {uploadResult && (
              <div className={`mt-3 p-3 rounded-lg text-sm ${uploadResult.success ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {uploadResult.success ? (
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 mt-0.5 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <div>
                      <p className="font-medium">Tender processed successfully</p>
                      <p className="text-xs mt-0.5 opacity-80">{uploadResult.tender?.title} — {uploadResult.tender?.referenceNumber}</p>
                    </div>
                  </div>
                ) : (
                  <p className="font-medium">{uploadResult.error}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Tender List ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tenders ({tenders.length})</h3>
        </div>

        {tenders.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-600">No tenders yet</p>
            <p className="text-xs text-gray-400 mt-1">Upload a PDF tender document to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tenders.map((tender) => {
              const isSelected = selectedTender?.id === tender.id;
              const isAnalyzed = analyzedTenders.has(tender.id);
              const hasAnalysisResults = isSelected && analysis;

              return (
                <div
                  key={tender.id}
                  className={`bg-white rounded-xl border transition-all ${
                    isSelected
                      ? 'border-indigo-300 ring-1 ring-indigo-100'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {/* Status dot */}
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            isAnalyzed ? 'bg-emerald-400' : 'bg-gray-300'
                          }`} />
                          <h4 className="text-sm font-semibold text-gray-900 truncate">{tender.title}</h4>
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-1 mb-2">{tender.description}</p>

                        {/* Metadata badges */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded bg-slate-100 text-slate-600 uppercase tracking-wide">
                            {tender.referenceNumber}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded bg-indigo-50 text-indigo-600">
                            {tender.tenderType}
                          </span>
                          {tender.cpvCode && (
                            <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded bg-violet-50 text-violet-600">
                              CPV {tender.cpvCode}
                            </span>
                          )}
                          {tender.municipalities.slice(0, 2).map((m) => (
                            <span key={m} className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded bg-gray-50 text-gray-500">
                              {m}
                            </span>
                          ))}
                          {tender.municipalities.length > 2 && (
                            <span className="text-[10px] text-gray-400">+{tender.municipalities.length - 2}</span>
                          )}
                          <span className="text-[10px] text-gray-400 ml-1">
                            {new Date(tender.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isAnalyzed && hasAnalysisResults && (
                          <span className={`text-xs font-bold tabular-nums ${getMatchColor(analysis!.overallMatch)}`}>
                            {analysis!.overallMatch}%
                          </span>
                        )}

                        {/* Primary action */}
                        <button
                          onClick={() => handleAnalyzeTender(tender)}
                          disabled={isAnalyzing && isSelected}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${
                            isAnalyzed && hasAnalysisResults
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-indigo-600 text-white hover:bg-indigo-700'
                          }`}
                        >
                          {isAnalyzing && isSelected ? 'Analyzing...' :
                           isAnalyzed && hasAnalysisResults ? 'View Analysis' : 'Analyze Fit'}
                        </button>

                        {/* Secondary actions */}
                        <button
                          onClick={() => setSelectedTender(isSelected ? null : tender)}
                          className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                          title={isSelected ? 'Collapse' : 'Expand'}
                        >
                          <svg className={`w-3.5 h-3.5 transition-transform ${isSelected ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {hasAnalysisResults && analysis!.isFromCache && (
                          <button
                            onClick={() => handleAnalyzeTender(tender, true)}
                            disabled={isAnalyzing}
                            className="p-1.5 rounded-lg text-xs bg-gray-100 text-gray-500 hover:bg-gray-200 disabled:opacity-50 transition-colors"
                            title="Re-analyze"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isSelected && (
                    <div className="border-t border-gray-100 px-4 py-4 space-y-4 bg-gray-50/40">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Basic Information</h5>
                          <div className="space-y-1.5 text-sm">
                            <div className="flex"><span className="font-medium text-gray-500 w-24 flex-shrink-0">Reference</span><span className="text-gray-800">{tender.referenceNumber}</span></div>
                            <div className="flex"><span className="font-medium text-gray-500 w-24 flex-shrink-0">Type</span><span className="text-gray-800">{tender.tenderType}</span></div>
                            <div className="flex"><span className="font-medium text-gray-500 w-24 flex-shrink-0">CPV Code</span><span className="text-gray-800">{tender.cpvCode || 'N/A'}</span></div>
                            <div className="flex"><span className="font-medium text-gray-500 w-24 flex-shrink-0">Categories</span><span className="text-gray-800">{tender.categories.join(', ') || 'N/A'}</span></div>
                          </div>
                        </div>
                        <div>
                          <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Location & Scope</h5>
                          <div className="space-y-1.5 text-sm">
                            <div className="flex"><span className="font-medium text-gray-500 w-28 flex-shrink-0">Municipalities</span><span className="text-gray-800">{tender.municipalities.join(', ')}</span></div>
                            <div><span className="font-medium text-gray-500">Description</span><p className="text-gray-800 mt-0.5">{tender.description}</p></div>
                          </div>
                        </div>
                      </div>

                      {tender.requirements && Object.keys(tender.requirements).length > 0 && (
                        <div>
                          <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Requirements</h5>
                          <div className="bg-white p-3 rounded-lg border border-gray-100 text-sm space-y-1.5">
                            {Object.entries(tender.requirements).map(([key, value]) => (
                              <div key={key} className="border-l-2 border-indigo-200 pl-2.5">
                                <span className="font-medium text-indigo-600 capitalize text-xs">{key.replace(/([A-Z])/g, ' $1')}</span>
                                <div className="text-gray-700 text-sm">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {tender.budgetInfo && Object.keys(tender.budgetInfo).length > 0 && (
                        <div>
                          <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Budget</h5>
                          <div className="bg-white p-3 rounded-lg border border-gray-100 text-sm space-y-1">
                            {Object.entries(tender.budgetInfo).map(([key, value]) => (
                              <div key={key}><span className="font-medium text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span> {typeof value === 'object' ? JSON.stringify(value) : String(value)}</div>
                            ))}
                          </div>
                        </div>
                      )}

                      {tender.specifications && Object.keys(tender.specifications).length > 0 && (
                        <div>
                          <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Specifications</h5>
                          <div className="bg-white p-3 rounded-lg border border-gray-100 text-sm space-y-1.5">
                            {(tender.specifications as Record<string, unknown>).shape && (
                              <div className="border-l-2 border-violet-200 pl-2.5"><span className="font-medium text-violet-600 text-xs">Shape</span><div className="text-gray-700">{String((tender.specifications as Record<string, unknown>).shape)}</div></div>
                            )}
                            {(tender.specifications as Record<string, unknown>).housing && (
                              <div className="border-l-2 border-violet-200 pl-2.5"><span className="font-medium text-violet-600 text-xs">Housing</span><div className="text-gray-700">{String((tender.specifications as Record<string, unknown>).housing)}</div></div>
                            )}
                            {(tender.specifications as Record<string, unknown>).dimensions && (
                              <div className="border-l-2 border-violet-200 pl-2.5"><span className="font-medium text-violet-600 text-xs">Dimensions</span><div className="text-gray-700">{String((tender.specifications as Record<string, unknown>).dimensions)}</div></div>
                            )}
                            {(tender.specifications as Record<string, unknown>).mounting && (
                              <div className="border-l-2 border-violet-200 pl-2.5"><span className="font-medium text-violet-600 text-xs">Mounting</span><div className="text-gray-700">{String((tender.specifications as Record<string, unknown>).mounting)}</div></div>
                            )}
                            {(tender.specifications as Record<string, unknown>).optics && (
                              <div className="border-l-2 border-violet-200 pl-2.5"><span className="font-medium text-violet-600 text-xs">Optics</span><div className="text-gray-700">{String((tender.specifications as Record<string, unknown>).optics)}</div></div>
                            )}
                            {(tender.specifications as Record<string, unknown>).weight && (
                              <div className="border-l-2 border-violet-200 pl-2.5"><span className="font-medium text-violet-600 text-xs">Weight</span><div className="text-gray-700">{String((tender.specifications as Record<string, unknown>).weight)}</div></div>
                            )}
                            {Object.entries(tender.specifications as Record<string, unknown>).map(([key, value]) => {
                              if (['shape', 'dimensions', 'housing', 'mounting', 'optics', 'weight'].includes(key)) return null;
                              return (
                                <div key={key} className="border-l-2 border-gray-200 pl-2.5"><span className="font-medium text-gray-500 capitalize text-xs">{key.replace(/([A-Z])/g, ' $1')}</span><div className="text-gray-700">{typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value)}</div></div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {tender.evaluationCriteria && Object.keys(tender.evaluationCriteria).length > 0 && (
                        <div>
                          <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Evaluation Criteria</h5>
                          <div className="bg-white p-3 rounded-lg border border-gray-100 text-sm space-y-1">
                            {Object.entries(tender.evaluationCriteria as Record<string, string>).map(([key, value]) => (
                              <div key={key}><span className="font-medium text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span> {typeof value === 'object' ? JSON.stringify(value) : String(value)}</div>
                            ))}
                          </div>
                        </div>
                      )}

                      {tender.deadlines && Object.keys(tender.deadlines).length > 0 && (
                        <div>
                          <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Deadlines</h5>
                          <div className="bg-white p-3 rounded-lg border border-red-100 text-sm space-y-1">
                            {Object.entries(tender.deadlines).map(([key, value]) => (
                              <div key={key}><span className="font-medium text-red-600 capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span> <span className="text-gray-700">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span></div>
                            ))}
                          </div>
                        </div>
                      )}

                      {tender.contactInfo && Object.keys(tender.contactInfo).length > 0 && (
                        <div>
                          <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Contact</h5>
                          <div className="bg-white p-3 rounded-lg border border-gray-100 text-sm space-y-1">
                            {Object.entries(tender.contactInfo).map(([key, value]) => (
                              <div key={key}><span className="font-medium text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span> {typeof value === 'object' ? JSON.stringify(value) : String(value)}</div>
                            ))}
                          </div>
                        </div>
                      )}

                      {tender.extractedSections?.keyPoints && Array.isArray(tender.extractedSections.keyPoints) && (
                        <div>
                          <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Key Points</h5>
                          <div className="bg-amber-50/60 p-3 rounded-lg border border-amber-100 text-sm">
                            <ul className="space-y-1">
                              {tender.extractedSections.keyPoints.map((point: string, index: number) => (
                                <li key={index} className="text-gray-700 flex gap-2"><span className="text-amber-500 flex-shrink-0">-</span>{point}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      {(!tender.requirements && !tender.budgetInfo && !tender.evaluationCriteria) && (
                        <p className="text-xs text-gray-400 italic">Run &ldquo;Analyze Fit&rdquo; to extract requirements, budget, and competitive analysis.</p>
                      )}
                    </div>
                  )}

                  {/* ── Analysis Zone (inside card) ── */}
                  {isSelected && (analysis || legalAnalysis) && (
                    <div ref={analysisZoneRef} className="border-t border-gray-200">
                      {/* Score bar */}
                      <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {analysis && (
                            <>
                              <span className={`text-lg font-black tabular-nums ${getMatchColor(analysis.overallMatch)}`}>
                                {analysis.overallMatch}%
                              </span>
                              <span className={`text-xs font-semibold ${getCompetitivenessColor(analysis.competitiveness)}`}>
                                {analysis.competitiveness}
                              </span>
                              <span className={`text-xs font-medium ${getRecommendationColor(analysis.recommendation)}`}>
                                {analysis.recommendation}
                              </span>
                            </>
                          )}
                          {!analysis && legalAnalysis && (
                            <span className="text-xs font-medium text-indigo-600">Legal Analysis</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {analysis?.isFromCache && (
                            <button
                              onClick={() => handleAnalyzeTender(tender, true)}
                              disabled={isAnalyzing}
                              className="p-1 rounded bg-gray-100 text-gray-400 hover:bg-gray-200 disabled:opacity-50 transition-colors"
                              title="Re-analyze"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            </button>
                          )}
                          {analysis?.analyzedAt && (
                            <span className="text-[10px] text-gray-400">{new Date(analysis.analyzedAt).toLocaleString()}</span>
                          )}
                        </div>
                      </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200 px-5 bg-gray-50/40">
            {analysisTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setAnalysisTab(tab.id)}
                className={`relative px-4 py-2.5 text-xs font-semibold transition-colors ${
                  analysisTab === tab.id
                    ? 'text-indigo-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-indigo-600'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  {tab.label}
                  {'count' in tab && tab.count > 0 && (
                    <span className={`px-1.5 py-0.5 text-[10px] rounded-full ${
                      analysisTab === tab.id ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-500'
                    }`}>{tab.count}</span>
                  )}
                  {'hasAlert' in tab && tab.hasAlert && (
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  )}
                </span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-5">
            {/* No fit analysis prompt */}
            {!analysis && analysisTab !== 'legal' && (
              <div className="py-12 text-center">
                <p className="text-sm text-gray-500 mb-3">Run fit analysis to see {analysisTab} data.</p>
                <button
                  onClick={() => handleAnalyzeTender(selectedTender)}
                  disabled={isAnalyzing}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {isAnalyzing ? 'Analyzing...' : 'Run Fit Analysis'}
                </button>
              </div>
            )}

            {/* ── Overview Tab ── */}
            {analysis && analysisTab === 'overview' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="text-center p-4 bg-gray-50 rounded-xl">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Overall Match</p>
                    <p className={`text-3xl font-black tabular-nums mt-1 ${getMatchColor(analysis.overallMatch)}`}>{analysis.overallMatch}%</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-xl">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Competitiveness</p>
                    <p className={`text-xl font-bold mt-1 ${getCompetitivenessColor(analysis.competitiveness)}`}>{analysis.competitiveness}</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-xl">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Recommendation</p>
                    <p className={`text-sm font-bold mt-1 ${getRecommendationColor(analysis.recommendation)}`}>{analysis.recommendation}</p>
                  </div>
                </div>

                <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
                  <h4 className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-2">Strategic Advice</h4>
                  <p className="text-sm text-gray-700 leading-relaxed">{analysis.strategicAdvice}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
                    <h4 className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-2">Budget Assessment</h4>
                    <p className="text-sm text-gray-700">{analysis.budgetAssessment}</p>
                  </div>
                  <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100">
                    <h4 className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2">Timeline Assessment</h4>
                    <p className="text-sm text-gray-700">{analysis.timeline}</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── Products Tab ── */}
            {analysis && analysisTab === 'products' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setProductMatchTab('frequently-used')}
                      className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                        productMatchTab === 'frequently-used' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      Frequently Used
                      {analysis.frequentlyUsedMatching && analysis.frequentlyUsedMatching.length > 0 && (
                        <span className={`ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full ${productMatchTab === 'frequently-used' ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                          {analysis.frequentlyUsedMatching.filter(p => p.isRecommended).length}/{analysis.frequentlyUsedMatching.length}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setProductMatchTab('standard')}
                      className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                        productMatchTab === 'standard' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      Standard
                      {analysis.matchingProducts && analysis.matchingProducts.length > 0 && (
                        <span className={`ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full ${productMatchTab === 'standard' ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                          {analysis.matchingProducts.length}
                        </span>
                      )}
                    </button>
                  </div>
                  <button
                    onClick={handleSyncProducts}
                    disabled={isSyncingProducts}
                    className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                  >
                    {isSyncingProducts ? 'Syncing...' : 'Sync Products'}
                  </button>
                </div>

                {syncResult && (
                  <div className={`p-2.5 rounded-lg text-xs ${syncResult.success ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {syncResult.message}
                  </div>
                )}

                {productMatchTab === 'frequently-used' && (
                  <div>
                    {analysis.frequentlyUsedMatching && analysis.frequentlyUsedMatching.length > 0 ? (
                      <div className="space-y-2">
                        {analysis.frequentlyUsedMatching
                          .slice().sort((a, b) => b.matchScore - a.matchScore)
                          .map((product, index: number) => (
                          <div key={index} className={`p-3 rounded-lg border ${product.isRecommended ? 'bg-emerald-50/50 border-emerald-200' : 'bg-gray-50 border-gray-200'}`}>
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2">
                                <h5 className={`text-sm font-semibold ${product.isRecommended ? 'text-emerald-800' : 'text-gray-800'}`}>{product.name}</h5>
                                {product.isRecommended && <span className="px-1.5 py-0.5 text-[10px] bg-emerald-200 text-emerald-800 rounded font-semibold uppercase">Rec</span>}
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded font-bold tabular-nums ${product.matchScore >= 80 ? 'bg-emerald-100 text-emerald-700' : product.matchScore >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                {product.matchScore}%
                              </span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 text-xs text-gray-600">
                              {product.type && <div><span className="font-medium text-gray-500">Type:</span> {product.type}</div>}
                              {product.lumenRange && <div><span className="font-medium text-gray-500">Lumen:</span> {product.lumenRange}</div>}
                              {product.efficiency && <div><span className="font-medium text-gray-500">Eff:</span> {product.efficiency}</div>}
                              {product.ipRating && <div><span className="font-medium text-gray-500">IP:</span> {product.ipRating}</div>}
                              {product.ikRating && <div><span className="font-medium text-gray-500">IK:</span> {product.ikRating}</div>}
                              {product.dimensions && <div><span className="font-medium text-gray-500">Dim:</span> {product.dimensions}</div>}
                              {product.weight && <div><span className="font-medium text-gray-500">Wt:</span> {product.weight}</div>}
                              {product.cctOptions && <div><span className="font-medium text-gray-500">CCT:</span> {product.cctOptions}</div>}
                              {product.mounting && <div><span className="font-medium text-gray-500">Mount:</span> {product.mounting}</div>}
                              {product.certifications && <div className="col-span-2"><span className="font-medium text-gray-500">Certs:</span> {product.certifications}</div>}
                            </div>
                            {product.whyMatch && (
                              <div className={`mt-2 text-xs p-2 rounded ${product.isRecommended ? 'bg-emerald-100/60 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                                {product.whyMatch}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic py-8 text-center">No frequently used products analyzed. Run analysis to compare against your priority products.</p>
                    )}
                  </div>
                )}

                {productMatchTab === 'standard' && (
                  <div>
                    {analysis.matchingProducts && analysis.matchingProducts.length > 0 ? (
                      <div className="space-y-2">
                        {analysis.matchingProducts.map((product, index: number) => (
                          <div key={index} className="p-3 rounded-lg border bg-indigo-50/40 border-indigo-200">
                            <div className="flex justify-between items-start mb-2">
                              <h5 className="text-sm font-semibold text-indigo-800">{product.name}</h5>
                              <span className={`text-xs px-2 py-0.5 rounded font-bold tabular-nums ${product.matchScore >= 80 ? 'bg-emerald-100 text-emerald-700' : product.matchScore >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                {product.matchScore}%
                              </span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 text-xs text-indigo-600">
                              <div><span className="font-medium">Power:</span> {product.powerRange}</div>
                              <div><span className="font-medium">Output:</span> {product.lightOutput}</div>
                              <div><span className="font-medium">Eff:</span> {product.efficiency}</div>
                              {product.ipRating && <div><span className="font-medium">IP:</span> {product.ipRating}</div>}
                              {product.dimensions && <div><span className="font-medium">Dim:</span> {product.dimensions}</div>}
                              {product.housing && <div><span className="font-medium">Shape:</span> {product.housing}</div>}
                              {product.mounting && <div><span className="font-medium">Mount:</span> {product.mounting}</div>}
                              {product.optics && <div><span className="font-medium">Optics:</span> {product.optics}</div>}
                              {product.certifications && <div className="col-span-2"><span className="font-medium">Certs:</span> {product.certifications}</div>}
                            </div>
                            {product.whyMatch && <div className="mt-2 text-xs text-indigo-600 bg-indigo-100/60 p-2 rounded">{product.whyMatch}</div>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic py-8 text-center">No standard product matches. Run analysis to get recommendations.</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Risk & SWOT Tab ── */}
            {analysis && analysisTab === 'risk' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100">
                    <h4 className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-2">Strengths</h4>
                    <ul className="space-y-1 text-sm text-gray-700">{analysis.strengths.map((s, i) => <li key={i} className="flex gap-2"><span className="text-emerald-400 flex-shrink-0">+</span>{s}</li>)}</ul>
                  </div>
                  <div className="p-4 rounded-xl bg-red-50/50 border border-red-100">
                    <h4 className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">Gaps</h4>
                    <ul className="space-y-1 text-sm text-gray-700">{analysis.gaps.map((g, i) => <li key={i} className="flex gap-2"><span className="text-red-400 flex-shrink-0">-</span>{g}</li>)}</ul>
                  </div>
                  <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100">
                    <h4 className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">Opportunities</h4>
                    <ul className="space-y-1 text-sm text-gray-700">{analysis.opportunities.map((o, i) => <li key={i} className="flex gap-2"><span className="text-blue-400 flex-shrink-0">*</span>{o}</li>)}</ul>
                  </div>
                  <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-100">
                    <h4 className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2">Risks</h4>
                    <ul className="space-y-1 text-sm text-gray-700">{analysis.risks.map((r, i) => <li key={i} className="flex gap-2"><span className="text-amber-400 flex-shrink-0">!</span>{r}</li>)}</ul>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-violet-50/50 border border-violet-100">
                  <h4 className="text-xs font-semibold text-violet-600 uppercase tracking-wide mb-2">Action Items</h4>
                  <ul className="space-y-1 text-sm text-gray-700">{analysis.actionItems.map((a, i) => <li key={i} className="flex gap-2"><span className="text-violet-400 flex-shrink-0 font-bold">{i+1}.</span>{a}</li>)}</ul>
                </div>

                {analysis.riskAnalysis && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">12-Lens Risk Analysis</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {analysis.riskAnalysis.koRisks && analysis.riskAnalysis.koRisks.length > 0 && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                          <h5 className="text-xs font-semibold text-red-700 mb-1.5 flex items-center gap-1.5">Knock-Out Risks <span className="px-1.5 py-0.5 text-[10px] bg-red-200 text-red-800 rounded">{analysis.riskAnalysis.koRisks.length}</span></h5>
                          <ul className="space-y-0.5 text-xs text-red-700">{analysis.riskAnalysis.koRisks.map((r, i) => <li key={i}>- {r}</li>)}</ul>
                        </div>
                      )}
                      {analysis.riskAnalysis.ambiguities && analysis.riskAnalysis.ambiguities.length > 0 && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                          <h5 className="text-xs font-semibold text-amber-700 mb-1.5 flex items-center gap-1.5">Ambiguities <span className="px-1.5 py-0.5 text-[10px] bg-amber-200 text-amber-800 rounded">{analysis.riskAnalysis.ambiguities.length}</span></h5>
                          <ul className="space-y-0.5 text-xs text-amber-700">{analysis.riskAnalysis.ambiguities.map((a, i) => <li key={i}>- {a}</li>)}</ul>
                        </div>
                      )}
                      {analysis.riskAnalysis.contradictions && analysis.riskAnalysis.contradictions.length > 0 && (
                        <div className="p-3 bg-violet-50 border border-violet-200 rounded-xl">
                          <h5 className="text-xs font-semibold text-violet-700 mb-1.5 flex items-center gap-1.5">Contradictions <span className="px-1.5 py-0.5 text-[10px] bg-violet-200 text-violet-800 rounded">{analysis.riskAnalysis.contradictions.length}</span></h5>
                          <ul className="space-y-0.5 text-xs text-violet-700">{analysis.riskAnalysis.contradictions.map((c, i) => <li key={i}>- {c}</li>)}</ul>
                        </div>
                      )}
                      {analysis.riskAnalysis.missingInfo && analysis.riskAnalysis.missingInfo.length > 0 && (
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                          <h5 className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5">Missing Info <span className="px-1.5 py-0.5 text-[10px] bg-gray-200 text-gray-700 rounded">{analysis.riskAnalysis.missingInfo.length}</span></h5>
                          <ul className="space-y-0.5 text-xs text-gray-600">{analysis.riskAnalysis.missingInfo.map((m, i) => <li key={i}>- {m}</li>)}</ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {analysis.contractConditions && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Contract Conditions</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {analysis.contractConditions.warranty && (
                        <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
                          <h5 className="text-xs font-semibold text-blue-600 mb-1">Warranty</h5>
                          <p className="text-xs text-gray-700">{analysis.contractConditions.warranty}</p>
                        </div>
                      )}
                      {analysis.contractConditions.penalties && (
                        <div className="p-3 bg-red-50/50 border border-red-100 rounded-xl">
                          <h5 className="text-xs font-semibold text-red-600 mb-1">Penalties</h5>
                          <p className="text-xs text-gray-700">{analysis.contractConditions.penalties}</p>
                        </div>
                      )}
                      {analysis.contractConditions.liability && (
                        <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl">
                          <h5 className="text-xs font-semibold text-amber-600 mb-1">Liability</h5>
                          <p className="text-xs text-gray-700">{analysis.contractConditions.liability}</p>
                        </div>
                      )}
                      {analysis.contractConditions.ip && (
                        <div className="p-3 bg-violet-50/50 border border-violet-100 rounded-xl">
                          <h5 className="text-xs font-semibold text-violet-600 mb-1">IP</h5>
                          <p className="text-xs text-gray-700">{analysis.contractConditions.ip}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── NvI Questions Tab ── */}
            {analysis && analysisTab === 'nvi' && (
              <div>
                {analysis.questionPriorities && analysis.questionPriorities.length > 0 ? (
                  <div className="space-y-3">
                    {analysis.questionPriorities
                      .slice().sort((a, b) => b.totalScore - a.totalScore)
                      .map((question, index) => {
                        const priority = question.totalScore >= 6 ? 'HIGH' : question.totalScore >= 4 ? 'MEDIUM' : 'LOW';
                        const colors = priority === 'HIGH'
                          ? { bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-700', accent: 'border-red-400', text: 'text-red-700' }
                          : priority === 'MEDIUM'
                          ? { bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700', accent: 'border-amber-400', text: 'text-amber-700' }
                          : { bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', accent: 'border-emerald-400', text: 'text-emerald-700' };

                        return (
                          <div key={index} className={`p-4 ${colors.bg} border ${colors.border} rounded-xl`}>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-[10px] font-semibold bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded uppercase">{question.lens}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${colors.badge}`}>{priority} ({question.totalScore})</span>
                            </div>
                            <p className="text-sm text-gray-700 mb-3"><strong>Issue:</strong> {question.issue}</p>

                            <div className="grid grid-cols-5 gap-2 mb-3">
                              {[
                                { label: 'KO', value: question.koRisk, max: 3 },
                                { label: 'MEAT', value: question.meatImpact, max: 3 },
                                { label: '€', value: question.euroImpact, max: 3 },
                                { label: 'Time', value: question.timeImpact, max: 3 },
                                { label: 'Evidence', value: question.evidenceRisk, max: 3 },
                              ].map((dim) => (
                                <div key={dim.label} className="text-center">
                                  <span className="text-[10px] text-gray-400 block">{dim.label}</span>
                                  <span className={`text-xs font-bold tabular-nums ${dim.value >= 2 ? colors.text : 'text-gray-400'}`}>{dim.value}/{dim.max}</span>
                                </div>
                              ))}
                            </div>

                            <div className={`p-3 bg-white/60 rounded-lg border-l-3 ${colors.accent}`}>
                              <p className="text-xs font-medium text-gray-500 mb-1">Suggested Question</p>
                              <p className="text-sm text-gray-700 italic">{question.suggestedQuestion}</p>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic py-8 text-center">No NvI questions available. Run analysis to generate prioritized questions.</p>
                )}
              </div>
            )}

            {/* ── Legal Tab ── */}
            {analysisTab === 'legal' && (
              <div>
                {legalAnalysis ? (
                  <div className="space-y-5">
                    {legalAnalysis.dealbreakers && legalAnalysis.dealbreakers.length > 0 && (
                      <div className="p-4 bg-red-50 border-2 border-red-300 rounded-xl">
                        <h4 className="text-xs font-bold text-red-800 uppercase tracking-wide mb-2">Dealbreakers</h4>
                        <ul className="space-y-1 text-sm">{legalAnalysis.dealbreakers.map((d, i) => <li key={i} className="text-red-700 font-medium">- {d}</li>)}</ul>
                        <p className="mt-2 text-[10px] text-red-500 italic">Participation inadvisable without negotiation or clarification.</p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="text-center p-4 bg-gray-50 rounded-xl">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Compliance</p>
                        <p className={`text-lg font-bold mt-1 ${getComplianceStatusColor(legalAnalysis.compliance_status)}`}>{legalAnalysis.compliance_status}</p>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-xl">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Score</p>
                        <p className={`text-2xl font-black tabular-nums mt-1 ${legalAnalysis.compliance_score >= 80 ? 'text-emerald-600' : legalAnalysis.compliance_score >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{legalAnalysis.compliance_score}%</p>
                      </div>
                      <div className="text-center p-4 bg-indigo-50 rounded-xl border border-indigo-200">
                        <p className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wide">Risk Premium</p>
                        <p className="text-xl font-black text-indigo-700 mt-1">{legalAnalysis.total_risk_premium || 'TBD'}</p>
                      </div>
                    </div>

                    {legalAnalysis.risk_matrix && legalAnalysis.risk_matrix.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Risk Matrix</h4>
                        <div className="overflow-x-auto rounded-xl border border-gray-200">
                          <table className="min-w-full">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Category</th>
                                <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Risk</th>
                                <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Impact</th>
                                <th className="px-4 py-2 text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wider">P</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {legalAnalysis.risk_matrix.slice().sort((a, b) => b.priority - a.priority).map((item, i) => (
                                <tr key={i} className="hover:bg-gray-50/50">
                                  <td className="px-4 py-2.5 text-xs font-medium text-gray-800">{item.category}</td>
                                  <td className="px-4 py-2.5 text-xs text-gray-600">{item.risk}</td>
                                  <td className="px-4 py-2.5 text-xs font-medium text-amber-600">{item.price_impact}</td>
                                  <td className="px-4 py-2.5 text-center"><span className={`px-1.5 py-0.5 text-[10px] font-bold rounded border ${getPriorityColor(item.priority)}`}>P{item.priority}</span></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {legalAnalysis.detailed_findings && legalAnalysis.detailed_findings.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Detailed Findings</h4>
                        <div className="space-y-1.5">
                          {legalAnalysis.detailed_findings.map((finding, index) => (
                            <div key={index} className="border border-gray-200 rounded-xl overflow-hidden">
                              <button onClick={() => toggleFinding(index)} className="w-full px-4 py-2.5 flex justify-between items-center bg-gray-50/60 hover:bg-gray-100/60 transition-colors">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-gray-800">{finding.category}</span>
                                  <span className={`px-1.5 py-0.5 text-[10px] rounded font-medium ${getLegalRecommendationColor(finding.recommendation)}`}>{finding.recommendation}</span>
                                </div>
                                <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expandedFindings.has(index) ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                              </button>
                              {expandedFindings.has(index) && (
                                <div className="px-4 py-3 space-y-2.5 bg-white">
                                  <div><h6 className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Provisions</h6><ul className="text-xs text-gray-700 space-y-0.5">{finding.provisions_found.map((p, pi) => <li key={pi}>- {p}</li>)}</ul></div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                    <div><h6 className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Market Standard</h6><p className="text-xs text-gray-700">{finding.market_standard}</p></div>
                                    <div><h6 className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Deviation</h6><p className="text-xs text-gray-700">{finding.deviation}</p></div>
                                  </div>
                                  <div className="p-2 bg-amber-50 rounded-lg"><h6 className="text-[10px] font-semibold text-amber-600 uppercase mb-0.5">Financial Impact</h6><p className="text-xs font-medium text-amber-800">{finding.financial_impact}</p></div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {legalAnalysis.nvi_questions && legalAnalysis.nvi_questions.length > 0 && (
                      <div className="p-4 bg-violet-50/50 border border-violet-100 rounded-xl">
                        <h4 className="text-xs font-semibold text-violet-600 uppercase tracking-wide mb-2">NvI Questions</h4>
                        <ol className="space-y-1.5 text-sm">{legalAnalysis.nvi_questions.map((q, i) => <li key={i} className="text-gray-700"><span className="font-bold text-violet-500 mr-1.5">{i+1}.</span>{q}</li>)}</ol>
                      </div>
                    )}

                    {legalAnalysis.negotiation_points && legalAnalysis.negotiation_points.length > 0 && (
                      <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-xl">
                        <h4 className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2">Negotiation Points</h4>
                        <ul className="space-y-1 text-sm text-gray-700">{legalAnalysis.negotiation_points.map((p, i) => <li key={i}>- {p}</li>)}</ul>
                      </div>
                    )}

                    {legalAnalysis.pricing_structure && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Pricing Structure</h4>
                        <div className="overflow-x-auto rounded-xl border border-gray-200">
                          <table className="min-w-full">
                            <tbody className="divide-y divide-gray-100">
                              <tr className="bg-gray-50/60"><td className="px-4 py-2.5 text-xs font-medium text-gray-600">Base Price Note</td><td className="px-4 py-2.5 text-xs text-gray-700">{legalAnalysis.pricing_structure.base_price_note}</td></tr>
                              <tr><td className="px-4 py-2.5 text-xs font-medium text-gray-600">Warranties</td><td className="px-4 py-2.5 text-xs font-medium text-amber-600">{legalAnalysis.pricing_structure.risk_premium_warranties}</td></tr>
                              <tr className="bg-gray-50/60"><td className="px-4 py-2.5 text-xs font-medium text-gray-600">Penalties</td><td className="px-4 py-2.5 text-xs font-medium text-amber-600">{legalAnalysis.pricing_structure.risk_premium_penalties}</td></tr>
                              <tr><td className="px-4 py-2.5 text-xs font-medium text-gray-600">Other</td><td className="px-4 py-2.5 text-xs font-medium text-amber-600">{legalAnalysis.pricing_structure.risk_premium_other}</td></tr>
                              <tr className="bg-indigo-50"><td className="px-4 py-2.5 text-xs font-bold text-indigo-800">Total Margin</td><td className="px-4 py-2.5 text-xs font-bold text-indigo-800">{legalAnalysis.pricing_structure.total_recommended_margin}</td></tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-4 rounded-xl bg-red-50/50 border border-red-100">
                        <h4 className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">Key Risks</h4>
                        <ul className="space-y-1 text-xs text-gray-700">{legalAnalysis.key_risks.map((r, i) => <li key={i}>- {r}</li>)}</ul>
                      </div>
                      <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100">
                        <h4 className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">Action Items</h4>
                        <ul className="space-y-1 text-xs text-gray-700">{legalAnalysis.action_items.map((a, i) => <li key={i}>- {a}</li>)}</ul>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <p className="text-sm text-gray-500 mb-3">No legal analysis available for this tender.</p>
                    <button
                      onClick={() => handleLegalAnalysis(selectedTender)}
                      disabled={isLegalAnalyzing}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      {isLegalAnalyzing ? 'Running Analysis...' : 'Run Legal Analysis'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

                      {/* Analyzing spinner */}
                      {(isAnalyzing || isLegalAnalyzing) && (
                        <div className="px-5 py-8 text-center border-t border-gray-100">
                          <div className="inline-flex items-center gap-2">
                            <svg className="animate-spin w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <span className="text-xs font-medium text-gray-500">{isLegalAnalyzing ? 'Running legal analysis...' : 'Analyzing tender...'}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}