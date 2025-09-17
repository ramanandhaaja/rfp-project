import jsPDF from 'jspdf';

interface GeneratedProposal {
  title: string;
  sections: Array<{
    title: string;
    content: string;
    type: string;
  }>;
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

interface TenderDocument {
  title: string;
  referenceNumber: string;
  description: string;
}

export function generateProposalPDF(proposal: GeneratedProposal, tender: TenderDocument): void {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.width;
  const pageHeight = pdf.internal.pageSize.height;
  const margin = 20;
  const maxWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  // Helper function to add new page if needed
  const checkPageBreak = (requiredHeight: number) => {
    if (yPosition + requiredHeight > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
    }
  };

  // Helper function to wrap text
  const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 12) => {
    pdf.setFontSize(fontSize);
    const lines = pdf.splitTextToSize(text, maxWidth);
    const lineHeight = fontSize * 0.4;

    lines.forEach((line: string, index: number) => {
      checkPageBreak(lineHeight);
      pdf.text(line, x, yPosition);
      yPosition += lineHeight;
    });

    return yPosition;
  };

  // Cover Page
  pdf.setFontSize(24);
  pdf.setFont(undefined, 'bold');
  pdf.text('PROPOSAL', pageWidth / 2, 60, { align: 'center' });

  pdf.setFontSize(18);
  yPosition = 80;
  addWrappedText(proposal.title, margin, yPosition, maxWidth, 18);

  yPosition += 20;
  pdf.setFontSize(14);
  pdf.setFont(undefined, 'normal');
  addWrappedText(`Reference: ${tender.referenceNumber}`, margin, yPosition, maxWidth, 14);

  yPosition += 10;
  addWrappedText(`Date: ${new Date().toLocaleDateString()}`, margin, yPosition, maxWidth, 14);

  // Company Information
  yPosition += 30;
  pdf.setFontSize(16);
  pdf.setFont(undefined, 'bold');
  addWrappedText('Submitted by:', margin, yPosition, maxWidth, 16);

  yPosition += 10;
  pdf.setFontSize(12);
  pdf.setFont(undefined, 'normal');
  addWrappedText('Your Company Name', margin, yPosition, maxWidth, 12);
  addWrappedText('Address Line 1', margin, yPosition, maxWidth, 12);
  addWrappedText('Address Line 2', margin, yPosition, maxWidth, 12);
  addWrappedText('Email: contact@company.com', margin, yPosition, maxWidth, 12);
  addWrappedText('Phone: +31 XX XXX XXXX', margin, yPosition, maxWidth, 12);

  // Start new page for content
  pdf.addPage();
  yPosition = margin;

  // Table of Contents
  pdf.setFontSize(18);
  pdf.setFont(undefined, 'bold');
  addWrappedText('Table of Contents', margin, yPosition, maxWidth, 18);

  yPosition += 15;
  pdf.setFontSize(12);
  pdf.setFont(undefined, 'normal');

  const tocItems = [
    'Executive Summary',
    'Company Introduction',
    'Methodology & Execution',
    'Organisation & Governance',
    'Risk Management',
    'Sustainability & Innovation',
    'Why Choose Us'
  ];

  tocItems.forEach((item, index) => {
    addWrappedText(`${index + 1}. ${item}`, margin, yPosition, maxWidth, 12);
    yPosition += 5;
  });

  // Add content sections
  proposal.sections.forEach((section, sectionIndex) => {
    pdf.addPage();
    yPosition = margin;

    // Section title
    pdf.setFontSize(18);
    pdf.setFont(undefined, 'bold');
    addWrappedText(`${sectionIndex + 1}. ${section.title}`, margin, yPosition, maxWidth, 18);

    yPosition += 15;

    // Section content
    pdf.setFontSize(12);
    pdf.setFont(undefined, 'normal');
    addWrappedText(section.content, margin, yPosition, maxWidth, 12);

    yPosition += 10;

    // Add special tables based on section type
    if (section.type === 'executive_summary' && proposal.executiveSummaryTable.length > 0) {
      yPosition += 10;
      addExecutiveSummaryTable(pdf, proposal.executiveSummaryTable, margin, yPosition, maxWidth);
    } else if (section.type === 'methodology' && proposal.methodologyPhases.length > 0) {
      yPosition += 10;
      addMethodologyTable(pdf, proposal.methodologyPhases, margin, yPosition, maxWidth);
    } else if (section.type === 'organisation' && proposal.teamStructure.length > 0) {
      yPosition += 10;
      addTeamTable(pdf, proposal.teamStructure, margin, yPosition, maxWidth);
    } else if (section.type === 'risk_management' && proposal.riskMatrix.length > 0) {
      yPosition += 10;
      addRiskTable(pdf, proposal.riskMatrix, margin, yPosition, maxWidth);
    }
  });

