import React, { useState } from 'react';
import {
  Wrench,
  Plus,
  Search,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Trash2,
  Edit,
  DollarSign,
  ShieldCheck,
  Tag,
  MapPin,
  FileText,
  X,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useData } from '../../../context/DataContext';
import { AssetItem, AssetCategory, MaintenanceRecord } from '../../../types';
import { formatCurrency, SUPPORTED_CURRENCIES } from '../../../lib/currency';

const ASSET_CATEGORIES: AssetCategory[] = [
  'Home Appliances',
  'Electronics',
  'Vehicles',
  'Furniture',
  'Equipment',
  'Other',
];

export const FixFlow: React.FC = () => {
  const { profile } = useAuth();
  const {
    assets,
    maintenanceRecords,
    addAsset,
    deleteAsset,
    addMaintenanceRecord,
    deleteMaintenanceRecord,
  } = useData();

  const reportingCurrency = profile?.preferredCurrency || 'INR';

  const [activeTab, setActiveTab] = useState<'assets' | 'maintenance'>('assets');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Add Asset Modal
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [assetName, setAssetName] = useState('');
  const [assetCategory, setAssetCategory] = useState<AssetCategory>('Home Appliances');
  const [assetBrand, setAssetBrand] = useState('');
  const [assetModel, setAssetModel] = useState('');
  const [assetSerial, setAssetSerial] = useState('');
  const [assetPurchaseDate, setAssetPurchaseDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [assetPrice, setAssetPrice] = useState('');
  const [assetCurrency, setAssetCurrency] = useState(reportingCurrency);
  const [assetWarrantyEnd, setAssetWarrantyEnd] = useState('');
  const [assetCondition, setAssetCondition] = useState<
    'Excellent' | 'Good' | 'Fair' | 'Needs Attention'
  >('Good');
  const [assetLocation, setAssetLocation] = useState('');
  const [assetNotes, setAssetNotes] = useState('');

  // Add Maintenance Modal
  const [isAddMaintOpen, setIsAddMaintOpen] = useState(false);
  const [maintAssetId, setMaintAssetId] = useState(assets[0]?.id || '');
  const [maintDate, setMaintDate] = useState(new Date().toISOString().split('T')[0]);
  const [maintDesc, setMaintDesc] = useState('');
  const [maintProvider, setMaintProvider] = useState('');
  const [maintCost, setMaintCost] = useState('');
  const [maintNextDate, setMaintNextDate] = useState('');
  const [maintStatus, setMaintStatus] = useState<'Scheduled' | 'Completed'>('Completed');
  const [maintLogExpense, setMaintLogExpense] = useState(true);

  // Selected asset for viewing maintenance detail
  const [viewAssetMaint, setViewAssetMaint] = useState<AssetItem | null>(null);

  // Save Asset
  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetName) return;

    await addAsset({
      name: assetName,
      category: assetCategory,
      brand: assetBrand,
      model: assetModel,
      serialNumber: assetSerial,
      purchaseDate: assetPurchaseDate,
      purchasePrice: assetPrice ? Number(assetPrice) : undefined,
      currency: assetCurrency,
      warrantyEndDate: assetWarrantyEnd || undefined,
      condition: assetCondition,
      location: assetLocation,
      notes: assetNotes,
    });

    setIsAddAssetOpen(false);
    setAssetName('');
    setAssetBrand('');
    setAssetModel('');
    setAssetPrice('');
    setAssetWarrantyEnd('');
  };

  // Save Maintenance
  const handleSaveMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!maintDesc) return;

    const targetAsset = assets.find((a) => a.id === maintAssetId) || assets[0];
    if (!targetAsset) return;

    await addMaintenanceRecord(
      {
        assetId: targetAsset.id,
        assetName: targetAsset.name,
        serviceDate: maintDate,
        description: maintDesc,
        provider: maintProvider,
        cost: maintCost ? Number(maintCost) : undefined,
        currency: reportingCurrency,
        nextServiceDate: maintNextDate || undefined,
        status: maintStatus,
      },
      maintLogExpense && maintStatus === 'Completed'
    );

    setIsAddMaintOpen(false);
    setMaintDesc('');
    setMaintCost('');
    setMaintProvider('');
    setMaintNextDate('');
  };

  // Filtered assets
  const filteredAssets = assets.filter((a) => {
    const matchesSearch =
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.brand && a.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (a.model && a.model.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = selectedCategory === 'All' || a.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-violet-500/10 text-violet-500">
              <Wrench className="w-5 h-5" />
            </span>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
              FixFlow Assets & Maintenance
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Household appliances, electronics, vehicles, warranty deadlines, and synced maintenance logs.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsAddMaintOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors"
          >
            <Clock className="w-3.5 h-3.5 text-violet-500" />
            <span>Schedule Service</span>
          </button>
          <button
            onClick={() => setIsAddAssetOpen(true)}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Register Asset</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('assets')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
            activeTab === 'assets'
              ? 'bg-blue-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Registered Assets ({assets.length})
        </button>
        <button
          onClick={() => setActiveTab('maintenance')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
            activeTab === 'maintenance'
              ? 'bg-blue-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Service & Repair History ({maintenanceRecords.length})
        </button>
      </div>

      {activeTab === 'assets' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <button
                onClick={() => setSelectedCategory('All')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === 'All'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                All ({assets.length})
              </button>
              {ASSET_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white shadow-sm font-semibold'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none"
              />
            </div>
          </div>

          {/* Asset Cards Grid */}
          {filteredAssets.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
              No registered assets found. Add appliances, electronics, or vehicles to keep track of warranties and service schedules.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAssets.map((asset) => {
                // Check warranty status
                let warrantyStatus = 'No warranty date';
                let isExpiringSoon = false;
                if (asset.warrantyEndDate) {
                  const end = new Date(asset.warrantyEndDate);
                  const diffDays = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  if (diffDays < 0) {
                    warrantyStatus = 'Warranty expired';
                  } else if (diffDays <= 60) {
                    warrantyStatus = `Expires in ${diffDays} days`;
                    isExpiringSoon = true;
                  } else {
                    warrantyStatus = `Valid until ${asset.warrantyEndDate}`;
                  }
                }

                const assetServices = maintenanceRecords.filter((m) => m.assetId === asset.id);

                return (
                  <div
                    key={asset.id}
                    className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:shadow-md transition-all group"
                  >
                    <div>
                      {/* Top badges */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-500 border border-violet-500/20">
                          {asset.category}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            asset.condition === 'Excellent'
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : asset.condition === 'Good'
                              ? 'bg-blue-500/10 text-blue-500'
                              : 'bg-amber-500/10 text-amber-500'
                          }`}
                        >
                          {asset.condition}
                        </span>
                      </div>

                      <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">
                        {asset.name}
                      </h3>
                      {(asset.brand || asset.model) && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {[asset.brand, asset.model].filter(Boolean).join(' • ')}
                        </p>
                      )}

                      {/* Details row */}
                      <div className="mt-3.5 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                        {asset.purchasePrice && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Purchase Cost:</span>
                            <span className="font-bold text-slate-900 dark:text-white">
                              {formatCurrency(asset.purchasePrice, asset.currency || reportingCurrency)}
                            </span>
                          </div>
                        )}

                        {asset.location && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Location:</span>
                            <span>{asset.location}</span>
                          </div>
                        )}

                        <div className="flex justify-between items-center pt-1 border-t border-slate-100 dark:border-slate-800">
                          <span className="text-[11px] text-slate-400">Warranty:</span>
                          <span
                            className={`text-[11px] font-medium ${
                              isExpiringSoon ? 'text-amber-500 font-bold' : 'text-slate-400'
                            }`}
                          >
                            {warrantyStatus}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom actions */}
                    <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <button
                        onClick={() => {
                          setMaintAssetId(asset.id);
                          setIsAddMaintOpen(true);
                        }}
                        className="text-xs font-semibold text-violet-500 hover:underline flex items-center space-x-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Log Service</span>
                      </button>

                      <div className="flex items-center space-x-2">
                        {assetServices.length > 0 && (
                          <span className="text-[10px] text-slate-400">
                            {assetServices.length} record(s)
                          </span>
                        )}
                        <button
                          onClick={() => deleteAsset(asset.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-500 transition-colors"
                          title="Delete Asset"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MAINTENANCE HISTORY */}
      {activeTab === 'maintenance' && (
        <div className="space-y-4">
          {maintenanceRecords.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
              No maintenance or service history recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Asset</th>
                    <th className="px-5 py-3">Description</th>
                    <th className="px-5 py-3">Provider</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Cost</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {maintenanceRecords.map((m) => (
                    <tr
                      key={m.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">{m.serviceDate}</td>
                      <td className="px-5 py-3.5 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {m.assetName}
                      </td>
                      <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300">{m.description}</td>
                      <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                        {m.provider || 'Self / Local'}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            m.status === 'Completed'
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : 'bg-amber-500/10 text-amber-500'
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {m.cost ? formatCurrency(m.cost, m.currency || reportingCurrency) : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => deleteMaintenanceRecord(m.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Asset Modal */}
      {isAddAssetOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Register Household / Tech Asset
              </h3>
              <button
                onClick={() => setIsAddAssetOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAsset} className="space-y-3 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Asset Name *
                </label>
                <input
                  type="text"
                  required
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  placeholder="e.g. LG French Door Refrigerator, Honda City"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={assetCategory}
                    onChange={(e) => setAssetCategory(e.target.value as AssetCategory)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-2 text-xs"
                  >
                    {ASSET_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Condition
                  </label>
                  <select
                    value={assetCondition}
                    onChange={(e) => setAssetCondition(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-2 text-xs"
                  >
                    <option value="Excellent">Excellent</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="Needs Attention">Needs Attention</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Brand / Manufacturer
                  </label>
                  <input
                    type="text"
                    value={assetBrand}
                    onChange={(e) => setAssetBrand(e.target.value)}
                    placeholder="e.g. Sony, Apple, Samsung"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Model Number
                  </label>
                  <input
                    type="text"
                    value={assetModel}
                    onChange={(e) => setAssetModel(e.target.value)}
                    placeholder="e.g. OLED65C3"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Purchase Price
                  </label>
                  <input
                    type="number"
                    value={assetPrice}
                    onChange={(e) => setAssetPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Warranty End Date
                  </label>
                  <input
                    type="date"
                    value={assetWarrantyEnd}
                    onChange={(e) => setAssetWarrantyEnd(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Location in House
                  </label>
                  <input
                    type="text"
                    value={assetLocation}
                    onChange={(e) => setAssetLocation(e.target.value)}
                    placeholder="e.g. Living Room, Garage"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Serial Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={assetSerial}
                    onChange={(e) => setAssetSerial(e.target.value)}
                    placeholder="SN-109284"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddAssetOpen(false)}
                  className="px-3 py-2 text-xs text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md"
                >
                  Register Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Maintenance Modal (Workflow C: Maintenance completion to SpendSense) */}
      {isAddMaintOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2">
              Log Service or Maintenance (Workflow C)
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              Keep a permanent record of repairs and automatically synchronize the cost to SpendSense.
            </p>

            <form onSubmit={handleSaveMaintenance} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Asset *
                </label>
                <select
                  value={maintAssetId}
                  onChange={(e) => setMaintAssetId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-2 text-xs"
                >
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Service Description *
                </label>
                <input
                  type="text"
                  required
                  value={maintDesc}
                  onChange={(e) => setMaintDesc(e.target.value)}
                  placeholder="e.g. Annual AC compressor overhaul, synthetic oil change"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Service Date
                  </label>
                  <input
                    type="date"
                    required
                    value={maintDate}
                    onChange={(e) => setMaintDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Cost ({reportingCurrency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={maintCost}
                    onChange={(e) => setMaintCost(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Technician / Provider
                  </label>
                  <input
                    type="text"
                    value={maintProvider}
                    onChange={(e) => setMaintProvider(e.target.value)}
                    placeholder="e.g. Authorized Service"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Next Due Date
                  </label>
                  <input
                    type="date"
                    value={maintNextDate}
                    onChange={(e) => setMaintNextDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-2 text-xs"
                  />
                </div>
              </div>

              {/* Cross-Module Toggle */}
              {maintCost && Number(maintCost) > 0 && (
                <div className="p-3 rounded-2xl bg-violet-500/10 border border-violet-500/20">
                  <label className="flex items-center space-x-2 text-xs text-slate-800 dark:text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={maintLogExpense}
                      onChange={(e) => setMaintLogExpense(e.target.checked)}
                      className="rounded text-violet-600 focus:ring-0"
                    />
                    <span>
                      Record expense of {reportingCurrency} {maintCost} in{' '}
                      <strong>SpendSense</strong> under "Household Maintenance"
                    </span>
                  </label>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddMaintOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-semibold shadow-md"
                >
                  Save Maintenance Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
