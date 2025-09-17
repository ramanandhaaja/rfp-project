'use client';

import { useEffect, useState } from 'react';
import { Session } from "next-auth"

interface OverviewSectionProps {
  session: Session
}

interface DashboardStats {
  totalCompanies: number;
  totalProducts: number;
  totalTenders: number;
  analysisCount: number;
}

export default function OverviewSection({ session }: OverviewSectionProps) {
  const [stats, setStats] = useState<DashboardStats>({
    totalCompanies: 0,
    totalProducts: 0,
    totalTenders: 0,
    analysisCount: 0,
  });
  const [recentTenders, setRecentTenders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load companies count
      const companiesResponse = await fetch('/api/companies');
      const companiesData = await companiesResponse.json();

      // Load tenders count
      const tendersResponse = await fetch('/api/tenders/import');
      const tendersData = await tendersResponse.json();

      setStats({
        totalCompanies: companiesData.companies?.length || 0,
        totalProducts: companiesData.companies?.reduce((sum: number, company: any) => sum + (company.productCount || 0), 0) || 0,
        totalTenders: tendersData.tenders?.length || 0,
        analysisCount: tendersData.tenders?.length || 0, // Assuming each tender can be analyzed
      });

      setRecentTenders(tendersData.tenders?.slice(0, 5) || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Companies',
      value: stats.totalCompanies,
      icon: (
        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
    },
    {
      title: 'Products',
      value: stats.totalProducts,
      icon: (
        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
    },
    {
      title: 'Tenders',
      value: stats.totalTenders,
      icon: (
        <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
    },
    {
      title: 'Analyses',
      value: stats.analysisCount,
      icon: (
        <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {session?.user?.name || session?.user?.email}!
        </h1>
        <p className="text-gray-600 mt-2">
          Here's an overview of your RFP management system.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${card.bgColor}`}>
                {card.icon}
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">{card.value}</h3>
                <p className="text-sm text-gray-600">{card.title}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Getting Started */}
      {stats.totalCompanies === 0 && stats.totalTenders === 0 && (
        <div className="bg-blue-50 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-blue-900 mb-4">Getting Started</h2>
          <div className="space-y-3 text-blue-800">
            <div className="flex items-center">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">1</span>
              <span>Set up your company profile and add your products/services</span>
            </div>
            <div className="flex items-center">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">2</span>
              <span>Upload a tender document (PDF format)</span>
            </div>
            <div className="flex items-center">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">3</span>
              <span>Run AI analysis to see how well your capabilities match the tender</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}