  // Save the PDF
  const fileName = `Proposal_${tender.referenceNumber?.replace(/[^a-z0-9]/gi, '_') || 'Document'}_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(fileName);
}

function addExecutiveSummaryTable(pdf: jsPDF, data: any[], x: number, startY: number, maxWidth: number) {
  const cellWidth = maxWidth / 3;
  const cellHeight = 8;
  let y = startY;

  // Table header
  pdf.setFillColor(240, 240, 240);
  pdf.rect(x, y, cellWidth, cellHeight, 'F');
  pdf.rect(x + cellWidth, y, cellWidth, cellHeight, 'F');
  pdf.rect(x + 2 * cellWidth, y, cellWidth, cellHeight, 'F');

  pdf.setFontSize(10);
  pdf.setFont(undefined, 'bold');
  pdf.text('Key Requirement', x + 2, y + 5);
  pdf.text('Our Solution', x + cellWidth + 2, y + 5);
  pdf.text('Client Benefit', x + 2 * cellWidth + 2, y + 5);

  y += cellHeight;

  // Table data
  pdf.setFont(undefined, 'normal');
  data.forEach((row) => {
    const requiredHeight = Math.max(
      pdf.splitTextToSize(row.requirement, cellWidth - 4).length,
      pdf.splitTextToSize(row.solution, cellWidth - 4).length,
      pdf.splitTextToSize(row.benefit, cellWidth - 4).length
    ) * 4 + 4;

    pdf.rect(x, y, cellWidth, requiredHeight);
    pdf.rect(x + cellWidth, y, cellWidth, requiredHeight);
    pdf.rect(x + 2 * cellWidth, y, cellWidth, requiredHeight);

    const reqLines = pdf.splitTextToSize(row.requirement, cellWidth - 4);
    const solLines = pdf.splitTextToSize(row.solution, cellWidth - 4);
    const benLines = pdf.splitTextToSize(row.benefit, cellWidth - 4);

    reqLines.forEach((line: string, index: number) => {
      pdf.text(line, x + 2, y + 5 + index * 4);
    });
    solLines.forEach((line: string, index: number) => {
      pdf.text(line, x + cellWidth + 2, y + 5 + index * 4);
    });
    benLines.forEach((line: string, index: number) => {
      pdf.text(line, x + 2 * cellWidth + 2, y + 5 + index * 4);
    });

    y += requiredHeight;
  });
}

function addMethodologyTable(pdf: jsPDF, data: any[], x: number, startY: number, maxWidth: number) {
  const cellWidth = maxWidth / 3;
  const cellHeight = 8;
  let y = startY;

  // Table header
  pdf.setFillColor(240, 240, 240);
  pdf.rect(x, y, cellWidth, cellHeight, 'F');
  pdf.rect(x + cellWidth, y, cellWidth, cellHeight, 'F');
  pdf.rect(x + 2 * cellWidth, y, cellWidth, cellHeight, 'F');

  pdf.setFontSize(10);
  pdf.setFont(undefined, 'bold');
  pdf.text('Phase', x + 2, y + 5);
  pdf.text('Activities', x + cellWidth + 2, y + 5);
  pdf.text('Deliverables', x + 2 * cellWidth + 2, y + 5);

  y += cellHeight;

  // Table data
  pdf.setFont(undefined, 'normal');
  data.forEach((row) => {
    const requiredHeight = Math.max(
      pdf.splitTextToSize(row.phase, cellWidth - 4).length,
      pdf.splitTextToSize(row.activities, cellWidth - 4).length,
      pdf.splitTextToSize(row.deliverables, cellWidth - 4).length
    ) * 4 + 4;

    pdf.rect(x, y, cellWidth, requiredHeight);
    pdf.rect(x + cellWidth, y, cellWidth, requiredHeight);
    pdf.rect(x + 2 * cellWidth, y, cellWidth, requiredHeight);

    const phaseLines = pdf.splitTextToSize(row.phase, cellWidth - 4);
    const actLines = pdf.splitTextToSize(row.activities, cellWidth - 4);
    const delLines = pdf.splitTextToSize(row.deliverables, cellWidth - 4);

    phaseLines.forEach((line: string, index: number) => {
      pdf.text(line, x + 2, y + 5 + index * 4);
    });
    actLines.forEach((line: string, index: number) => {
      pdf.text(line, x + cellWidth + 2, y + 5 + index * 4);
    });
    delLines.forEach((line: string, index: number) => {
      pdf.text(line, x + 2 * cellWidth + 2, y + 5 + index * 4);
    });

    y += requiredHeight;
  });
}

function addTeamTable(pdf: jsPDF, data: any[], x: number, startY: number, maxWidth: number) {
  const cellWidth = maxWidth / 3;
  const cellHeight = 8;
  let y = startY;

  // Table header
  pdf.setFillColor(240, 240, 240);
  pdf.rect(x, y, cellWidth, cellHeight, 'F');
  pdf.rect(x + cellWidth, y, cellWidth, cellHeight, 'F');
  pdf.rect(x + 2 * cellWidth, y, cellWidth, cellHeight, 'F');

  pdf.setFontSize(10);
  pdf.setFont(undefined, 'bold');
  pdf.text('Role', x + 2, y + 5);
  pdf.text('Profile', x + cellWidth + 2, y + 5);
  pdf.text('Responsibility', x + 2 * cellWidth + 2, y + 5);

  y += cellHeight;

  // Table data
  pdf.setFont(undefined, 'normal');
  data.forEach((row) => {
    const requiredHeight = Math.max(
      pdf.splitTextToSize(row.role, cellWidth - 4).length,
      pdf.splitTextToSize(row.profile, cellWidth - 4).length,
      pdf.splitTextToSize(row.responsibility, cellWidth - 4).length
    ) * 4 + 4;

    pdf.rect(x, y, cellWidth, requiredHeight);
    pdf.rect(x + cellWidth, y, cellWidth, requiredHeight);
    pdf.rect(x + 2 * cellWidth, y, cellWidth, requiredHeight);

    const roleLines = pdf.splitTextToSize(row.role, cellWidth - 4);
    const profLines = pdf.splitTextToSize(row.profile, cellWidth - 4);
    const respLines = pdf.splitTextToSize(row.responsibility, cellWidth - 4);

    roleLines.forEach((line: string, index: number) => {
      pdf.text(line, x + 2, y + 5 + index * 4);
    });
    profLines.forEach((line: string, index: number) => {
      pdf.text(line, x + cellWidth + 2, y + 5 + index * 4);
    });
    respLines.forEach((line: string, index: number) => {
      pdf.text(line, x + 2 * cellWidth + 2, y + 5 + index * 4);
    });

    y += requiredHeight;
  });
}

function addRiskTable(pdf: jsPDF, data: any[], x: number, startY: number, maxWidth: number) {
  const cellWidth = maxWidth / 3;
  const cellHeight = 8;
  let y = startY;

  // Table header
  pdf.setFillColor(240, 240, 240);
  pdf.rect(x, y, cellWidth, cellHeight, 'F');
  pdf.rect(x + cellWidth, y, cellWidth, cellHeight, 'F');
  pdf.rect(x + 2 * cellWidth, y, cellWidth, cellHeight, 'F');

  pdf.setFontSize(10);
  pdf.setFont(undefined, 'bold');
  pdf.text('Risk', x + 2, y + 5);
  pdf.text('Impact', x + cellWidth + 2, y + 5);
  pdf.text('Mitigation', x + 2 * cellWidth + 2, y + 5);

  y += cellHeight;

  // Table data
  pdf.setFont(undefined, 'normal');
  data.forEach((row) => {
    const requiredHeight = Math.max(
      pdf.splitTextToSize(row.risk, cellWidth - 4).length,
      pdf.splitTextToSize(row.impact, cellWidth - 4).length,
      pdf.splitTextToSize(row.mitigation, cellWidth - 4).length
    ) * 4 + 4;

    pdf.rect(x, y, cellWidth, requiredHeight);
    pdf.rect(x + cellWidth, y, cellWidth, requiredHeight);
    pdf.rect(x + 2 * cellWidth, y, cellWidth, requiredHeight);

    const riskLines = pdf.splitTextToSize(row.risk, cellWidth - 4);
    const impactLines = pdf.splitTextToSize(row.impact, cellWidth - 4);
    const mitigationLines = pdf.splitTextToSize(row.mitigation, cellWidth - 4);

    riskLines.forEach((line: string, index: number) => {
      pdf.text(line, x + 2, y + 5 + index * 4);
    });
    impactLines.forEach((line: string, index: number) => {
      pdf.text(line, x + cellWidth + 2, y + 5 + index * 4);
    });
    mitigationLines.forEach((line: string, index: number) => {
      pdf.text(line, x + 2 * cellWidth + 2, y + 5 + index * 4);
    });

    y += requiredHeight;
  });
}