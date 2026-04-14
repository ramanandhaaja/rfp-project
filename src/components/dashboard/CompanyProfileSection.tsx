'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface Company {
  id?: string;
  name: string;
  industry: string;
  description: string;
  website?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  foundedYear?: number;
  employeeCount?: number;
  revenueRange?: string;
  certifications?: string[];
  capabilities?: string[];
}

export default function CompanyProfileSection() {
  const { data: session } = useSession();
  const [company, setCompany] = useState<Company>({
    name: '',
    industry: '',
    description: '',
    website: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    foundedYear: undefined,
    employeeCount: undefined,
    revenueRange: '',
    certifications: [],
    capabilities: [],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session?.user) {
      fetchExistingCompany();
    }
  }, [session]);

  const fetchExistingCompany = async () => {
    try {
      const response = await fetch('/api/companies');
      if (response.ok) {
        const data = await response.json();
        if (data.companies.length > 0) {
          const firstCompany = data.companies[0];
          setCompany({
            ...firstCompany,
            website: firstCompany.website || '',
            contactEmail: firstCompany.contact_email || '',
            contactPhone: firstCompany.contact_phone || '',
            address: firstCompany.address || '',
            revenueRange: firstCompany.revenue_range || '',
            certifications: firstCompany.certifications || [],
            capabilities: firstCompany.capabilities || [],
          });
        }
      }
    } catch (error) {
      console.error('Error fetching company:', error);
    }
  };

  const handleCompanyChange = (field: keyof Company, value: string | number | string[]) => {
    setCompany(prev => ({ ...prev, [field]: value }));
  };

  const handleCapabilityAdd = (capability: string) => {
    if (capability.trim() && !company.capabilities?.includes(capability.trim())) {
      setCompany(prev => ({
        ...prev,
        capabilities: [...(prev.capabilities || []), capability.trim()]
      }));
    }
  };

  const removeCapability = (capability: string) => {
    setCompany(prev => ({
      ...prev,
      capabilities: prev.capabilities?.filter(c => c !== capability) || []
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const companyResponse = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: company.id,
          name: company.name,
          industry: company.industry,
          description: company.description,
          website: company.website,
          contactEmail: company.contactEmail,
          contactPhone: company.contactPhone,
          address: company.address,
          foundedYear: company.foundedYear,
          employeeCount: company.employeeCount,
          revenueRange: company.revenueRange,
          capabilities: company.capabilities,
        }),
      });

      if (!companyResponse.ok) {
        throw new Error('Failed to save company');
      }

      const companyData = await companyResponse.json();
      setCompany(prev => ({ ...prev, id: companyData.company.id }));
      alert('Company profile saved successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 transition-colors";
  const labelClass = "block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Company Profile</h2>
        <p className="text-sm text-gray-500 mt-1">Manage your company information and capabilities</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── Company Information ── */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Company Information</h3>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Company Name *</label>
                <input
                  type="text"
                  required
                  value={company.name}
                  onChange={(e) => handleCompanyChange('name', e.target.value)}
                  className={inputClass}
                  placeholder="Enter company name"
                />
              </div>
              <div>
                <label className={labelClass}>Industry *</label>
                <select
                  required
                  value={company.industry}
                  onChange={(e) => handleCompanyChange('industry', e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select industry</option>
                  <option value="Technology">Technology</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Finance">Finance</option>
                  <option value="Manufacturing">Manufacturing</option>
                  <option value="Construction">Construction</option>
                  <option value="Consulting">Consulting</option>
                  <option value="Education">Education</option>
                  <option value="Energy">Energy</option>
                  <option value="Telecommunications">Telecommunications</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Website</label>
                <input
                  type="url"
                  value={company.website || ''}
                  onChange={(e) => handleCompanyChange('website', e.target.value)}
                  className={inputClass}
                  placeholder="https://company.com"
                />
              </div>
              <div>
                <label className={labelClass}>Contact Email</label>
                <input
                  type="email"
                  value={company.contactEmail || ''}
                  onChange={(e) => handleCompanyChange('contactEmail', e.target.value)}
                  className={inputClass}
                  placeholder="contact@company.com"
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Company Description *</label>
              <textarea
                required
                rows={4}
                value={company.description}
                onChange={(e) => handleCompanyChange('description', e.target.value)}
                className={inputClass}
                placeholder="Describe your company, services, and key capabilities..."
              />
            </div>

            <div>
              <label className={labelClass}>Capabilities</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {company.capabilities?.map((capability, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded bg-indigo-50 text-indigo-600"
                  >
                    {capability}
                    <button
                      type="button"
                      onClick={() => removeCapability(capability)}
                      className="text-indigo-400 hover:text-indigo-700 transition-colors"
                      title="Remove"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                placeholder="Add capability and press Enter"
                className={inputClass}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCapabilityAdd(e.currentTarget.value);
                    e.currentTarget.value = '';
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* ── Submit ── */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors uppercase tracking-wide"
          >
            {loading ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}
