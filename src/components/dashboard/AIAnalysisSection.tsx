"use client"

import { useState } from "react"

interface TenderDocument {
  id: string
  name: string
  uploadDate: string
  size: string
  deadline: string
  status: "analyzing" | "completed" | "pending"
}

interface AIAgent {
  name: string
  status: "completed" | "processing" | "pending"
  progress: number
  description: string
}

export default function AIAnalysisSection() {
  const [selectedTender, setSelectedTender] = useState("it-services-q1-2024")
  
  // Mock tender documents
  const tenderDocuments: TenderDocument[] = [
    { 
      id: "it-services-q1-2024", 
      name: "IT Services RFP - Q1 2024", 
      uploadDate: "2024-01-15", 
      size: "2.4 MB",
      deadline: "2024-02-15",
      status: "analyzing"
    },
    { 
      id: "cloud-infrastructure-2024", 
      name: "Cloud Infrastructure RFP", 
      uploadDate: "2024-01-12", 
      size: "3.2 MB",
      deadline: "2024-02-28",
      status: "completed"
    },
    { 
      id: "software-dev-services", 
      name: "Software Development Services", 
      uploadDate: "2024-01-10", 
      size: "1.8 MB",
      deadline: "2024-02-20",
      status: "pending"
    }
  ]

  const currentTender = tenderDocuments.find(t => t.id === selectedTender)

  const aiAgents: AIAgent[] = [
    { name: "Requirements Analyzer", status: "completed", progress: 100, description: "Extracting key requirements and criteria" },
    { name: "Compliance Checker", status: "processing", progress: 65, description: "Reviewing submission guidelines" },
    { name: "Response Generator", status: "pending", progress: 0, description: "Generating tailored proposal content" }
  ]

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Analysis Dashboard</h1>
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Analyzing:
          </label>
          <select 
            value={selectedTender}
            onChange={(e) => setSelectedTender(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white text-sm"
          >
            {tenderDocuments.map((tender) => (
              <option key={tender.id} value={tender.id}>
                {tender.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Current Tender Info Card */}
      {currentTender && (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg mb-8 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <svg className="w-8 h-8 text-blue-600 dark:text-blue-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div>
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                  {currentTender.name}
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Currently being analyzed by AI agents
                </p>
              </div>
            </div>
            <span className={`px-3 py-1 text-xs font-medium rounded-full ${
              currentTender.status === 'analyzing' ? 'bg-yellow-100 text-yellow-800' :
              currentTender.status === 'completed' ? 'bg-green-100 text-green-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {currentTender.status}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center text-blue-700 dark:text-blue-300">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Uploaded: {currentTender.uploadDate}
            </div>
            <div className="flex items-center text-blue-700 dark:text-blue-300">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Size: {currentTender.size}
            </div>
            <div className="flex items-center text-blue-700 dark:text-blue-300">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Deadline: {currentTender.deadline}
            </div>
          </div>
        </div>
      )}
      
      {/* AI Agents Progress */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {aiAgents.map((agent, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{agent.name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{agent.description}</p>
              </div>
              <span className={`px-2 py-1 text-xs rounded-full ${
                agent.status === 'completed' ? 'bg-green-100 text-green-800' :
                agent.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {agent.status}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
              <div 
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300" 
                style={{width: `${agent.progress}%`}}
              />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">{agent.progress}% complete</p>
          </div>
        ))}
      </div>

      {/* Analysis Results */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Analysis Results</h2>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Document: <span className="font-medium text-gray-700 dark:text-gray-300">{currentTender?.name}</span>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="border-l-4 border-green-500 pl-4">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-medium text-gray-900 dark:text-white">Requirements Analysis Complete</h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">2 hours ago</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Identified 23 key requirements, 5 mandatory qualifications, and 12 evaluation criteria from &quot;{currentTender?.name}&quot;
            </p>
            <div className="flex space-x-2">
              <button className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">View Details</button>
              <button className="text-gray-500 hover:text-gray-700 text-sm">Download Report</button>
            </div>
          </div>
          
          <div className="border-l-4 border-yellow-500 pl-4">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-medium text-gray-900 dark:text-white">Compliance Check in Progress</h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">Started 1 hour ago</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Reviewing submission format, deadline requirements, and documentation standards for &quot;{currentTender?.name}&quot;
            </p>
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-500 mr-2"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Processing... ETA: 30 minutes</span>
            </div>
          </div>
          
          <div className="border-l-4 border-gray-300 pl-4">
            <h3 className="font-medium text-gray-500 dark:text-gray-400">Response Generation Pending</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 mb-3">
              Waiting for requirements analysis and compliance check to complete before generating response for &quot;{currentTender?.name}&quot;
            </p>
            <button disabled className="text-gray-400 text-sm cursor-not-allowed">
              Will start automatically
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}