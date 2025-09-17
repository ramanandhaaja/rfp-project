"use client"

import { useState } from "react"
import Modal from "@/components/ui/Modal"

interface NewTenderModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (tenderData: TenderFormData) => void
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl"
}

interface TenderFormData {
  projectName: string
  clientName: string
  deadline: string
  estimatedValue: string
  description: string
  documents: UploadedFile[]
}

interface UploadedFile {
  id: string
  name: string
  size: string
  type: "primary" | "supplement" | "questionnaire"
  file?: File
}

const STEPS = [
  { id: 1, name: "Basic Info", description: "Project details" },
  { id: 2, name: "Documents", description: "Upload files" },
  { id: 3, name: "Review", description: "Confirm & create" }
]

export default function NewTenderModal({ isOpen, onClose, onSubmit, maxWidth = "lg" }: NewTenderModalProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<TenderFormData>({
    projectName: "",
    clientName: "",
    deadline: "",
    estimatedValue: "",
    description: "",
    documents: []
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const updateFormData = (updates: Partial<TenderFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
    // Clear related errors
    const newErrors = { ...errors }
    Object.keys(updates).forEach(key => {
      delete newErrors[key]
    })
    setErrors(newErrors)
  }

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {}

    if (step === 1) {
      if (!formData.projectName.trim()) newErrors.projectName = "Project name is required"
      if (!formData.clientName.trim()) newErrors.clientName = "Client name is required"
      if (!formData.deadline) newErrors.deadline = "Deadline is required"
      if (!formData.estimatedValue.trim()) newErrors.estimatedValue = "Estimated value is required"
      if (!formData.description.trim()) newErrors.description = "Description is required"
    }

    if (step === 2) {
      if (formData.documents.length === 0) newErrors.documents = "At least one document is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 3) {
        setCurrentStep(currentStep + 1)
      }
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = () => {
    if (validateStep(currentStep)) {
      onSubmit(formData)
      handleClose()
    }
  }

  const handleClose = () => {
    setCurrentStep(1)
    setFormData({
      projectName: "",
      clientName: "",
      deadline: "",
      estimatedValue: "",
      description: "",
      documents: []
    })
    setErrors({})
    onClose()
  }

  const addDocument = (file: File, type: "primary" | "supplement" | "questionnaire") => {
    const newDoc: UploadedFile = {
      id: Date.now().toString(),
      name: file.name,
      size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
      type,
      file
    }
    updateFormData({ documents: [...formData.documents, newDoc] })
  }

  const removeDocument = (id: string) => {
    updateFormData({ documents: formData.documents.filter(doc => doc.id !== id) })
  }

  const renderProgressBar = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        {STEPS.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
              currentStep >= step.id 
                ? "bg-indigo-600 text-white" 
                : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
            }`}>
              {currentStep > step.id ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                step.id
              )}
            </div>
            <div className="ml-3 hidden sm:block">
              <p className={`text-sm font-medium ${currentStep >= step.id ? "text-indigo-600" : "text-gray-500"}`}>
                {step.name}
              </p>
              <p className="text-xs text-gray-500">{step.description}</p>
            </div>
            {index < STEPS.length - 1 && (
              <div className={`w-full h-0.5 mx-4 ${currentStep > step.id ? "bg-indigo-600" : "bg-gray-200"}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  )

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Project Name *
          </label>
          <input
            type="text"
            value={formData.projectName}
            onChange={(e) => updateFormData({ projectName: e.target.value })}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white ${
              errors.projectName ? "border-red-500" : "border-gray-300 dark:border-gray-600"
            }`}
            placeholder="e.g., IT Services RFP - Q1 2024"
          />
          {errors.projectName && <p className="text-red-500 text-xs mt-1">{errors.projectName}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Client Name *
          </label>
          <input
            type="text"
            value={formData.clientName}
            onChange={(e) => updateFormData({ clientName: e.target.value })}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white ${
              errors.clientName ? "border-red-500" : "border-gray-300 dark:border-gray-600"
            }`}
            placeholder="e.g., Tech Solutions Corp"
          />
          {errors.clientName && <p className="text-red-500 text-xs mt-1">{errors.clientName}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Submission Deadline *
          </label>
          <input
            type="date"
            value={formData.deadline}
            onChange={(e) => updateFormData({ deadline: e.target.value })}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white ${
              errors.deadline ? "border-red-500" : "border-gray-300 dark:border-gray-600"
            }`}
          />
          {errors.deadline && <p className="text-red-500 text-xs mt-1">{errors.deadline}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Estimated Value *
          </label>
          <input
            type="text"
            value={formData.estimatedValue}
            onChange={(e) => updateFormData({ estimatedValue: e.target.value })}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white ${
              errors.estimatedValue ? "border-red-500" : "border-gray-300 dark:border-gray-600"
            }`}
            placeholder="e.g., $250,000"
          />
          {errors.estimatedValue && <p className="text-red-500 text-xs mt-1">{errors.estimatedValue}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Project Description *
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => updateFormData({ description: e.target.value })}
          rows={4}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white ${
            errors.description ? "border-red-500" : "border-gray-300 dark:border-gray-600"
          }`}
          placeholder="Brief description of the project scope and requirements..."
        />
        {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      {/* Upload Area */}
      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
        <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Upload Tender Documents
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Drop files here or click to browse (PDF, DOC, DOCX supported)
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
          <div className="space-y-2">
            <input
              type="file"
              id="primary-upload"
              className="hidden"
              accept=".pdf,.doc,.docx"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) addDocument(file, "primary")
              }}
            />
            <label
              htmlFor="primary-upload"
              className="cursor-pointer bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors block text-center"
            >
              📄 Primary RFP
            </label>
          </div>
          
          <div className="space-y-2">
            <input
              type="file"
              id="supplement-upload"
              className="hidden"
              accept=".pdf,.doc,.docx"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) addDocument(file, "supplement")
              }}
            />
            <label
              htmlFor="supplement-upload"
              className="cursor-pointer bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors block text-center"
            >
              📋 Supplements
            </label>
          </div>
          
          <div className="space-y-2">
            <input
              type="file"
              id="questionnaire-upload"
              className="hidden"
              accept=".pdf,.doc,.docx"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) addDocument(file, "questionnaire")
              }}
            />
            <label
              htmlFor="questionnaire-upload"
              className="cursor-pointer bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors block text-center"
            >
              ✅ Questionnaires
            </label>
          </div>
        </div>
      </div>

      {/* Document List */}
      {formData.documents.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 dark:text-white mb-4">
            Uploaded Documents ({formData.documents.length})
          </h4>
          <div className="space-y-3">
            {formData.documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center">
                  <div className={`px-2 py-1 text-xs rounded-full mr-3 ${
                    doc.type === 'primary' ? 'bg-red-100 text-red-800' :
                    doc.type === 'supplement' ? 'bg-blue-100 text-blue-800' :
                    'bg-purple-100 text-purple-800'
                  }`}>
                    {doc.type}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{doc.name}</p>
                    <p className="text-sm text-gray-500">{doc.size}</p>
                  </div>
                </div>
                <button
                  onClick={() => removeDocument(doc.id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {errors.documents && <p className="text-red-500 text-sm">{errors.documents}</p>}
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Review Your Tender Project</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-600 dark:text-gray-400">Project:</span>
            <p className="text-gray-900 dark:text-white">{formData.projectName}</p>
          </div>
          <div>
            <span className="font-medium text-gray-600 dark:text-gray-400">Client:</span>
            <p className="text-gray-900 dark:text-white">{formData.clientName}</p>
          </div>
          <div>
            <span className="font-medium text-gray-600 dark:text-gray-400">Deadline:</span>
            <p className="text-gray-900 dark:text-white">{formData.deadline}</p>
          </div>
          <div>
            <span className="font-medium text-gray-600 dark:text-gray-400">Value:</span>
            <p className="text-gray-900 dark:text-white">{formData.estimatedValue}</p>
          </div>
        </div>
        
        <div className="mt-4">
          <span className="font-medium text-gray-600 dark:text-gray-400">Description:</span>
          <p className="text-gray-900 dark:text-white mt-1">{formData.description}</p>
        </div>
      </div>

      <div>
        <h4 className="font-medium text-gray-900 dark:text-white mb-3">
          Documents ({formData.documents.length})
        </h4>
        <div className="space-y-2">
          {formData.documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded">
              <div className="flex items-center">
                <span className={`px-2 py-1 text-xs rounded-full mr-3 ${
                  doc.type === 'primary' ? 'bg-red-100 text-red-800' :
                  doc.type === 'supplement' ? 'bg-blue-100 text-blue-800' :
                  'bg-purple-100 text-purple-800'
                }`}>
                  {doc.type}
                </span>
                <span className="text-gray-900 dark:text-white">{doc.name}</span>
              </div>
              <span className="text-gray-500 text-sm">{doc.size}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create New Tender Project" maxWidth={maxWidth}>
      {renderProgressBar()}
      
      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}

      {/* Footer */}
      <div className="flex justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div>
          {currentStep > 1 && (
            <button
              onClick={handlePrevious}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              ← Previous
            </button>
          )}
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Save as Draft
          </button>
          
          {currentStep < 3 ? (
            <button
              onClick={handleNext}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors inline-flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Create & Start Analysis
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}