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
  specifications: Record<string, string | number | boolean>;
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

export default function ProductManagementSection() {
  const { data: session } = useSession();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([{ name: '', description: '', category: '', features: [] }]);
  const [savedProducts, setSavedProducts] = useState<SavedProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [csvImporting, setCsvImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResults | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<SavedProduct>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user) {
      fetchCompany();
    }
  }, [session]);

  const fetchCompany = async () => {
    try {
      const response = await fetch('/api/companies');
      if (response.ok) {
        const data = await response.json();
        if (data.companies.length > 0) {
          const id = data.companies[0].id;
          setCompanyId(id);
          await fetchCompanyProducts(id);
        }
      }
    } catch (error) {
      console.error('Error fetching company:', error);
    }
  };

  const fetchCompanyProducts = async (id: string) => {
    try {
      const response = await fetch(`/api/products?companyId=${id}`);
      if (response.ok) {
        const data = await response.json();
        setSavedProducts(data.products || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
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

  const handleSaveProducts = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
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
        alert(`${failedProducts.length} product(s) failed to save: ${failedProducts.join(', ')}`);
      } else {
        alert('Products saved successfully!');
      }

      await fetchCompanyProducts(companyId);
      setProducts([{ name: '', description: '', category: '', features: [] }]);
    } catch (error) {
      console.error('Error saving products:', error);
      alert('Failed to save products. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCSVImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !companyId) return;

    setCsvImporting(true);
    setImportResults(null);

    try {
      const formData = new FormData();
      formData.append('csvFile', file);
      formData.append('companyId', companyId);

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
      await fetchCompanyProducts(companyId);
      event.target.value = '';
    } catch (error) {
      console.error('Error importing CSV:', error);
      alert(`Failed to import CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setCsvImporting(false);
    }
  };

  const startEdit = (product: SavedProduct) => {
    setEditingId(product.id);
    setEditDraft({ name: product.name, category: product.category, description: product.description, features: product.features });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft({});
  };

  const saveEdit = async (id: string) => {
    try {
      const response = await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...editDraft }),
      });
      if (!response.ok) throw new Error('Failed to update');
      setSavedProducts(prev => prev.map(p => p.id === id ? { ...p, ...editDraft as SavedProduct } : p));
      cancelEdit();
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Failed to update product.');
    }
  };

  const deleteProduct = async (id: string) => {
    setDeletingId(id);
    try {
      const response = await fetch(`/api/products?id=${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete');
      setSavedProducts(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product.');
    } finally {
      setDeletingId(null);
    }
  };

  const inputClass = "w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 transition-colors";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Product Management</h2>
        <p className="text-sm text-gray-500 mt-1">Manage your product catalog — add manually or import via CSV</p>
      </div>

      {/* No company gate */}
      {!companyId && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-amber-700">
            Set up your{' '}
            <a href="/dashboard/company-profile" className="underline hover:text-amber-800">
              Company Profile
            </a>{' '}
            first before adding products.
          </p>
        </div>
      )}

      {/* ── Add Products ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Add Products</h3>
          <div className="flex items-center gap-2">
            {!companyId && (
              <span className="text-[10px] text-gray-400 italic">Save company first</span>
            )}
            <div className="relative">
              <input
                type="file"
                accept=".csv"
                onChange={handleCSVImport}
                disabled={csvImporting || !companyId}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                id="csv-import"
              />
              <label
                htmlFor="csv-import"
                className={`px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide rounded-lg transition-colors ${
                  csvImporting || !companyId
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
                disabled={!companyId}
              />
              <input
                type="text"
                value={product.category || ''}
                onChange={(e) => handleProductChange(index, 'category', e.target.value)}
                className={inputClass}
                placeholder="Category"
                disabled={!companyId}
              />
              <textarea
                value={product.description || ''}
                onChange={(e) => handleProductChange(index, 'description', e.target.value)}
                className={inputClass}
                placeholder="Description"
                rows={1}
                disabled={!companyId}
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

        <div className="flex items-center justify-between mt-3">
          <button
            type="button"
            onClick={addProduct}
            disabled={!companyId}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Add Product
          </button>

          <button
            type="button"
            onClick={handleSaveProducts}
            disabled={loading || !companyId}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors uppercase tracking-wide"
          >
            {loading ? 'Saving...' : 'Save Products'}
          </button>
        </div>
      </div>

      {/* ── Saved Products ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Saved Products {savedProducts.length > 0 && `(${savedProducts.length})`}
          </h3>
        </div>

        {savedProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-500">No products yet</p>
            <p className="text-xs text-gray-400 mt-1">Add products manually or import a CSV above</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {savedProducts.map((product) => {
              const isEditing = editingId === product.id;
              const isDeleting = deletingId === product.id;

              if (isEditing) {
                return (
                  <div key={product.id} className="rounded-xl border border-indigo-300 bg-indigo-50/30 p-3">
                    <p className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wider mb-3">Editing</p>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editDraft.name || ''}
                        onChange={(e) => setEditDraft(d => ({ ...d, name: e.target.value }))}
                        className={inputClass}
                        placeholder="Product name"
                      />
                      <input
                        type="text"
                        value={editDraft.category || ''}
                        onChange={(e) => setEditDraft(d => ({ ...d, category: e.target.value }))}
                        className={inputClass}
                        placeholder="Category"
                      />
                      <textarea
                        value={editDraft.description || ''}
                        onChange={(e) => setEditDraft(d => ({ ...d, description: e.target.value }))}
                        className={inputClass}
                        placeholder="Description"
                        rows={3}
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => saveEdit(product.id)}
                        className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={product.id}
                  className="rounded-xl border border-gray-200 p-3 hover:border-gray-300 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="text-sm font-semibold text-gray-900 truncate flex-1">{product.name}</h4>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button
                        onClick={() => startEdit(product)}
                        className="p-1.5 rounded-md text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        title="Edit"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => deleteProduct(product.id)}
                        disabled={isDeleting}
                        className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                        title="Delete"
                      >
                        {isDeleting ? (
                          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </div>
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
