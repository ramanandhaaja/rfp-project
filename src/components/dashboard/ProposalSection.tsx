'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { generateProposalPDF } from '@/lib/pdf-generator';
import ProposalView from './ProposalView';

interface TenderDocument {
  id: string;
  title: string;
  referenceNumber: string;
  description: string;
}

interface ProposalSection {
  title: string;
  content: string;
  type: string;
}

interface ExecutiveSummaryItem {
  requirement: string;
  solution: string;
  benefit: string;
}

interface MethodologyPhase {
  phase: string;
  activities: string;
  deliverables: string;
}

interface TeamMember {
  role: string;
  profile: string;
  responsibility: string;
}

interface RiskItem {
  risk: string;
  impact: string;
  mitigation: string;
}

interface GeneratedProposal {
  title: string;
  sections: ProposalSection[];
  executiveSummaryTable: ExecutiveSummaryItem[];
  methodologyPhases: MethodologyPhase[];
  teamStructure: TeamMember[];
  riskMatrix: RiskItem[];
}

interface NvIQuestion {
  id?: string;
  lens: string;
  issue: string;
  question: string;
  koRisk: number;
  meatImpact: number;
  euroImpact: number;
  timeImpact: number;
  evidenceRisk: number;
  priorityScore: number;
  status?: string;
}

