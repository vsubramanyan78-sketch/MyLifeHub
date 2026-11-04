import React, { useState } from 'react';
import {
  ShoppingBag,
  Plus,
  Search,
  Sparkles,
  AlertTriangle,
  Clock,
  CheckCircle,
  Trash2,
  Minus,
  Check,
  ChefHat,
  DollarSign,
  Layers,
  X,
  ListPlus,
  RefreshCw,
  Dna,
  BarChart3,
  Bell,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useData } from '../../../context/DataContext';
import {
  PantryItem,
  PantryCategory,
  PantryUnit,
  ShoppingList,
  ShoppingListItem,
} from '../../../types';
import { formatCurrency } from '../../../lib/currency';
import { NutritionScienceModal } from './NutritionScienceModal';

const PANTRY_CATEGORIES: PantryCategory[] = [
  'Vegetables',
  'Fruits',
  'Grains',
  'Dairy',
  'Meat and Eggs',
  'Snacks',
  'Beverages',
  'Household Supplies',
  'Other',
];

const UNITS: PantryUnit[] = ['kg', 'g', 'litre', 'ml', 'pieces', 'packets', 'boxes'];

const CATEGORY_CAPACITIES: Record<PantryCategory, { capacity: number; defaultUnit: string }> = {
  Vegetables: { capacity: 10, defaultUnit: 'kg' },
  Fruits: { capacity: 8, defaultUnit: 'kg' },
  Grains: { capacity: 15, defaultUnit: 'kg' },
  Dairy: { capacity: 8, defaultUnit: 'litre' },
  'Meat and Eggs': { capacity: 8, defaultUnit: 'kg' },
  Snacks: { capacity: 12, defaultUnit: 'packets' },
  Beverages: { capacity: 10, defaultUnit: 'litre' },
  'Household Supplies': { capacity: 15, defaultUnit: 'pieces' },
  Other: { capacity: 10, defaultUnit: 'units' },
};

