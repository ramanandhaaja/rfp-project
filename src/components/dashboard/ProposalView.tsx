'use client';

import { useState } from 'react';
import { generateProposalPDF } from '@/lib/pdf-generator';

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

interface TenderDocument {
  id: string;
  title: string;
  referenceNumber: string;
  description: string;
}

interface ProposalViewProps {
  proposal: GeneratedProposal;
  tender: TenderDocument;
  onClose: () => void;
}

export default function ProposalView({ proposal, tender, onClose }: ProposalViewProps) {
  const [activeSection, setActiveSection] = useState(0);

  const exportProposalPDF = () => {
    try {
      generateProposalPDF(proposal, tender);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const exportProposalMarkdown = () => {
    let exportContent = `# ${proposal.title}\n\n`;
    exportContent += `**Reference:** ${tender.referenceNumber}\n`;
    exportContent += `**Date:** ${new Date().toLocaleDateString()}\n\n`;

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

      if (section.type === 'organisation' && proposal.teamStructure.length > 0) {
        exportContent += '### Team Structure\n\n';
        exportContent += '| Role | Profile | Responsibility |\n';
        exportContent += '|------|---------|----------------|\n';
        proposal.teamStructure.forEach(member => {
          exportContent += `| ${member.role} | ${member.profile} | ${member.responsibility} |\n`;
        });
        exportContent += '\n';
      }

      if (section.type === 'risk_management' && proposal.riskMatrix.length > 0) {
        exportContent += '### Risk Management Matrix\n\n';
        exportContent += '| Risk | Impact | Mitigation |\n';
        exportContent += '|------|--------|------------|\n';
        proposal.riskMatrix.forEach(risk => {
          exportContent += `| ${risk.risk} | ${risk.impact} | ${risk.mitigation} |\n`;
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

  const getSectionIcon = (type: string) => {
    switch (type) {
      case 'company_intro': return '🏢';
      case 'executive_summary': return '📋';
      case 'methodology': return '🔄';
      case 'organisation': return '👥';
      case 'risk_management': return '⚠️';
      case 'sustainability': return '🌱';
      case 'why_choose_us': return '⭐';
      default: return '📄';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[95vh] overflow-hidden flex">
        {/* Sidebar Navigation */}
        <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-gray-900">Proposal View</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ×
              </button>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-1">{proposal.title}</h3>
              <p className="text-sm text-gray-600">Ref: {tender.referenceNumber}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-4 border-b border-gray-200">
            <div className="space-y-2">
              <button
                onClick={exportProposalPDF}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 flex items-center justify-center gap-2"
              >
                📑 Export PDF
              </button>
              <button
                onClick={exportProposalMarkdown}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 flex items-center justify-center gap-2"
              >
                📄 Export Markdown
              </button>
            </div>
          </div>

          {/* Section Navigation */}
          <div className="flex-1 overflow-y-auto p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Sections</h4>
            <nav className="space-y-1">
              {proposal.sections.map((section, index) => (
                <button
                  key={index}
                  onClick={() => setActiveSection(index)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    activeSection === index
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{getSectionIcon(section.type)}</span>
                    <span>{section.title}</span>
                  </span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Content Header */}
          <div className="p-6 border-b border-gray-200 bg-white">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{getSectionIcon(proposal.sections[activeSection]?.type)}</span>
              <h1 className="text-2xl font-bold text-gray-900">
                {proposal.sections[activeSection]?.title}
              </h1>
            </div>
          </div>

          {/* Content Body */}
          <div className="flex-1 overflow-y-auto p-6">
            {proposal.sections[activeSection] && (
              <div className="space-y-6">
                {/* Section Content */}
                <div className="prose max-w-none">
                  <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {proposal.sections[activeSection].content}
                  </div>
                </div>

                {/* Special Content Based on Section Type */}
                {proposal.sections[activeSection].type === 'executive_summary' && proposal.executiveSummaryTable.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Executive Summary Table</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Key Requirement
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Our Solution
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Client Benefit
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {proposal.executiveSummaryTable.map((item, index) => (
                            <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-6 py-4 text-sm text-gray-900">{item.requirement}</td>
                              <td className="px-6 py-4 text-sm text-gray-900">{item.solution}</td>
                              <td className="px-6 py-4 text-sm text-gray-900">{item.benefit}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {proposal.sections[activeSection].type === 'methodology' && proposal.methodologyPhases.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">🔄 Methodology Phases</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Phase
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Activities
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Deliverables
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {proposal.methodologyPhases.map((phase, index) => (
                            <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-6 py-4 text-sm font-medium text-gray-900">{phase.phase}</td>
                              <td className="px-6 py-4 text-sm text-gray-900">{phase.activities}</td>
                              <td className="px-6 py-4 text-sm text-gray-900">{phase.deliverables}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {proposal.sections[activeSection].type === 'organisation' && proposal.teamStructure.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">👥 Team Structure</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Role
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Profile
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Responsibility
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {proposal.teamStructure.map((member, index) => (
                            <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-6 py-4 text-sm font-medium text-gray-900">{member.role}</td>
                              <td className="px-6 py-4 text-sm text-gray-900">{member.profile}</td>
                              <td className="px-6 py-4 text-sm text-gray-900">{member.responsibility}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {proposal.sections[activeSection].type === 'risk_management' && proposal.riskMatrix.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">⚠️ Risk Management Matrix</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Risk
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Impact
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Mitigation
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {proposal.riskMatrix.map((risk, index) => (
                            <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-6 py-4 text-sm text-gray-900">{risk.risk}</td>
                              <td className="px-6 py-4 text-sm text-gray-900">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  risk.impact === 'High' ? 'bg-red-100 text-red-800' :
                                  risk.impact === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {risk.impact}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900">{risk.mitigation}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}