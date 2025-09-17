"use client"

import { useState } from "react"
import NewTenderModal from "./NewTenderModal"

interface Document {
  id: string
  name: string
  type: "primary" | "supplement" | "questionnaire"
  size: string
  uploadDate: string
  status: "uploaded" | "analyzed" | "pending_analysis"
}

interface TenderProject {
  id: string
  name: string
  client: string
  submissionDeadline: string
  estimatedValue: string
  status: "draft" | "in_progress" | "ready_for_analysis" | "completed"
  createdDate: string
  description: string
  analysisStatus: "not_started" | "completed"
  documents: Document[]
}

export default function TenderUploadSection() {
  const [selectedTenderId, setSelectedTenderId] = useState<string | null>(null)
  const [showNewTenderModal, setShowNewTenderModal] = useState(false)
  const [tenderProjects, setTenderProjects] = useState<TenderProject[]>([
    {
      id: "it-services-q1-2024",
      name: "IT Services RFP - Q1 2024",
      client: "Tech Solutions Corp",
      submissionDeadline: "2024-02-15",
      estimatedValue: "$250,000",
      status: "in_progress",
      createdDate: "2024-01-10",
      description: "Comprehensive IT infrastructure and support services for a mid-size corporation",
      analysisStatus: "completed",
      documents: [
        {
          id: "doc1",
          name: "Main RFP Document.pdf",
          type: "primary",
          size: "2.4 MB",
          uploadDate: "2024-01-12 14:30",
          status: "analyzed"
        },
        {
          id: "doc2", 
          name: "Technical Requirements.docx",
          type: "supplement",
          size: "1.2 MB",
          uploadDate: "2024-01-12 15:15",
          status: "analyzed"
        },
        {
          id: "doc3",
          name: "Vendor Questionnaire.pdf", 
          type: "questionnaire",
          size: "800 KB",
          uploadDate: "2024-01-13 09:20",
          status: "pending_analysis"
        }
      ]
    },
    {
      id: "cloud-infrastructure-2024",
      name: "Cloud Infrastructure Migration",
      client: "Global Finance Ltd",
      submissionDeadline: "2024-02-28",
      estimatedValue: "$500,000",
      status: "ready_for_analysis",
      createdDate: "2024-01-08",
      description: "Large-scale cloud migration and infrastructure modernization project",
      analysisStatus: "not_started",
      documents: [
        {
          id: "doc4",
          name: "RFP Cloud Migration.pdf",
          type: "primary", 
          size: "3.2 MB",
          uploadDate: "2024-01-14 11:45",
          status: "uploaded"
        },
        {
          id: "doc5",
          name: "Security Requirements.pdf",
          type: "supplement",
          size: "1.8 MB", 
          uploadDate: "2024-01-14 12:10",
          status: "uploaded"
        }
      ]
    },
    {
      id: "software-dev-services",
      name: "Custom Software Development",
      client: "Healthcare Systems Inc",
      submissionDeadline: "2024-02-20",
      estimatedValue: "$180,000",
      status: "draft",
      createdDate: "2024-01-15",
      description: "Custom healthcare management software with integrated patient portal",
      analysisStatus: "not_started",
      documents: [
        {
          id: "doc6",
          name: "Software Dev RFP.docx",
          type: "primary",
          size: "1.5 MB",
          uploadDate: "2024-01-15 16:20", 
          status: "uploaded"
        }
      ]
    }
  ])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'ready_for_analysis': return 'bg-yellow-100 text-yellow-800'
      case 'draft': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'primary':
        return (
          <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )
      case 'supplement':
        return (
          <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        )
      case 'questionnaire':
        return (
          <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        )
      default:
        return (
          <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        )
    }
  }

  const handleNewTender = (tenderData: any) => {
    const newTender: TenderProject = {
      id: `tender-${Date.now()}`,
      name: tenderData.name,
      client: tenderData.client,
      submissionDeadline: tenderData.deadline,
      estimatedValue: tenderData.estimatedValue,
      status: "draft",
      createdDate: new Date().toISOString().split('T')[0],
      description: tenderData.description,
      analysisStatus: "not_started",
      documents: tenderData.documents?.map((doc: any, index: number) => ({
        id: `doc-${Date.now()}-${index}`,
        name: doc.name,
        type: doc.type,
        size: doc.size,
        uploadDate: new Date().toISOString(),
        status: "uploaded"
      })) || []
    }
    
    setTenderProjects(prev => [newTender, ...prev])
    setShowNewTenderModal(false)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tender Management</h1>
        <button 
          onClick={() => setShowNewTenderModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors inline-flex items-center"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Tender Project
        </button>
      </div>

      

      {/* Tender Projects List */}
      <div className="space-y-6">
        {tenderProjects.map((tender) => (
          <div key={tender.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            {/* Tender Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mr-3">
                      {tender.name}
                    </h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(tender.status)}`}>
                      {tender.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mb-3">{tender.description}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center text-gray-600 dark:text-gray-400">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <span className="font-medium">Client:</span> {tender.client}
                    </div>
                    <div className="flex items-center text-gray-600 dark:text-gray-400">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                      <span className="font-medium">Value:</span> {tender.estimatedValue}
                    </div>
                    <div className="flex items-center text-gray-600 dark:text-gray-400">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="font-medium">Deadline:</span> {tender.submissionDeadline}
                    </div>
                    <div className="flex items-center text-gray-600 dark:text-gray-400">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <span className="font-medium">Analysis:</span> {tender.analysisStatus.replace('_', ' ')}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  <button 
                    onClick={() => setSelectedTenderId(selectedTenderId === tender.id ? null : tender.id)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2"
                  >
                    <svg className={`w-5 h-5 transition-transform ${selectedTenderId === tender.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {tender.analysisStatus === 'not_started' && tender.documents.length > 0 && (
                    <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Start Analysis
                    </button>
                  )}
                  {tender.analysisStatus === 'completed' && (
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                      View Results
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Documents List (Expandable) */}
            {selectedTenderId === tender.id && (
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    Documents ({tender.documents.length})
                  </h4>
                  <button className="text-indigo-600 hover:text-indigo-800 text-sm font-medium inline-flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Document
                  </button>
                </div>
                
                <div className="space-y-3">
                  {tender.documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="flex items-center">
                        {getDocumentIcon(doc.type)}
                        <div className="ml-3">
                          <div className="flex items-center">
                            <p className="font-medium text-gray-900 dark:text-white mr-2">{doc.name}</p>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              doc.type === 'primary' ? 'bg-red-100 text-red-800' :
                              doc.type === 'supplement' ? 'bg-blue-100 text-blue-800' :
                              'bg-purple-100 text-purple-800'
                            }`}>
                              {doc.type}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {doc.uploadDate} • {doc.size}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          doc.status === 'analyzed' ? 'bg-green-100 text-green-800' :
                          doc.status === 'pending_analysis' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {doc.status.replace('_', ' ')}
                        </span>
                        <button className="text-indigo-600 hover:text-indigo-800 text-sm">
                          View
                        </button>
                        <button className="text-gray-500 hover:text-gray-700 text-sm">
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Analysis Summary for this tender */}
                {tender.analysisStatus === 'completed' && (
                  <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <h5 className="font-medium text-green-900 dark:text-green-100 mb-2">Analysis Complete</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="text-green-700 dark:text-green-300">
                        <span className="font-medium">Requirements:</span> 23 identified
                      </div>
                      <div className="text-green-700 dark:text-green-300">
                        <span className="font-medium">Compliance Score:</span> 95%
                      </div>
                      <div className="text-green-700 dark:text-green-300">
                        <span className="font-medium">Win Probability:</span> 78%
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* New Tender Modal */}
      <NewTenderModal
        isOpen={showNewTenderModal}
        onClose={() => setShowNewTenderModal(false)}
        onSubmit={handleNewTender}
        maxWidth="2xl"
      />
    </div>
  )
}