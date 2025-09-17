'use client';

import { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (session) {
      fetchTenders();
      loadAllTenderStatuses();
    }
  }, [session]);

  useEffect(() => {
    if (selectedTender) {
      loadExistingData(selectedTender.id);
    }
  }, [selectedTender]);

  const fetchTenders = async () => {
    try {
      const response = await fetch('/api/tenders/import');
      if (response.ok) {
        const data = await response.json();
        setTenders(data.tenders || []);
      }
    } catch (error) {
      console.error('Error fetching tenders:', error);
    }
  };

  const loadAllTenderStatuses = async () => {
    try {
      const tendersResponse = await fetch('/api/tenders/import');
      if (tendersResponse.ok) {
        const tendersData = await tendersResponse.json();
        const tenderList = tendersData.tenders || [];

        // Check each tender for existing proposals and NvI questions
        for (const tender of tenderList) {
          // Check for proposals
          const proposalResponse = await fetch(`/api/proposals/get?tenderId=${tender.id}`);
          if (proposalResponse.ok) {
            const proposalData = await proposalResponse.json();
            if (proposalData.proposal) {
              setTendersWithProposals(prev => new Set([...prev, tender.id]));
            }
          }

          // Check for NvI questions
          const nviResponse = await fetch(`/api/nvi/generate?tenderId=${tender.id}`);
          if (nviResponse.ok) {
            const nviData = await nviResponse.json();
            if (nviData.questions && nviData.questions.length > 0) {
              setTendersWithNvI(prev => new Set([...prev, tender.id]));
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading tender statuses:', error);
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

  const getPriorityColor = (score: number) => {
    if (score >= 6) return 'red';
    if (score >= 4) return 'yellow';
    return 'green';
  };

  const getPriorityLabel = (score: number) => {
    if (score >= 6) return 'HIGH';
    if (score >= 4) return 'MEDIUM';
    return 'LOW';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Proposal & NvI Generation</h2>
        <p className="text-gray-600 mb-6">
          Generate professional proposals and strategic clarification questions for your tenders.
        </p>
      </div>

      {/* Tender Selection */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Select Tender for Proposal Generation</h3>

        {tenders.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No tender documents available.</p>
            <p className="text-sm">Please upload and analyze a tender document first.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tenders.map((tender) => (
              <div key={tender.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-start gap-2">
                      <h4 className="font-medium text-lg flex-1">{tender.title}</h4>
                      <div className="flex gap-1">
                        {tendersWithProposals.has(tender.id) && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
                            📄 Proposal
                          </span>
                        )}
                        {tendersWithNvI.has(tender.id) && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full flex items-center gap-1">
                            📋 NvI
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{tender.description}</p>
                    <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded mt-2">
                      {tender.referenceNumber}
                    </span>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => {
                        setSelectedTender(tender);
                        if (!proposal || selectedTender?.id !== tender.id) {
                          generateProposal(tender);
                        }
                      }}
                      disabled={isGeneratingProposal}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isGeneratingProposal && selectedTender?.id === tender.id ? 'Generating...' :
                       (proposal && selectedTender?.id === tender.id ? 'View Proposal' : 'Generate Proposal')}
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
                      className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
                    >
                      {isGeneratingNvI && selectedTender?.id === tender.id ? 'Generating...' :
                       (nviQuestions.length > 0 && selectedTender?.id === tender.id ? 'View NvI' : 'Generate NvI')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Results */}
      {(proposal || nviQuestions.length > 0) && selectedTender && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">
              Results for: {selectedTender.title}
            </h3>
            <div className="flex gap-2">
              {proposal && (
                <>
                  <button
                    onClick={() => setShowProposalView(true)}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    👁️ View Proposal
                  </button>
                  <button
                    onClick={exportProposal}
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                  >
                    📄 Export MD
                  </button>
                  <button
                    onClick={exportProposalPDF}
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                  >
                    📑 Export PDF
                  </button>
                </>
              )}
              {nviQuestions.length > 0 && (
                <button
                  onClick={exportNvIQuestions}
                  className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
                >
                  📋 Export NvI
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b mb-6">
            <button
              onClick={() => setActiveTab('proposal')}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'proposal'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              📄 Proposal ({proposal ? 'Generated' : 'Not Generated'})
            </button>
            <button
              onClick={() => setActiveTab('nvi')}
              className={`px-4 py-2 text-sm font-medium ml-6 ${
                activeTab === 'nvi'
                  ? 'border-b-2 border-purple-500 text-purple-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              📋 NvI Questions ({nviQuestions.length} Generated)
            </button>
          </div>

          {/* Proposal Tab */}
          {activeTab === 'proposal' && proposal && (
            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">📋 Executive Summary</h4>
                {proposal.executiveSummaryTable.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-blue-200">
                          <th className="text-left p-2 font-medium text-blue-800">Key Requirement</th>
                          <th className="text-left p-2 font-medium text-blue-800">Our Solution</th>
                          <th className="text-left p-2 font-medium text-blue-800">Client Benefit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {proposal.executiveSummaryTable.map((item, index) => (
                          <tr key={index} className="border-b border-blue-100">
                            <td className="p-2 text-blue-700">{item.requirement}</td>
                            <td className="p-2 text-blue-700">{item.solution}</td>
                            <td className="p-2 text-blue-700">{item.benefit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {proposal.sections.map((section, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">{section.title}</h4>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">
                    {section.content}
                  </div>

                  {/* Special rendering for methodology */}
                  {section.type === 'methodology' && proposal.methodologyPhases.length > 0 && (
                    <div className="mt-4 overflow-x-auto">
                      <table className="min-w-full text-sm border border-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left p-3 font-medium">Phase</th>
                            <th className="text-left p-3 font-medium">Activities</th>
                            <th className="text-left p-3 font-medium">Deliverables</th>
                          </tr>
                        </thead>
                        <tbody>
                          {proposal.methodologyPhases.map((phase, idx) => (
                            <tr key={idx} className="border-t border-gray-200">
                              <td className="p-3 font-medium">{phase.phase}</td>
                              <td className="p-3">{phase.activities}</td>
                              <td className="p-3">{phase.deliverables}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Special rendering for organization */}
                  {section.type === 'organisation' && proposal.teamStructure.length > 0 && (
                    <div className="mt-4 overflow-x-auto">
                      <table className="min-w-full text-sm border border-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left p-3 font-medium">Role</th>
                            <th className="text-left p-3 font-medium">Profile</th>
                            <th className="text-left p-3 font-medium">Responsibility</th>
                          </tr>
                        </thead>
                        <tbody>
                          {proposal.teamStructure.map((member, idx) => (
                            <tr key={idx} className="border-t border-gray-200">
                              <td className="p-3 font-medium">{member.role}</td>
                              <td className="p-3">{member.profile}</td>
                              <td className="p-3">{member.responsibility}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Special rendering for risk management */}
                  {section.type === 'risk_management' && proposal.riskMatrix.length > 0 && (
                    <div className="mt-4 overflow-x-auto">
                      <table className="min-w-full text-sm border border-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left p-3 font-medium">Risk</th>
                            <th className="text-left p-3 font-medium">Impact</th>
                            <th className="text-left p-3 font-medium">Mitigation</th>
                          </tr>
                        </thead>
                        <tbody>
                          {proposal.riskMatrix.map((risk, idx) => (
                            <tr key={idx} className="border-t border-gray-200">
                              <td className="p-3">{risk.risk}</td>
                              <td className="p-3">
                                <span className={`px-2 py-1 rounded text-xs ${
                                  risk.impact === 'High' ? 'bg-red-100 text-red-700' :
                                  risk.impact === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-green-100 text-green-700'
                                }`}>
                                  {risk.impact}
                                </span>
                              </td>
                              <td className="p-3">{risk.mitigation}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* NvI Questions Tab */}
          {activeTab === 'nvi' && nviQuestions.length > 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-600">High Priority</p>
                  <p className="text-2xl font-bold text-red-700">
                    {nviQuestions.filter(q => q.priorityScore >= 6).length}
                  </p>
                  <p className="text-xs text-red-500">Score ≥ 6</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-yellow-600">Medium Priority</p>
                  <p className="text-2xl font-bold text-yellow-700">
                    {nviQuestions.filter(q => q.priorityScore >= 4 && q.priorityScore < 6).length}
                  </p>
                  <p className="text-xs text-yellow-500">Score 4-5</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-600">Low Priority</p>
                  <p className="text-2xl font-bold text-green-700">
                    {nviQuestions.filter(q => q.priorityScore < 4).length}
                  </p>
                  <p className="text-xs text-green-500">Score &lt; 4</p>
                </div>
              </div>

              <div className="space-y-3">
                {nviQuestions
                  .sort((a, b) => b.priorityScore - a.priorityScore)
                  .map((question, index) => {
                    const priorityColor = getPriorityColor(question.priorityScore);
                    const priorityLabel = getPriorityLabel(question.priorityScore);

                    const getColorClasses = (color: string) => {
                      if (color === 'red') {
                        return {
                          bg: 'bg-red-50',
                          border: 'border-red-200',
                          badgeBg: 'bg-red-200',
                          badgeText: 'text-red-800',
                          text: 'text-red-700',
                          contentBg: 'bg-red-100',
                          contentBorder: 'border-red-400'
                        };
                      } else if (color === 'yellow') {
                        return {
                          bg: 'bg-yellow-50',
                          border: 'border-yellow-200',
                          badgeBg: 'bg-yellow-200',
                          badgeText: 'text-yellow-800',
                          text: 'text-yellow-700',
                          contentBg: 'bg-yellow-100',
                          contentBorder: 'border-yellow-400'
                        };
                      } else {
                        return {
                          bg: 'bg-green-50',
                          border: 'border-green-200',
                          badgeBg: 'bg-green-200',
                          badgeText: 'text-green-800',
                          text: 'text-green-700',
                          contentBg: 'bg-green-100',
                          contentBorder: 'border-green-400'
                        };
                      }
                    };

                    const colorClasses = getColorClasses(priorityColor);

                    return (
                      <div key={index} className={`p-4 ${colorClasses.bg} border ${colorClasses.border} rounded-lg`}>
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {question.lens}
                            </span>
                            <span className={`text-xs ${colorClasses.badgeBg} ${colorClasses.badgeText} px-2 py-1 rounded font-bold`}>
                              {priorityLabel} - {question.priorityScore}
                            </span>
                          </div>
                        </div>

                        <p className={`text-sm ${colorClasses.text} mb-2`}>
                          <strong>Issue:</strong> {question.issue}
                        </p>

                        <p className={`text-sm ${colorClasses.text} mb-3 p-3 ${colorClasses.contentBg} rounded border-l-4 ${colorClasses.contentBorder}`}>
                          <strong>Question:</strong> {question.question}
                        </p>

                        <div className="grid grid-cols-5 gap-2">
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
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}

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