export default function ProposalSection() {
  const { data: session } = useSession();
  const [tenders, setTenders] = useState<TenderDocument[]>([]);
  const [selectedTender, setSelectedTender] = useState<TenderDocument | null>(null);
  const [proposal, setProposal] = useState<GeneratedProposal | null>(null);
  const [nviQuestions, setNviQuestions] = useState<NvIQuestion[]>([]);
  const [isGeneratingProposal, setIsGeneratingProposal] = useState(false);
  const [isGeneratingNvI, setIsGeneratingNvI] = useState(false);
  const [activeTab, setActiveTab] = useState<'proposal' | 'nvi'>('proposal');
  const [tendersWithProposals, setTendersWithProposals] = useState<Set<string>>(new Set());
  const [tendersWithNvI, setTendersWithNvI] = useState<Set<string>>(new Set());
  const [showProposalView, setShowProposalView] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (session) {
      fetchTendersAndStatuses();
    }
  }, [session]);

  useEffect(() => {
    if (selectedTender) {
      loadExistingData(selectedTender.id);
    }
  }, [selectedTender]);

  const fetchTendersAndStatuses = async () => {
    try {
      const response = await fetch('/api/tenders/import');
      if (!response.ok) return;
      const data = await response.json();
      const tenderList: TenderDocument[] = data.tenders || [];
      setTenders(tenderList);

      const statusResults = await Promise.all(
        tenderList.map(async (tender) => {
          const [proposalRes, nviRes] = await Promise.all([
            fetch(`/api/proposals/get?tenderId=${tender.id}`),
            fetch(`/api/nvi/generate?tenderId=${tender.id}`),
          ]);
          const hasProposal = proposalRes.ok && !!(await proposalRes.json()).proposal;
          const hasNvI = nviRes.ok && ((await nviRes.json()).questions?.length ?? 0) > 0;
          return { id: tender.id, hasProposal, hasNvI };
        })
      );

      setTendersWithProposals(new Set(statusResults.filter(r => r.hasProposal).map(r => r.id)));
      setTendersWithNvI(new Set(statusResults.filter(r => r.hasNvI).map(r => r.id)));
    } catch (error) {
      console.error('Error fetching tenders and statuses:', error);
    }
  };

  const loadExistingData = async (tenderId: string) => {
    try {
      // Load existing proposal
      const proposalResponse = await fetch(`/api/proposals/get?tenderId=${tenderId}`);
      if (proposalResponse.ok) {
        const proposalData = await proposalResponse.json();
        if (proposalData.proposal) {
          setProposal(proposalData.proposal.content);
          setTendersWithProposals(prev => new Set([...prev, tenderId]));
        }
      }

      // Load existing NvI questions
      const nviResponse = await fetch(`/api/nvi/generate?tenderId=${tenderId}`);
      if (nviResponse.ok) {
        const nviData = await nviResponse.json();
        if (nviData.questions && nviData.questions.length > 0) {
          setNviQuestions(nviData.questions.map((q: any) => ({
            id: q.id,
            lens: q.lens,
            issue: q.issue,
            question: q.question,
            koRisk: q.ko_risk,
            meatImpact: q.meat_impact,
            euroImpact: q.euro_impact,
            timeImpact: q.time_impact,
            evidenceRisk: q.evidence_risk,
            priorityScore: q.priority_score,
            status: q.status
          })));
          setTendersWithNvI(prev => new Set([...prev, tenderId]));
        }
      }
    } catch (error) {
      console.error('Error loading existing data:', error);
    }
  };

  const generateProposal = async (tender: TenderDocument) => {
    setIsGeneratingProposal(true);
    setSelectedTender(tender);
    setActiveTab('proposal');

    try {
      const response = await fetch('/api/proposals/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenderId: tender.id })
      });

      const result = await response.json();

      if (response.ok) {
        setProposal(result.proposal);
        setTendersWithProposals(prev => new Set([...prev, tender.id]));
        setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      } else {
        alert('Failed to generate proposal: ' + result.error);
      }
    } catch (error) {
      console.error('Error generating proposal:', error);
      alert('Failed to generate proposal');
    } finally {
      setIsGeneratingProposal(false);
    }
  };

  const generateNvIQuestions = async (tender: TenderDocument) => {
    setIsGeneratingNvI(true);
    setSelectedTender(tender);
    setActiveTab('nvi');

    try {
      const response = await fetch('/api/nvi/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenderId: tender.id })
      });

      const result = await response.json();

      if (response.ok) {
        setNviQuestions(result.questions);
        setTendersWithNvI(prev => new Set([...prev, tender.id]));
        setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      } else {
        alert('Failed to generate NvI questions: ' + result.error);
      }
    } catch (error) {
      console.error('Error generating NvI questions:', error);
      alert('Failed to generate NvI questions');
    } finally {
      setIsGeneratingNvI(false);
    }
  };

  const exportProposal = () => {
    if (!proposal) return;

    let exportContent = `# ${proposal.title}\n\n`;

    proposal.sections.forEach(section => {
      exportContent += `## ${section.title}\n\n${section.content}\n\n`;

      if (section.type === 'executive_summary' && proposal.executiveSummaryTable.length > 0) {
        exportContent += '### Executive Summary Table\n\n';
        exportContent += '| Key Requirement | Our Solution | Benefit for Client |\n';
        exportContent += '|-----------------|--------------|-------------------|\n';
        proposal.executiveSummaryTable.forEach(item => {
          exportContent += `| ${item.requirement} | ${item.solution} | ${item.benefit} |\n`;
        });
        exportContent += '\n';
      }

      if (section.type === 'methodology' && proposal.methodologyPhases.length > 0) {
        exportContent += '### Methodology Phases\n\n';
        exportContent += '| Phase | Activities | Deliverables |\n';
        exportContent += '|-------|------------|-------------|\n';
        proposal.methodologyPhases.forEach(phase => {
          exportContent += `| ${phase.phase} | ${phase.activities} | ${phase.deliverables} |\n`;
        });
        exportContent += '\n';
      }
    });

    const blob = new Blob([exportContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${proposal.title.replace(/[^a-z0-9]/gi, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportProposalPDF = () => {
    if (!proposal || !selectedTender) return;

    try {
      generateProposalPDF(proposal, selectedTender);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const exportNvIQuestions = () => {
    if (nviQuestions.length === 0) return;

    let exportContent = `# Nota van Inlichtingen - ${selectedTender?.title}\n\n`;
    exportContent += `**Reference:** ${selectedTender?.referenceNumber}\n\n`;
    exportContent += '## Priority Questions (Score ≥ 6)\n\n';

    const highPriorityQuestions = nviQuestions.filter(q => q.priorityScore >= 6);
    const mediumPriorityQuestions = nviQuestions.filter(q => q.priorityScore >= 4 && q.priorityScore < 6);
    const lowPriorityQuestions = nviQuestions.filter(q => q.priorityScore < 4);

    [
      { title: 'High Priority Questions (Score ≥ 6)', questions: highPriorityQuestions },
      { title: 'Medium Priority Questions (Score 4-5)', questions: mediumPriorityQuestions },
      { title: 'Low Priority Questions (Score < 4)', questions: lowPriorityQuestions }
    ].forEach(section => {
      if (section.questions.length > 0) {
        exportContent += `### ${section.title}\n\n`;
        section.questions.forEach((q, index) => {
          exportContent += `**${index + 1}. ${q.lens}** (Score: ${q.priorityScore})\n\n`;
          exportContent += `*Issue:* ${q.issue}\n\n`;
          exportContent += `*Question:* ${q.question}\n\n`;
          exportContent += `*Risk Breakdown:* KO:${q.koRisk} | MEAT:${q.meatImpact} | €:${q.euroImpact} | Time:${q.timeImpact} | Evidence:${q.evidenceRisk}\n\n`;
          exportContent += '---\n\n';
        });
      }
    });

    const blob = new Blob([exportContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NvI_Questions_${selectedTender?.referenceNumber?.replace(/[^a-z0-9]/gi, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getPriorityLabel = (score: number) => {
    if (score >= 6) return 'HIGH';
    if (score >= 4) return 'MEDIUM';
    return 'LOW';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Proposal & NvI</h2>
        <p className="text-sm text-gray-500 mt-1">Generate proposals and clarification questions for your tenders</p>
      </div>

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
            <p className="text-sm font-medium text-gray-600">No tenders available</p>
            <p className="text-xs text-gray-400 mt-1">Upload and analyze a tender document first</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tenders.map((tender) => {
              const isSelected = selectedTender?.id === tender.id;
              const hasProposal = tendersWithProposals.has(tender.id);
              const hasNvI = tendersWithNvI.has(tender.id);
              const hasResults = isSelected && (proposal || nviQuestions.length > 0);

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
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            hasProposal ? 'bg-emerald-400' : hasNvI ? 'bg-violet-400' : 'bg-gray-300'
                          }`} />
                          <h4 className="text-sm font-semibold text-gray-900 truncate">{tender.title}</h4>
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-1 mb-2">{tender.description}</p>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded bg-slate-100 text-slate-600 uppercase tracking-wide">
                            {tender.referenceNumber}
                          </span>
                          {hasProposal && (
                            <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded bg-emerald-50 text-emerald-600">
                              Proposal
                            </span>
                          )}
                          {hasNvI && (
                            <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded bg-violet-50 text-violet-600">
                              NvI
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => {
                            setSelectedTender(tender);
                            if (!proposal || selectedTender?.id !== tender.id) {
                              generateProposal(tender);
                            }
                          }}
                          disabled={isGeneratingProposal}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${
                            hasProposal && isSelected && proposal
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-indigo-600 text-white hover:bg-indigo-700'
                          }`}
                        >
                          {isGeneratingProposal && isSelected ? 'Generating...' :
                           hasProposal && isSelected && proposal ? 'View Proposal' : 'Generate Proposal'}
                        </button>

                        <button
                          onClick={() => {
                            setSelectedTender(tender);
                            if (nviQuestions.length === 0 || selectedTender?.id !== tender.id) {
                              generateNvIQuestions(tender);
                            } else {
                              setActiveTab('nvi');
                            }
                          }}
                          disabled={isGeneratingNvI}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 transition-colors"
                        >
                          {isGeneratingNvI && isSelected ? 'Running...' : 'NvI'}
                        </button>

                        <button
                          onClick={() => setSelectedTender(isSelected ? null : tender)}
                          className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                          title={isSelected ? 'Collapse' : 'Expand'}
                        >
                          <svg className={`w-3.5 h-3.5 transition-transform ${isSelected ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Inline Results */}
                  {isSelected && (hasResults || isGeneratingProposal || isGeneratingNvI) && (
                    <div ref={resultsRef} className="border-t border-gray-200">
                      {/* Tab Navigation */}
                      <div className="flex border-b border-gray-200 px-4 bg-gray-50/40">
                        <button
                          onClick={() => setActiveTab('proposal')}
                          className={`relative px-4 py-2.5 text-xs font-semibold transition-colors ${
                            activeTab === 'proposal'
                              ? 'text-indigo-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-indigo-600'
                              : 'text-gray-400 hover:text-gray-600'
                          }`}
                        >
                          Proposal {proposal ? '' : ''}
                        </button>
                        <button
                          onClick={() => setActiveTab('nvi')}
                          className={`relative px-4 py-2.5 text-xs font-semibold transition-colors ${
                            activeTab === 'nvi'
                              ? 'text-indigo-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-indigo-600'
                              : 'text-gray-400 hover:text-gray-600'
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            NvI Questions
                            {nviQuestions.length > 0 && (
                              <span className={`px-1.5 py-0.5 text-[10px] rounded-full ${
                                activeTab === 'nvi' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-500'
                              }`}>{nviQuestions.length}</span>
                            )}
                          </span>
                        </button>
                      </div>

                      <div className="p-5">
                        {/* Proposal Tab */}
                        {activeTab === 'proposal' && (
                          <div>
                            {proposal ? (
                              <div className="space-y-4">
                                {/* Export actions */}
                                <div className="flex items-center gap-2 mb-4">
                                  <button
                                    onClick={() => setShowProposalView(true)}
                                    className="px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wide bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                                  >
                                    View Full
                                  </button>
                                  <button
                                    onClick={exportProposal}
                                    className="px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wide bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                                  >
                                    Export MD
                                  </button>
                                  <button
                                    onClick={exportProposalPDF}
                                    className="px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wide bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                                  >
                                    Export PDF
                                  </button>
                                </div>

                                {/* Executive Summary */}
                                {proposal.executiveSummaryTable.length > 0 && (
                                  <div>
                                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Executive Summary</h4>
                                    <div className="overflow-x-auto rounded-xl border border-indigo-200">
                                      <table className="min-w-full">
                                        <thead className="bg-indigo-50/60">
                                          <tr>
                                            <th className="text-left px-4 py-2 text-[10px] font-semibold text-indigo-500 uppercase tracking-wider">Requirement</th>
                                            <th className="text-left px-4 py-2 text-[10px] font-semibold text-indigo-500 uppercase tracking-wider">Solution</th>
                                            <th className="text-left px-4 py-2 text-[10px] font-semibold text-indigo-500 uppercase tracking-wider">Benefit</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-indigo-100">
                                          {proposal.executiveSummaryTable.map((item, index) => (
                                            <tr key={index}>
                                              <td className="px-4 py-2.5 text-xs text-gray-700">{item.requirement}</td>
                                              <td className="px-4 py-2.5 text-xs text-gray-700">{item.solution}</td>
                                              <td className="px-4 py-2.5 text-xs text-gray-700">{item.benefit}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}

                                {/* Sections */}
                                {proposal.sections.map((section, index) => (
                                  <div key={index} className="rounded-xl border border-gray-200 overflow-hidden">
                                    <div className="px-4 py-3 bg-gray-50/60">
                                      <h4 className="text-xs font-semibold text-gray-700">{section.title}</h4>
                                    </div>
                                    <div className="px-4 py-3">
                                      <div className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
                                        {section.content}
                                      </div>

                                      {section.type === 'methodology' && proposal.methodologyPhases.length > 0 && (
                                        <div className="mt-3 overflow-x-auto rounded-lg border border-gray-200">
                                          <table className="min-w-full">
                                            <thead className="bg-gray-50">
                                              <tr>
                                                <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Phase</th>
                                                <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Activities</th>
                                                <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Deliverables</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                              {proposal.methodologyPhases.map((phase, idx) => (
                                                <tr key={idx}>
                                                  <td className="px-3 py-2 text-xs font-medium text-gray-800">{phase.phase}</td>
                                                  <td className="px-3 py-2 text-xs text-gray-600">{phase.activities}</td>
                                                  <td className="px-3 py-2 text-xs text-gray-600">{phase.deliverables}</td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      )}

                                      {section.type === 'organisation' && proposal.teamStructure.length > 0 && (
                                        <div className="mt-3 overflow-x-auto rounded-lg border border-gray-200">
                                          <table className="min-w-full">
                                            <thead className="bg-gray-50">
                                              <tr>
                                                <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Role</th>
                                                <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Profile</th>
                                                <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Responsibility</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                              {proposal.teamStructure.map((member, idx) => (
                                                <tr key={idx}>
                                                  <td className="px-3 py-2 text-xs font-medium text-gray-800">{member.role}</td>
                                                  <td className="px-3 py-2 text-xs text-gray-600">{member.profile}</td>
                                                  <td className="px-3 py-2 text-xs text-gray-600">{member.responsibility}</td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      )}

                                      {section.type === 'risk_management' && proposal.riskMatrix.length > 0 && (
                                        <div className="mt-3 overflow-x-auto rounded-lg border border-gray-200">
                                          <table className="min-w-full">
                                            <thead className="bg-gray-50">
                                              <tr>
                                                <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Risk</th>
                                                <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Impact</th>
                                                <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Mitigation</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                              {proposal.riskMatrix.map((risk, idx) => (
                                                <tr key={idx}>
                                                  <td className="px-3 py-2 text-xs text-gray-700">{risk.risk}</td>
                                                  <td className="px-3 py-2">
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                                      risk.impact === 'High' ? 'bg-red-100 text-red-700' :
                                                      risk.impact === 'Medium' ? 'bg-amber-100 text-amber-700' :
                                                      'bg-emerald-100 text-emerald-700'
                                                    }`}>
                                                      {risk.impact}
                                                    </span>
                                                  </td>
                                                  <td className="px-3 py-2 text-xs text-gray-600">{risk.mitigation}</td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="py-12 text-center">
                                <p className="text-sm text-gray-500 mb-3">No proposal generated for this tender.</p>
                                <button
                                  onClick={() => generateProposal(tender)}
                                  disabled={isGeneratingProposal}
                                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                                >
                                  {isGeneratingProposal ? 'Generating...' : 'Generate Proposal'}
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* NvI Tab */}
                        {activeTab === 'nvi' && (
                          <div>
                            {nviQuestions.length > 0 ? (
                              <div className="space-y-4">
                                {/* Export action */}
                                <div className="flex items-center gap-2 mb-2">
                                  <button
                                    onClick={exportNvIQuestions}
                                    className="px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wide bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                                  >
                                    Export NvI
                                  </button>
                                </div>

                                {/* Priority summary */}
                                <div className="grid grid-cols-3 gap-3">
                                  <div className="text-center p-3 bg-red-50/50 rounded-xl border border-red-100">
                                    <p className="text-[10px] font-semibold text-red-500 uppercase tracking-wide">High</p>
                                    <p className="text-xl font-black text-red-600 tabular-nums">{nviQuestions.filter(q => q.priorityScore >= 6).length}</p>
                                  </div>
                                  <div className="text-center p-3 bg-amber-50/50 rounded-xl border border-amber-100">
                                    <p className="text-[10px] font-semibold text-amber-500 uppercase tracking-wide">Medium</p>
                                    <p className="text-xl font-black text-amber-600 tabular-nums">{nviQuestions.filter(q => q.priorityScore >= 4 && q.priorityScore < 6).length}</p>
                                  </div>
                                  <div className="text-center p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                                    <p className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wide">Low</p>
                                    <p className="text-xl font-black text-emerald-600 tabular-nums">{nviQuestions.filter(q => q.priorityScore < 4).length}</p>
                                  </div>
                                </div>

                                {/* Questions */}
                                <div className="space-y-3">
                                  {nviQuestions
                                    .slice().sort((a, b) => b.priorityScore - a.priorityScore)
                                    .map((question, index) => {
                                      const colors = question.priorityScore >= 6
                                        ? { bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-700', accent: 'border-red-400', text: 'text-red-700' }
                                        : question.priorityScore >= 4
                                        ? { bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700', accent: 'border-amber-400', text: 'text-amber-700' }
                                        : { bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', accent: 'border-emerald-400', text: 'text-emerald-700' };

                                      return (
                                        <div key={index} className={`p-4 ${colors.bg} border ${colors.border} rounded-xl`}>
                                          <div className="flex items-center gap-2 mb-2">
                                            <span className="text-[10px] font-semibold bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded uppercase">{question.lens}</span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${colors.badge}`}>
                                              {getPriorityLabel(question.priorityScore)} ({question.priorityScore})
                                            </span>
                                          </div>

                                          <p className="text-sm text-gray-700 mb-2"><strong>Issue:</strong> {question.issue}</p>

                                          <div className={`p-3 bg-white/60 rounded-lg border-l-3 ${colors.accent} mb-3`}>
                                            <p className="text-xs font-medium text-gray-500 mb-1">Question</p>
                                            <p className="text-sm text-gray-700 italic">{question.question}</p>
                                          </div>

                                          <div className="grid grid-cols-5 gap-2">
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
                                        </div>
                                      );
                                    })}
                                </div>
                              </div>
                            ) : (
                              <div className="py-12 text-center">
                                <p className="text-sm text-gray-500 mb-3">No NvI questions generated for this tender.</p>
                                <button
                                  onClick={() => generateNvIQuestions(tender)}
                                  disabled={isGeneratingNvI}
                                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                                >
                                  {isGeneratingNvI ? 'Generating...' : 'Generate NvI Questions'}
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Inline loading */}
                        {(isGeneratingProposal || isGeneratingNvI) && (
                          <div className="py-8 text-center">
                            <div className="inline-flex items-center gap-2">
                              <svg className="animate-spin w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              <span className="text-xs font-medium text-gray-500">
                                {isGeneratingProposal ? 'Generating proposal...' : 'Generating NvI questions...'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Proposal View Modal */}
      {showProposalView && proposal && selectedTender && (
        <ProposalView
          proposal={proposal}
          tender={selectedTender}
          onClose={() => setShowProposalView(false)}
        />
      )}
    </div>
  );
}