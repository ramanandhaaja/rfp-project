'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface Product {
  name: string;
  description: string;
  category?: string;
  features?: string[];
}

interface SavedProduct {
  id: string;
  name: string;
  category: string;
  description: string;
  features: string[];
  specifications: Record<string, any>;
  created_at: string;
}

interface ImportResults {
  success: boolean;
  message: string;
  results: {
    total: number;
    successful: number;
    failed: number;
    errors: string[];
  };
  companyName: string;
}

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
  const [products, setProducts] = useState<Product[]>([{ name: '', description: '', category: '', features: [] }]);
  const [loading, setLoading] = useState(false);
  const [savedProducts, setSavedProducts] = useState<SavedProduct[]>([]);
  const [csvImporting, setCsvImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResults | null>(null);

  useEffect(() => {
    if (session?.user) {
      fetchExistingCompanies();
    }
  }, [session]);

  const fetchExistingCompanies = async () => {
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
          // Fetch products for this company
          await fetchCompanyProducts(firstCompany.id);
        }
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const fetchCompanyProducts = async (companyId: string) => {
    try {
      const response = await fetch(`/api/products?companyId=${companyId}`);
      if (response.ok) {
        const data = await response.json();
        setSavedProducts(data.products || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleCompanyChange = (field: keyof Company, value: string | number | string[]) => {
    setCompany(prev => ({ ...prev, [field]: value }));
  };

  const handleProductChange = (index: number, field: keyof Product, value: string | string[]) => {
    setProducts(prev => prev.map((product, i) =>
      i === index ? { ...product, [field]: value } : product
    ));
  };

  const addProduct = () => {
    setProducts(prev => [...prev, { name: '', description: '', category: '', features: [] }]);
  };

  const removeProduct = (index: number) => {
    setProducts(prev => prev.filter((_, i) => i !== index));
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
      // Save company first (create or update)
      const companyResponse = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: company.id, // Include ID for update operations
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
      const companyId = companyData.company.id;

      const productsToSave = products.filter(p => p.name.trim());
      const saveResults = await Promise.all(
        productsToSave.map(product =>
          fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              companyId,
              name: product.name,
              category: product.category,
              description: product.description,
              features: product.features || [],
            }),
          }).then(res => ({ ok: res.ok, name: product.name }))
        )
      );

      const failedProducts = saveResults.filter(r => !r.ok).map(r => r.name);
      if (failedProducts.length > 0) {
        alert(`Company saved, but ${failedProducts.length} product(s) failed: ${failedProducts.join(', ')}`);
      } else {
        alert('Company profile and products saved successfully!');
      }

      await fetchExistingCompanies();
      setProducts([{ name: '', description: '', category: '', features: [] }]);
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCSVImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!company.id) {
      alert('Please save the company profile first before importing products.');
      return;
    }

    setCsvImporting(true);
    setImportResults(null);

    try {
      const formData = new FormData();
      formData.append('csvFile', file);
      formData.append('companyId', company.id);

      const response = await fetch('/api/products/import-csv', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to import CSV');
      }

      setImportResults(result);
      alert(`CSV import completed!\n${result.message}`);

      // Refresh products list
      if (company.id) {
        await fetchCompanyProducts(company.id);
      }

      // Clear file input
      event.target.value = '';
    } catch (error) {
      console.error('Error importing CSV:', error);
      alert(`Failed to import CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setCsvImporting(false);
    }
  };

  const inputClass = "w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 transition-colors";
  const labelClass = "block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Company Profile</h2>
        <p className="text-sm text-gray-500 mt-1">Manage your company information and product catalog</p>
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

        {/* ── Add Products ── */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Add Products</h3>
            <div className="flex items-center gap-2">
              {!company.id && (
                <span className="text-[10px] text-gray-400 italic">Save company first</span>
              )}
              <div className="relative">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCSVImport}
                  disabled={csvImporting || !company.id}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  id="csv-import"
                />
                <label
                  htmlFor="csv-import"
                  className={`px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide rounded-lg transition-colors ${
                    csvImporting || !company.id
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer'
                  }`}
                >
                  {csvImporting ? 'Importing...' : 'Import CSV'}
                </label>
              </div>
            </div>
          </div>

          {importResults && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <h4 className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-1">Import Complete</h4>
              <div className="flex items-center gap-4 text-xs text-emerald-700">
                <span><strong className="tabular-nums">{importResults.results?.successful || 0}</strong> successful</span>
                <span><strong className="tabular-nums">{importResults.results?.failed || 0}</strong> failed</span>
                <span><strong className="tabular-nums">{importResults.results?.total || 0}</strong> total</span>
              </div>
              {importResults.results?.errors?.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-[10px] font-semibold text-emerald-600 uppercase tracking-wide">View Errors</summary>
                  <ul className="mt-2 text-xs space-y-0.5">
                    {importResults.results.errors.map((error: string, index: number) => (
                      <li key={index} className="text-red-600">- {error}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}

          <div className="space-y-2">
            {products.map((product, index) => (
              <div key={index} className="grid grid-cols-[1fr_1fr_2fr_auto] gap-2 items-start">
                <input
                  type="text"
                  value={product.name || ''}
                  onChange={(e) => handleProductChange(index, 'name', e.target.value)}
                  className={inputClass}
                  placeholder="Product name"
                />
                <input
                  type="text"
                  value={product.category || ''}
                  onChange={(e) => handleProductChange(index, 'category', e.target.value)}
                  className={inputClass}
                  placeholder="Category"
                />
                <textarea
                  value={product.description || ''}
                  onChange={(e) => handleProductChange(index, 'description', e.target.value)}
                  className={inputClass}
                  placeholder="Description"
                  rows={1}
                />
                <button
                  type="button"
                  onClick={() => removeProduct(index)}
                  className="p-2 rounded-lg bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                  title="Remove"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addProduct}
            className="mt-3 flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Add Product
          </button>
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

      {/* ── Saved Products ── */}
      {savedProducts.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Saved Products ({savedProducts.length})</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {savedProducts.map((product) => (
              <div
                key={product.id}
                className="rounded-xl border border-gray-200 p-3 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="text-sm font-semibold text-gray-900 truncate flex-1">{product.name}</h4>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded bg-slate-100 text-slate-600 uppercase tracking-wide">
                    {product.category}
                  </span>
                </div>

                <p className="text-xs text-gray-500 line-clamp-2 mb-3">{product.description}</p>

                {product.features && product.features.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Features</p>
                    <div className="flex flex-wrap gap-1">
                      {product.features.slice(0, 3).map((feature, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded bg-indigo-50 text-indigo-600"
                        >
                          {feature}
                        </span>
                      ))}
                      {product.features.length > 3 && (
                        <span className="text-[10px] text-gray-400">+{product.features.length - 3}</span>
                      )}
                    </div>
                  </div>
                )}

                {product.specifications && Object.keys(product.specifications).length > 0 && (
                  <details className="mb-2">
                    <summary className="text-[10px] font-semibold text-indigo-600 cursor-pointer hover:text-indigo-700 uppercase tracking-wide">
                      View Specs
                    </summary>
                    <div className="mt-2 space-y-1">
                      {Object.entries(product.specifications).slice(0, 5).map(([key, value]) => (
                        <div key={key} className="flex justify-between text-[10px]">
                          <span className="text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                          <span className="text-gray-700 text-right ml-2 truncate">
                            {String(value).substring(0, 30)}{String(value).length > 30 ? '...' : ''}
                          </span>
                        </div>
                      ))}
                      {Object.keys(product.specifications).length > 5 && (
                        <p className="text-[10px] text-gray-400 text-center">
                          +{Object.keys(product.specifications).length - 5} more
                        </p>
                      )}
                    </div>
                  </details>
                )}

                <p className="text-[10px] text-gray-400 pt-2 border-t border-gray-100">
                  Added {new Date(product.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}