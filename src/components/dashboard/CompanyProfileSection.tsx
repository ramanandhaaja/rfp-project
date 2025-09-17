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

      // Save products
      for (const product of products) {
        if (product.name.trim()) {
          const productResponse = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              companyId,
              name: product.name,
              category: product.category,
              description: product.description,
              features: product.features || [],
            }),
          });

          if (!productResponse.ok) {
            console.error('Failed to save product:', product.name);
          }
        }
      }

      alert('Company profile and products saved successfully!');

      // Refresh the saved products list
      if (companyId) {
        await fetchCompanyProducts(companyId);
      }

      // Reset the manual product form
      setProducts([{ name: '', description: '', category: '', features: [] }]);

      await fetchExistingCompanies();
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

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Company Profile</h1>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Company Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Company Name *
              </label>
              <input
                type="text"
                required
                value={company.name}
                onChange={(e) => handleCompanyChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter company name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Industry *
              </label>
              <select
                required
                value={company.industry}
                onChange={(e) => handleCompanyChange('industry', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
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

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Website
              </label>
              <input
                type="url"
                value={company.website || ''}
                onChange={(e) => handleCompanyChange('website', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                placeholder="https://company.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Contact Email
              </label>
              <input
                type="email"
                value={company.contactEmail || ''}
                onChange={(e) => handleCompanyChange('contactEmail', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                placeholder="contact@company.com"
              />
            </div>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Company Description *
          </label>
          <textarea
            required
            rows={4}
            value={company.description}
            onChange={(e) => handleCompanyChange('description', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
            placeholder="Describe your company, services, and key capabilities..."
          />
        </div>

        <div className="mb-6">
          <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-4">Capabilities</h3>
          <div className="flex flex-wrap gap-2 mb-3">
            {company.capabilities?.map((capability, index) => (
              <span
                key={index}
                className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm flex items-center gap-2"
              >
                {capability}
                <button
                  type="button"
                  onClick={() => removeCapability(capability)}
                  className="text-indigo-600 hover:text-indigo-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <input
            type="text"
            placeholder="Add capability (press Enter)"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCapabilityAdd(e.currentTarget.value);
                e.currentTarget.value = '';
              }
            }}
          />
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-md font-semibold text-gray-900 dark:text-white">Products & Services</h3>
            <div className="flex items-center gap-4">
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
                  className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                    csvImporting || !company.id
                      ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                      : 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100 cursor-pointer'
                  }`}
                >
                  {csvImporting ? 'Importing...' : '📄 Import CSV'}
                </label>
              </div>
              {!company.id && (
                <span className="text-sm text-gray-500">Save company first</span>
              )}
            </div>
          </div>

          {importResults && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2">Import Results</h4>
              <div className="text-sm text-green-700">
                <p>✅ Successful: {importResults.results?.successful || 0}</p>
                <p>❌ Failed: {importResults.results?.failed || 0}</p>
                <p>📊 Total: {importResults.results?.total || 0}</p>
                {importResults.results?.errors?.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer font-medium">View Errors</summary>
                    <ul className="mt-2 text-xs space-y-1">
                      {importResults.results.errors.map((error: string, index: number) => (
                        <li key={index} className="text-red-600">• {error}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            </div>
          )}

          <div className="space-y-4">
            {products.map((product, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg">
                <input
                  type="text"
                  value={product.name || ''}
                  onChange={(e) => handleProductChange(index, 'name', e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Product/Service name"
                />
                <input
                  type="text"
                  value={product.category || ''}
                  onChange={(e) => handleProductChange(index, 'category', e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Category"
                />
                <div className="flex gap-2">
                  <textarea
                    value={product.description || ''}
                    onChange={(e) => handleProductChange(index, 'description', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Description"
                    rows={1}
                  />
                  <button
                    type="button"
                    onClick={() => removeProduct(index)}
                    className="px-4 py-2 text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addProduct}
            className="mt-4 px-4 py-2 text-indigo-600 hover:text-indigo-800 text-sm font-medium"
          >
            + Add Product/Service
          </button>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            {loading ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>

      {/* Saved Products Section */}
      {savedProducts.length > 0 && (
        <div className="mt-8 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Saved Products ({savedProducts.length})
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedProducts.map((product) => (
              <div
                key={product.id}
                className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="mb-2">
                  <h3 className="font-medium text-gray-900 dark:text-white text-sm">
                    {product.name}
                  </h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                    {product.category}
                  </span>
                </div>

                <p className="text-xs text-gray-600 dark:text-gray-300 mb-3 line-clamp-3">
                  {product.description}
                </p>

                {product.features && product.features.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Features:</p>
                    <div className="flex flex-wrap gap-1">
                      {product.features.slice(0, 3).map((feature, index) => (
                        <span
                          key={index}
                          className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
                        >
                          {feature}
                        </span>
                      ))}
                      {product.features.length > 3 && (
                        <span className="text-xs text-gray-500">
                          +{product.features.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {product.specifications && Object.keys(product.specifications).length > 0 && (
                  <details className="mt-2">
                    <summary className="text-xs text-indigo-600 cursor-pointer hover:text-indigo-800">
                      View Specifications
                    </summary>
                    <div className="mt-2 text-xs space-y-1">
                      {Object.entries(product.specifications).slice(0, 5).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400 capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}:
                          </span>
                          <span className="text-gray-800 dark:text-gray-200 text-right ml-2">
                            {String(value).substring(0, 30)}
                            {String(value).length > 30 ? '...' : ''}
                          </span>
                        </div>
                      ))}
                      {Object.keys(product.specifications).length > 5 && (
                        <p className="text-gray-500 text-center">
                          +{Object.keys(product.specifications).length - 5} more specs
                        </p>
                      )}
                    </div>
                  </details>
                )}

                <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-600">
                  <p className="text-xs text-gray-400">
                    Added: {new Date(product.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}