interface Proposal {
  title: string
  status: "completed" | "draft" | "review"
  date: string
  score: number
}

export default function ProposalsSection() {
  const proposals: Proposal[] = [
    { title: "Cloud Infrastructure RFP Response", status: "completed", date: "2024-01-15", score: 92 },
    { title: "Software Development Services Proposal", status: "draft", date: "2024-01-14", score: 88 },
    { title: "IT Consulting Services Response", status: "review", date: "2024-01-12", score: 95 }
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Generated Proposals</h1>
      
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Your Proposals</h2>
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Generate New Proposal
          </button>
        </div>
        
        <div className="space-y-4">
          {proposals.map((proposal, index) => (
            <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">{proposal.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Created on {proposal.date}</p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm text-gray-500 dark:text-gray-400">AI Score</p>
                    <p className="font-semibold text-indigo-600 dark:text-indigo-400">{proposal.score}%</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    proposal.status === 'completed' ? 'bg-green-100 text-green-800' :
                    proposal.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {proposal.status}
                  </span>
                  <button className="text-indigo-600 hover:text-indigo-800 text-sm">View</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}