export const PantryPilot: React.FC = () => {
  const { profile } = useAuth();
  const {
    pantryItems,
    shoppingLists,
    addPantryItem,
    updatePantryItem,
    deletePantryItem,
    consumePantryItem,
    addShoppingList,
    updateShoppingList,
    deleteShoppingList,
    purchaseShoppingItem,
    requestBrowserNotificationPermission,
  } = useData();

  const reportingCurrency = profile?.preferredCurrency || 'INR';

  const [activeTab, setActiveTab] = useState<'inventory' | 'shopping' | 'recipes'>('inventory');

  // Calculate category usage vs total capacity statistics
  const categoryUsageStats = PANTRY_CATEGORIES.map((cat) => {
    const catItems = pantryItems.filter((item) => item.category === cat);
    const currentUsage = catItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const config = CATEGORY_CAPACITIES[cat] || { capacity: 10, defaultUnit: 'units' };
    const capacity = Math.max(config.capacity, Math.ceil(currentUsage));
    const usagePercent = Math.min(100, Math.round((currentUsage / capacity) * 100));
    const lowStockCount = catItems.filter((i) => i.quantity <= i.lowStockThreshold).length;

    return {
      category: cat,
      currentUsage: Math.round(currentUsage * 10) / 10,
      capacity,
      unit: catItems[0]?.unit || config.defaultUnit,
      usagePercent,
      itemCount: catItems.length,
      lowStockCount,
    };
  });

  const totalCurrentStock = categoryUsageStats.reduce((sum, s) => sum + s.currentUsage, 0);
  const totalCategoryCapacity = categoryUsageStats.reduce((sum, s) => sum + s.capacity, 0);
  const overallPantryFillPercent = totalCategoryCapacity > 0
    ? Math.min(100, Math.round((totalCurrentStock / totalCategoryCapacity) * 100))
    : 0;
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBioIngredient, setSelectedBioIngredient] = useState<string | null>(null);

  // Add Item Modal
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemCat, setItemCat] = useState<PantryCategory>('Vegetables');
  const [itemQty, setItemQty] = useState('1');
  const [itemUnit, setItemUnit] = useState<PantryUnit>('kg');
  const [itemThreshold, setItemThreshold] = useState('1');
  const [itemExpiry, setItemExpiry] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemLocation, setItemLocation] = useState('Pantry');

  // Add Shopping Item Modal
  const [isAddShoppingOpen, setIsAddShoppingOpen] = useState(false);
  const [shopName, setShopName] = useState('');
  const [shopCat, setShopCat] = useState<PantryCategory>('Groceries' as any);
  const [shopQty, setShopQty] = useState('1');
  const [shopUnit, setShopUnit] = useState<PantryUnit>('pieces');
  const [shopCost, setShopCost] = useState('');
  const [shopRecordExpense, setShopRecordExpense] = useState(true);

  // AI Recipe State
  const [recipes, setRecipes] = useState<any[]>([]);
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(false);
  const [recipePref, setRecipePref] = useState('');

  // Handle Save Pantry Item
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName) return;

    await addPantryItem({
      name: itemName,
      category: itemCat,
      quantity: Number(itemQty) || 1,
      unit: itemUnit,
      lowStockThreshold: Number(itemThreshold) || 1,
      purchaseDate: new Date().toISOString().split('T')[0],
      expiryDate: itemExpiry || undefined,
      price: itemPrice ? Number(itemPrice) : undefined,
      currency: reportingCurrency,
      location: itemLocation,
    });

    setIsAddItemOpen(false);
    setItemName('');
    setItemQty('1');
    setItemExpiry('');
    setItemPrice('');
  };

  // Handle Add to Shopping List
  const handleAddToShoppingList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName) return;

    let targetList = shoppingLists[0];
    const newItem: ShoppingListItem = {
      id: `shop_item_${Date.now()}`,
      name: shopName,
      category: shopCat,
      quantity: Number(shopQty) || 1,
      unit: shopUnit,
      estimatedCost: shopCost ? Number(shopCost) : undefined,
      isBought: false,
    };

    if (targetList) {
      await updateShoppingList(targetList.id, {
        items: [...targetList.items, newItem],
      });
    } else {
      await addShoppingList({
        name: 'Weekly Grocery Needs',
        items: [newItem],
        isCompleted: false,
      });
    }

    setIsAddShoppingOpen(false);
    setShopName('');
    setShopCost('');
  };

  // Fetch AI recipes based on stocked pantry items
  const handleFetchRecipes = async () => {
    setIsLoadingRecipes(true);
    try {
      const resp = await fetch('/api/gemini/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: pantryItems.map((p) => ({
            name: p.name,
            quantity: `${p.quantity} ${p.unit}`,
            category: p.category,
            expiryDate: p.expiryDate,
          })),
          preferences: recipePref,
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data.recipes) {
          setRecipes(data.recipes);
        }
      }
    } catch (err) {
      console.error('Failed to get recipes:', err);
    } finally {
      setIsLoadingRecipes(false);
    }
  };

  // Filtered pantry items
  const filteredItems = pantryItems.filter((item) => {
    const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <ShoppingBag className="w-5 h-5" />
            </span>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
              PantryPilot Groceries & Stock
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Household ingredients inventory, expiration countdowns, automated grocery purchase workflows, and AI recipes.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={async () => {
              const granted = await requestBrowserNotificationPermission();
              if (granted) {
                alert('Browser notifications enabled! You will now receive low-stock alerts automatically.');
              } else {
                alert('Notification permission not granted. Please allow notifications in your browser settings.');
              }
            }}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors"
            title="Enable browser notifications for low-stock alerts"
          >
            <Bell className="w-3.5 h-3.5 text-amber-500" />
            <span>Low-Stock Alerts</span>
          </button>
          <button
            onClick={() => setIsAddShoppingOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors"
          >
            <ListPlus className="w-3.5 h-3.5 text-blue-500" />
            <span>Add to Shopping List</span>
          </button>
          <button
            onClick={() => setIsAddItemOpen(true)}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Stock Item</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
            activeTab === 'inventory'
              ? 'bg-blue-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Pantry Stock ({pantryItems.length})
        </button>
        <button
          onClick={() => setActiveTab('shopping')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
            activeTab === 'shopping'
              ? 'bg-blue-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Shopping Lists (
          {shoppingLists.reduce((sum, l) => sum + l.items.filter((i) => !i.isBought).length, 0)} due)
        </button>
        <button
          onClick={() => {
            setActiveTab('recipes');
            if (recipes.length === 0) handleFetchRecipes();
          }}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
            activeTab === 'recipes'
              ? 'bg-blue-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>AI Recipe Chef</span>
        </button>
      </div>

      {/* TAB 1: PANTRY INVENTORY */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          {/* Visual Progress Bar Section: Food Category Capacity & Usage */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Category Storage Capacity & Usage
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Visual stocking capacity vs current inventory usage per food category.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2.5">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Overall Pantry: <strong className="text-blue-500 font-extrabold">{overallPantryFillPercent}% Filled</strong>
                </span>
                <div className="w-28 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200/50 dark:border-slate-700/50">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      overallPantryFillPercent < 25
                        ? 'bg-amber-500'
                        : overallPantryFillPercent > 85
                        ? 'bg-indigo-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${overallPantryFillPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Food Category Progress Bars Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {categoryUsageStats.map((stat) => {
                const isSelected = selectedCategory === stat.category;
                const isLow = stat.usagePercent < 25;
                const isHigh = stat.usagePercent > 85;

                return (
                  <div
                    key={stat.category}
                    onClick={() => setSelectedCategory(isSelected ? 'All' : stat.category)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-500/10 border-blue-500/50 ring-1 ring-blue-500/30'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center space-x-1.5 min-w-0">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {stat.category}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          ({stat.itemCount} {stat.itemCount === 1 ? 'item' : 'items'})
                        </span>
                      </div>

                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          isLow
                            ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                            : isHigh
                            ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20'
                            : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                        }`}
                      >
                        {stat.usagePercent}%
                      </span>
                    </div>

                    {/* Current Usage vs Capacity Text */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">
                      <span>
                        Usage: <strong className="text-slate-800 dark:text-slate-200">{stat.currentUsage}</strong> / {stat.capacity} {stat.unit}
                      </span>
                      {stat.lowStockCount > 0 && (
                        <span className="text-rose-500 font-semibold text-[10px]">
                          {stat.lowStockCount} low
                        </span>
                      )}
                    </div>

                    {/* Visual Progress Bar */}
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isLow
                            ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                            : isHigh
                            ? 'bg-gradient-to-r from-indigo-500 to-blue-500'
                            : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                        }`}
                        style={{ width: `${stat.usagePercent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

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
                All ({pantryItems.length})
              </button>
              {PANTRY_CATEGORIES.map((cat) => (
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
                placeholder="Filter ingredients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none"
              />
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
              No pantry items found. Add ingredients to monitor freshness and low stock!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) => {
                const isLowStock = item.quantity <= item.lowStockThreshold;
                let isExpiringSoon = false;
                let daysToExpiry: number | null = null;

                if (item.expiryDate) {
                  const exp = new Date(item.expiryDate);
                  daysToExpiry = Math.ceil((exp.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  if (daysToExpiry <= 4) isExpiringSoon = true;
                }

                return (
                  <div
                    key={item.id}
                    className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:shadow-md transition-all"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                          {item.category}
                        </span>
                        <div className="flex items-center space-x-1">
                          {isLowStock && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500">
                              Low Stock
                            </span>
                          )}
                          {isExpiringSoon && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500">
                              {daysToExpiry !== null && daysToExpiry <= 0
                                ? 'Expired'
                                : `Exp: ${daysToExpiry}d`}
                            </span>
                          )}
                        </div>
                      </div>

                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                        {item.name}
                      </h3>
                      {item.location && (
                        <p className="text-[11px] text-slate-400 mt-0.5">{item.location}</p>
                      )}

                      <div className="mt-3 flex items-baseline space-x-2">
                        <span className="text-2xl font-black text-slate-900 dark:text-white">
                          {item.quantity}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">{item.unit}</span>
                      </div>
                    </div>

                    {/* Bottom actions: Quick Consume / Science / Delete */}
                    <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => consumePantryItem(item.id, 1)}
                          className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-300 transition-colors"
                          title="Consume 1 unit"
                        >
                          <Minus className="w-3 h-3" />
                          <span>Use 1 {item.unit}</span>
                        </button>
                        <button
                          onClick={() => setSelectedBioIngredient(item.name)}
                          className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold transition-colors"
                          title="View Biochemical & Nutritional Analysis"
                        >
                          <Dna className="w-3 h-3" />
                          <span>Science</span>
                        </button>
                      </div>

                      <button
                        onClick={() => deletePantryItem(item.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bioscience Modal */}
          {selectedBioIngredient && (
            <NutritionScienceModal
              ingredientName={selectedBioIngredient}
              onClose={() => setSelectedBioIngredient(null)}
            />
          )}
        </div>
      )}

      {/* TAB 2: SHOPPING LISTS & WORKFLOW B */}
      {activeTab === 'shopping' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-500 flex items-center justify-between">
            <div>
              <span className="font-bold">Workflow B Enabled:</span> Marking an item as bought
              automatically increases your pantry stock and offers to record the cost directly in
              SpendSense!
            </div>
            <button
              onClick={() => setIsAddShoppingOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-blue-600 text-white font-semibold text-xs shrink-0"
            >
              Add Item
            </button>
          </div>

          {shoppingLists.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
              No shopping list created yet. Plan your groceries and check them off when purchased!
            </div>
          ) : (
            <div className="space-y-4">
              {shoppingLists.map((list) => (
                <div
                  key={list.id}
                  className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      {list.name}
                    </h3>
                    <button
                      onClick={() => deleteShoppingList(list.id)}
                      className="text-slate-400 hover:text-rose-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {list.items.map((item) => (
                      <div
                        key={item.id}
                        className="py-2.5 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() =>
                              purchaseShoppingItem(list.id, item.id, { createExpense: true })
                            }
                            className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                              item.isBought
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : 'border-slate-300 dark:border-slate-600 hover:border-blue-500'
                            }`}
                            title={item.isBought ? 'Already purchased' : 'Mark bought & sync'}
                          >
                            {item.isBought && <Check className="w-3.5 h-3.5" />}
                          </button>
                          <span
                            className={
                              item.isBought
                                ? 'line-through text-slate-400'
                                : 'font-semibold text-slate-800 dark:text-slate-200'
                            }
                          >
                            {item.name} ({item.quantity} {item.unit})
                          </span>
                        </div>

                        <div className="flex items-center space-x-3">
                          {item.estimatedCost && (
                            <span className="font-bold text-slate-600 dark:text-slate-300">
                              {formatCurrency(item.estimatedCost, reportingCurrency)}
                            </span>
                          )}
                          {!item.isBought && (
                            <button
                              onClick={() =>
                                purchaseShoppingItem(list.id, item.id, { createExpense: true })
                              }
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[11px] shadow-sm transition-transform active:scale-95"
                            >
                              Buy & Sync
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: AI RECIPE CHEF */}
      {activeTab === 'recipes' && (
        <div className="space-y-4">
          <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <ChefHat className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  PantryPilot Smart Recipe Engine
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-xl">
                Uses your real inventory to recommend meals, preventing food waste by prioritizing items nearing expiration.
              </p>
            </div>

            <button
              onClick={handleFetchRecipes}
              disabled={isLoadingRecipes}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all shrink-0"
            >
              {isLoadingRecipes ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Chef is Cooking Ideas...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate New Recipes</span>
                </>
              )}
            </button>
          </div>

          {recipes.length === 0 && !isLoadingRecipes ? (
            <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
              Click "Generate New Recipes" to let Gemini create custom dishes using your available pantry stock.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recipes.map((rec, i) => (
                <div
                  key={i}
                  className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">
                        {rec.difficulty || 'Easy'}
                      </span>
                      <span className="text-[10px] text-slate-400">{rec.cookingTime}</span>
                    </div>

                    <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
                      {rec.title}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                      {rec.description}
                    </p>

                    <div className="space-y-2 mb-3">
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-emerald-500 tracking-wider">
                          Pantry Items Used
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {rec.usedIngredients?.map((ing: string, j: number) => (
                            <span
                              key={j}
                              className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 text-[10px] font-medium"
                            >
                              {ing}
                            </span>
                          ))}
                        </div>
                      </div>

                      {rec.missingIngredients?.length > 0 && (
                        <div>
                          <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                            Pantry Staples Needed
                          </span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {rec.missingIngredients.map((ing: string, j: number) => (
                              <span
                                key={j}
                                className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-400 text-[10px]"
                              >
                                {ing}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                    <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                      Quick Instructions:
                    </span>
                    <ol className="text-[11px] text-slate-600 dark:text-slate-300 list-decimal pl-4 space-y-1">
                      {rec.instructions?.slice(0, 3).map((step: string, sIdx: number) => (
                        <li key={sIdx}>{step}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Stock Item Modal */}
      {isAddItemOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-3">
              Add Item to Pantry Inventory
            </h3>
            <form onSubmit={handleSaveItem} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g. Basmati Rice, Olive Oil, Eggs"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={itemCat}
                    onChange={(e) => setItemCat(e.target.value as PantryCategory)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-2 text-xs"
                  >
                    {PANTRY_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={itemLocation}
                    onChange={(e) => setItemLocation(e.target.value)}
                    placeholder="e.g. Fridge, Shelf 2"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={itemQty}
                    onChange={(e) => setItemQty(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Unit
                  </label>
                  <select
                    value={itemUnit}
                    onChange={(e) => setItemUnit(e.target.value as PantryUnit)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-2 text-xs"
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Low Stock Threshold
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={itemThreshold}
                    onChange={(e) => setItemThreshold(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={itemExpiry}
                    onChange={(e) => setItemExpiry(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-2 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddItemOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-semibold"
                >
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Shopping Item Modal */}
      {isAddShoppingOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-3">
              Add to Grocery Shopping List
            </h3>
            <form onSubmit={handleAddToShoppingList} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="e.g. Sourdough Bread, Almond Milk"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={shopQty}
                    onChange={(e) => setShopQty(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Unit
                  </label>
                  <select
                    value={shopUnit}
                    onChange={(e) => setShopUnit(e.target.value as PantryUnit)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-2 text-xs"
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Estimated Cost ({reportingCurrency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={shopCost}
                  onChange={(e) => setShopCost(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddShoppingOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-semibold"
                >
                  Add to List
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
