export type DocumentCategory =
  | 'Identity'
  | 'Education'
  | 'Insurance'
  | 'Finance'
  | 'Property'
  | 'Vehicle'
  | 'Household'
  | 'Medical'
  | 'Other';

export type DocumentStatus = 'uploaded' | 'processing' | 'review_required' | 'confirmed' | 'failed';

export interface DocumentItem {
  id: string;
  userId: string;
  title: string;
  category: DocumentCategory;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl?: string;
  status: DocumentStatus;
  issuingOrg?: string;
  ownerName?: string;
  issueDate?: string;
  expiryDate?: string;
  refNumber?: string;
  amount?: number | null;
  currency?: string;
  summary?: string;
  confidence?: number;
  isVerified: boolean;
  linkedAssetId?: string;
  linkedTransactionId?: string;
  createdAt: string;
  updatedAt?: string;
}

export type TransactionType = 'income' | 'expense' | 'refund' | 'transfer';

export type TransactionCategory =
  | 'Food'
  | 'Groceries'
  | 'Transportation'
  | 'Housing'
  | 'Utilities'
  | 'Healthcare'
  | 'Education'
  | 'Shopping'
  | 'Entertainment'
  | 'Travel'
  | 'Household Maintenance'
  | 'Subscriptions'
  | 'Salary'
  | 'Investments'
  | 'Other';

export interface TransactionItem {
  id: string;
  userId: string;
  description: string;
  amount: number;
  currency: string;
  reportingAmount: number;
  reportingCurrency: string;
  exchangeRate: number;
  type: TransactionType;
  category: TransactionCategory;
  subcategory?: string;
  date: string;
  accountId: string;
  accountName?: string;
  notes?: string;
  sourceModule?: 'DocuMind' | 'FixFlow' | 'PantryPilot' | 'SpendSense';
  sourceRecordId?: string;
  isRecurring?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface AccountItem {
  id: string;
  userId: string;
  name: string;
  type: 'bank' | 'card' | 'wallet' | 'cash';
  currency: string;
  balance: number;
  createdAt: string;
}

export interface BudgetItem {
  id: string;
  userId: string;
  category: TransactionCategory;
  amount: number;
  currency: string;
  month: string; // YYYY-MM
  thresholdPercent: number; // default 80%
  createdAt: string;
}

export type AssetCategory =
  | 'Home Appliances'
  | 'Electronics'
  | 'Vehicles'
  | 'Furniture'
  | 'Equipment'
  | 'Other';

export interface AssetItem {
  id: string;
  userId: string;
  name: string;
  category: AssetCategory;
  brand?: string;
  model?: string;
  serialNumber?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  currency?: string;
  warrantyEndDate?: string;
  condition: 'Excellent' | 'Good' | 'Fair' | 'Needs Attention';
  location?: string;
  notes?: string;
  documentRefId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MaintenanceRecord {
  id: string;
  userId: string;
  assetId: string;
  assetName: string;
  serviceDate: string;
  description: string;
  provider?: string;
  cost?: number;
  currency?: string;
  nextServiceDate?: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  linkedExpenseId?: string;
  documentRefId?: string;
  createdAt: string;
}

export type PantryCategory =
  | 'Vegetables'
  | 'Fruits'
  | 'Grains'
  | 'Dairy'
  | 'Meat and Eggs'
  | 'Snacks'
  | 'Beverages'
  | 'Household Supplies'
  | 'Other';

export type PantryUnit = 'kg' | 'g' | 'litre' | 'ml' | 'pieces' | 'packets' | 'boxes';

export interface PantryItem {
  id: string;
  userId: string;
  name: string;
  category: PantryCategory;
  quantity: number;
  unit: PantryUnit;
  lowStockThreshold: number;
  purchaseDate?: string;
  expiryDate?: string;
  price?: number;
  currency?: string;
  location?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ShoppingListItem {
  id: string;
  name: string;
  category: PantryCategory;
  quantity: number;
  unit: PantryUnit;
  estimatedCost?: number;
  isBought: boolean;
}

export interface ShoppingList {
  id: string;
  userId: string;
  name: string;
  items: ShoppingListItem[];
  isCompleted: boolean;
  createdAt: string;
  updatedAt?: string;
}

export type ReminderCategory =
  | 'Document Expiry'
  | 'Warranty Expiry'
  | 'Maintenance'
  | 'Grocery Expiry'
  | 'Low Stock'
  | 'Budget Alert'
  | 'Bill Payment'
  | 'General';

export type ReminderPriority = 'low' | 'medium' | 'high';

export interface ReminderItem {
  id: string;
  userId: string;
  title: string;
  description?: string;
  category: ReminderCategory;
  dueDate: string;
  priority: ReminderPriority;
  status: 'pending' | 'completed' | 'snoozed';
  relatedModule?: 'DocuMind' | 'SpendSense' | 'FixFlow' | 'PantryPilot';
  relatedRecordId?: string;
  createdAt: string;
  completedAt?: string;
}

export type AutomationEventType =
  | 'DOCUMENT_CONFIRMED'
  | 'PURCHASE_RECORDED'
  | 'ASSET_CREATED'
  | 'MAINTENANCE_COMPLETED'
  | 'GROCERY_PURCHASED'
  | 'STOCK_LOW'
  | 'BUDGET_THRESHOLD_REACHED'
  | 'DOCUMENT_EXPIRING'
  | 'WARRANTY_EXPIRING';

export interface AutomationEvent {
  id: string;
  userId: string;
  eventType: AutomationEventType;
  sourceModule: 'DocuMind' | 'SpendSense' | 'FixFlow' | 'PantryPilot' | 'Automation';
  sourceRecordId: string;
  payload: Record<string, any>;
  status: 'processed' | 'pending' | 'ignored';
  message: string;
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  preferredCurrency: string;
  country: string;
  timezone: string;
  dateFormat: string;
  monthlyBudget?: number;
  theme: 'light' | 'dark' | 'system';
  isOnboarded: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
}
