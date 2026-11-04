import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import {
  DocumentItem,
  TransactionItem,
  AccountItem,
  BudgetItem,
  AssetItem,
  MaintenanceRecord,
  PantryItem,
  ShoppingList,
  ReminderItem,
  AutomationEvent,
  AutomationEventType,
} from '../types';
import { convertAmount } from '../lib/currency';

interface DataContextType {
  documents: DocumentItem[];
  transactions: TransactionItem[];
  accounts: AccountItem[];
  budgets: BudgetItem[];
  assets: AssetItem[];
  maintenanceRecords: MaintenanceRecord[];
  pantryItems: PantryItem[];
  shoppingLists: ShoppingList[];
  reminders: ReminderItem[];
  automationEvents: AutomationEvent[];
  loadingData: boolean;

  // Document actions
  addDocument: (docData: Omit<DocumentItem, 'id' | 'userId' | 'createdAt'>) => Promise<string>;
  updateDocument: (id: string, updates: Partial<DocumentItem>) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  confirmDocumentAndTriggerActions: (
    docId: string,
    options: {
      createExpense?: boolean;
      createAsset?: boolean;
      scheduleReminders?: boolean;
    }
  ) => Promise<void>;

  // Transaction actions
  addTransaction: (txData: Omit<TransactionItem, 'id' | 'userId' | 'createdAt' | 'reportingAmount' | 'reportingCurrency' | 'exchangeRate'>) => Promise<string>;
  updateTransaction: (id: string, updates: Partial<TransactionItem>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  // Account actions
  addAccount: (acc: Omit<AccountItem, 'id' | 'userId' | 'createdAt'>) => Promise<string>;
  updateAccount: (id: string, updates: Partial<AccountItem>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;

  // Budget actions
  addBudget: (b: Omit<BudgetItem, 'id' | 'userId' | 'createdAt'>) => Promise<string>;
  deleteBudget: (id: string) => Promise<void>;

  // Asset actions
  addAsset: (asset: Omit<AssetItem, 'id' | 'userId' | 'createdAt'>) => Promise<string>;
  updateAsset: (id: string, updates: Partial<AssetItem>) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;

  // Maintenance actions
  addMaintenanceRecord: (
    rec: Omit<MaintenanceRecord, 'id' | 'userId' | 'createdAt'>,
    createExpense?: boolean
  ) => Promise<string>;
  updateMaintenanceRecord: (id: string, updates: Partial<MaintenanceRecord>) => Promise<void>;
  deleteMaintenanceRecord: (id: string) => Promise<void>;

  // Pantry actions
  addPantryItem: (item: Omit<PantryItem, 'id' | 'userId' | 'createdAt'>) => Promise<string>;
  updatePantryItem: (id: string, updates: Partial<PantryItem>) => Promise<void>;
  deletePantryItem: (id: string) => Promise<void>;
  consumePantryItem: (id: string, amount: number) => Promise<void>;

  // Shopping List actions
  addShoppingList: (list: Omit<ShoppingList, 'id' | 'userId' | 'createdAt'>) => Promise<string>;
  updateShoppingList: (id: string, updates: Partial<ShoppingList>) => Promise<void>;
  deleteShoppingList: (id: string) => Promise<void>;
  purchaseShoppingItem: (
    listId: string,
    itemId: string,
    options: { createExpense: boolean; accountId?: string }
  ) => Promise<void>;

  // Reminder actions
  addReminder: (rem: Omit<ReminderItem, 'id' | 'userId' | 'createdAt'>) => Promise<string>;
  updateReminder: (id: string, updates: Partial<ReminderItem>) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;

  // Automation / System
  triggerAutomationEvent: (
    type: AutomationEventType,
    sourceModule: AutomationEvent['sourceModule'],
    sourceRecordId: string,
    payload: Record<string, any>,
    message: string
  ) => Promise<boolean>;
  seedDemoData: () => Promise<void>;
  exportAllData: () => Promise<string>;
  reconcileAlerts: () => Promise<void>;
  requestBrowserNotificationPermission: () => Promise<boolean>;
  sendLowStockNotification: (item: PantryItem) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [automationEvents, setAutomationEvents] = useState<AutomationEvent[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const reportingCurrency = profile?.preferredCurrency || 'INR';

  // Real-time synchronization with Firestore
  useEffect(() => {
    if (!user) {
      setDocuments([]);
      setTransactions([]);
      setAccounts([]);
      setBudgets([]);
      setAssets([]);
      setMaintenanceRecords([]);
      setPantryItems([]);
      setShoppingLists([]);
      setReminders([]);
      setAutomationEvents([]);
      return;
    }

    setLoadingData(true);
    const userId = user.uid;

    const unsubs = [
      onSnapshot(collection(db, 'users', userId, 'documents'), (snap) => {
        const list: DocumentItem[] = [];
        snap.forEach((d) => list.push(d.data() as DocumentItem));
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setDocuments(list);
      }),
      onSnapshot(collection(db, 'users', userId, 'transactions'), (snap) => {
        const list: TransactionItem[] = [];
        snap.forEach((d) => list.push(d.data() as TransactionItem));
        list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setTransactions(list);
      }),
      onSnapshot(collection(db, 'users', userId, 'accounts'), (snap) => {
        const list: AccountItem[] = [];
        snap.forEach((d) => list.push(d.data() as AccountItem));
        setAccounts(list);
      }),
      onSnapshot(collection(db, 'users', userId, 'budgets'), (snap) => {
        const list: BudgetItem[] = [];
        snap.forEach((d) => list.push(d.data() as BudgetItem));
        setBudgets(list);
      }),
      onSnapshot(collection(db, 'users', userId, 'assets'), (snap) => {
        const list: AssetItem[] = [];
        snap.forEach((d) => list.push(d.data() as AssetItem));
        setAssets(list);
      }),
      onSnapshot(collection(db, 'users', userId, 'maintenanceRecords'), (snap) => {
        const list: MaintenanceRecord[] = [];
        snap.forEach((d) => list.push(d.data() as MaintenanceRecord));
        setMaintenanceRecords(list);
      }),
      onSnapshot(collection(db, 'users', userId, 'pantryItems'), (snap) => {
        const list: PantryItem[] = [];
        snap.forEach((d) => list.push(d.data() as PantryItem));
        setPantryItems(list);
      }),
      onSnapshot(collection(db, 'users', userId, 'shoppingLists'), (snap) => {
        const list: ShoppingList[] = [];
        snap.forEach((d) => list.push(d.data() as ShoppingList));
        setShoppingLists(list);
      }),
      onSnapshot(collection(db, 'users', userId, 'reminders'), (snap) => {
        const list: ReminderItem[] = [];
        snap.forEach((d) => list.push(d.data() as ReminderItem));
        list.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
        setReminders(list);
      }),
      onSnapshot(collection(db, 'users', userId, 'automationEvents'), (snap) => {
        const list: AutomationEvent[] = [];
        snap.forEach((d) => list.push(d.data() as AutomationEvent));
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setAutomationEvents(list);
        setLoadingData(false);
      }),
    ];

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [user]);

  // Idempotent Automation Event Trigger
  const triggerAutomationEvent = useCallback(
    async (
      eventType: AutomationEventType,
      sourceModule: AutomationEvent['sourceModule'],
      sourceRecordId: string,
      payload: Record<string, any>,
      message: string
    ): Promise<boolean> => {
      if (!user) return false;

      // Event key for idempotency: `${eventType}_${sourceRecordId}`
      const eventKey = `${eventType}_${sourceRecordId}`;
      const eventDocRef = doc(db, 'users', user.uid, 'automationEvents', eventKey);

      // Check if already processed
      const existing = automationEvents.find((e) => e.id === eventKey);
      if (existing && existing.status === 'processed') {
        console.log(`[Event Engine] Event ${eventKey} already processed. Skipping to avoid duplicate.`);
        return false;
      }

      const eventRecord: AutomationEvent = {
        id: eventKey,
        userId: user.uid,
        eventType,
        sourceModule,
        sourceRecordId,
        payload,
        status: 'processed',
        message,
        createdAt: new Date().toISOString(),
      };

      await setDoc(eventDocRef, eventRecord);
      return true;
    },
    [user, automationEvents]
  );

  // Document Operations
  const addDocument = async (docData: Omit<DocumentItem, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) throw new Error('Not authenticated');
    const id = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullDoc: DocumentItem = {
      ...docData,
      id,
      userId: user.uid,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'users', user.uid, 'documents', id), fullDoc);
    return id;
  };

  const updateDocument = async (id: string, updates: Partial<DocumentItem>) => {
    if (!user) throw new Error('Not authenticated');
    await setDoc(doc(db, 'users', user.uid, 'documents', id), { ...updates, updatedAt: new Date().toISOString() }, { merge: true });
  };

  const deleteDocument = async (id: string) => {
    if (!user) throw new Error('Not authenticated');
    await deleteDoc(doc(db, 'users', user.uid, 'documents', id));
  };

  // Cross-Module Workflow A: Invoice to Asset + Expense + Reminder
  const confirmDocumentAndTriggerActions = async (
    docId: string,
    options: {
      createExpense?: boolean;
      createAsset?: boolean;
      scheduleReminders?: boolean;
    }
  ) => {
    if (!user) return;
    const document = documents.find((d) => d.id === docId);
    if (!document) return;

    let linkedAssetId: string | undefined = undefined;
    let linkedTransactionId: string | undefined = undefined;

    // 1. Create SpendSense Expense if requested
    if (options.createExpense && document.amount && document.amount > 0) {
      const txId = `tx_doc_${document.id}`;
      const currency = document.currency || reportingCurrency;
      const { convertedAmount, rateUsed } = convertAmount(document.amount, currency, reportingCurrency);

      const newTx: TransactionItem = {
        id: txId,
        userId: user.uid,
        description: `Payment: ${document.title} (${document.issuingOrg || 'DocuMind'})`,
        amount: document.amount,
        currency,
        reportingAmount: convertedAmount,
        reportingCurrency,
        exchangeRate: rateUsed,
        type: 'expense',
        category: (document.category === 'Household' || document.category === 'Property')
          ? 'Household Maintenance'
          : document.category === 'Vehicle'
          ? 'Transportation'
          : document.category === 'Insurance'
          ? 'Subscriptions'
          : 'Shopping',
        date: document.issueDate || new Date().toISOString().split('T')[0],
        accountId: accounts[0]?.id || 'default_acc',
        accountName: accounts[0]?.name || 'Primary Wallet',
        notes: `Imported and approved from verified document: ${document.title}`,
        sourceModule: 'DocuMind',
        sourceRecordId: document.id,
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'users', user.uid, 'transactions', txId), newTx);
      linkedTransactionId = txId;

      await triggerAutomationEvent(
        'PURCHASE_RECORDED',
        'DocuMind',
        document.id,
        { amount: document.amount, currency },
        `Recorded expense of ${currency} ${document.amount} from confirmed document "${document.title}"`
      );
    }

    // 2. Create FixFlow Asset if requested
    if (options.createAsset) {
      const assetId = `asset_doc_${document.id}`;
      const newAsset: AssetItem = {
        id: assetId,
        userId: user.uid,
        name: document.title,
        category: document.category === 'Vehicle'
          ? 'Vehicles'
          : document.category === 'Household'
          ? 'Home Appliances'
          : 'Electronics',
        brand: document.issuingOrg || '',
        purchaseDate: document.issueDate || new Date().toISOString().split('T')[0],
        purchasePrice: document.amount || undefined,
        currency: document.currency || reportingCurrency,
        warrantyEndDate: document.expiryDate || undefined,
        condition: 'Good',
        documentRefId: document.id,
        notes: `Registered via confirmed document ${document.title}`,
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'users', user.uid, 'assets', assetId), newAsset);
      linkedAssetId = assetId;

      await triggerAutomationEvent(
        'ASSET_CREATED',
        'DocuMind',
        document.id,
        { assetId, name: newAsset.name },
        `Registered household asset "${newAsset.name}" from document`
      );
    }

    // 3. Schedule Reminders if requested
    if (options.scheduleReminders && document.expiryDate) {
      const remId = `rem_doc_${document.id}`;
      const newRem: ReminderItem = {
        id: remId,
        userId: user.uid,
        title: `Expiry Notice: ${document.title}`,
        description: `Reference #${document.refNumber || 'N/A'}. Document or warranty is expiring on ${document.expiryDate}.`,
        category: 'Document Expiry',
        dueDate: document.expiryDate,
        priority: 'high',
        status: 'pending',
        relatedModule: 'DocuMind',
        relatedRecordId: document.id,
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'users', user.uid, 'reminders', remId), newRem);

      await triggerAutomationEvent(
        'DOCUMENT_EXPIRING',
        'DocuMind',
        document.id,
        { expiryDate: document.expiryDate },
        `Scheduled expiry reminder for "${document.title}"`
      );
    }

    // Update document status to confirmed
    await updateDocument(docId, {
      status: 'confirmed',
      isVerified: true,
      linkedAssetId,
      linkedTransactionId,
    });

    await triggerAutomationEvent(
      'DOCUMENT_CONFIRMED',
      'DocuMind',
      document.id,
      { isVerified: true },
      `User confirmed and verified document "${document.title}"`
    );
  };

  // SpendSense Transactions
  const addTransaction = async (
    txData: Omit<TransactionItem, 'id' | 'userId' | 'createdAt' | 'reportingAmount' | 'reportingCurrency' | 'exchangeRate'>
  ) => {
    if (!user) throw new Error('Not authenticated');
    const id = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const { convertedAmount, rateUsed } = convertAmount(txData.amount, txData.currency, reportingCurrency);

    const fullTx: TransactionItem = {
      ...txData,
      id,
      userId: user.uid,
      reportingAmount: convertedAmount,
      reportingCurrency,
      exchangeRate: rateUsed,
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'users', user.uid, 'transactions', id), fullTx);

    // Update account balance
    const targetAcc = accounts.find((a) => a.id === txData.accountId);
    if (targetAcc) {
      const balanceDelta = txData.type === 'income' || txData.type === 'refund' ? txData.amount : -txData.amount;
      await updateAccount(targetAcc.id, { balance: targetAcc.balance + balanceDelta });
    }

    return id;
  };

  const updateTransaction = async (id: string, updates: Partial<TransactionItem>) => {
    if (!user) throw new Error('Not authenticated');
    await setDoc(doc(db, 'users', user.uid, 'transactions', id), { ...updates, updatedAt: new Date().toISOString() }, { merge: true });
  };

  const deleteTransaction = async (id: string) => {
    if (!user) throw new Error('Not authenticated');
    await deleteDoc(doc(db, 'users', user.uid, 'transactions', id));
  };

  // Accounts
  const addAccount = async (acc: Omit<AccountItem, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) throw new Error('Not authenticated');
    const id = `acc_${Date.now()}`;
    const fullAcc: AccountItem = {
      ...acc,
      id,
      userId: user.uid,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'users', user.uid, 'accounts', id), fullAcc);
    return id;
  };

  const updateAccount = async (id: string, updates: Partial<AccountItem>) => {
    if (!user) throw new Error('Not authenticated');
    await setDoc(doc(db, 'users', user.uid, 'accounts', id), updates, { merge: true });
  };

  const deleteAccount = async (id: string) => {
    if (!user) throw new Error('Not authenticated');
    await deleteDoc(doc(db, 'users', user.uid, 'accounts', id));
  };

  // Budgets
  const addBudget = async (b: Omit<BudgetItem, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) throw new Error('Not authenticated');
    const id = `bgt_${b.category.toLowerCase().replace(/\s+/g, '_')}_${b.month || 'default'}`;
    const fullBudget: BudgetItem = {
      ...b,
      id,
      userId: user.uid,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'users', user.uid, 'budgets', id), fullBudget);
    return id;
  };

  const deleteBudget = async (id: string) => {
    if (!user) throw new Error('Not authenticated');
    await deleteDoc(doc(db, 'users', user.uid, 'budgets', id));
  };

  // Assets
  const addAsset = async (asset: Omit<AssetItem, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) throw new Error('Not authenticated');
    const id = `asset_${Date.now()}`;
    const fullAsset: AssetItem = {
      ...asset,
      id,
      userId: user.uid,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'users', user.uid, 'assets', id), fullAsset);

    // If warranty end date is given, schedule reminder
    if (asset.warrantyEndDate) {
      const remId = `rem_warranty_${id}`;
      const newRem: ReminderItem = {
        id: remId,
        userId: user.uid,
        title: `Warranty Expiry: ${asset.name}`,
        description: `Warranty for ${asset.name} (${asset.brand || 'Asset'}) expires on ${asset.warrantyEndDate}.`,
        category: 'Warranty Expiry',
        dueDate: asset.warrantyEndDate,
        priority: 'medium',
        status: 'pending',
        relatedModule: 'FixFlow',
        relatedRecordId: id,
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'users', user.uid, 'reminders', remId), newRem);
    }

    return id;
  };

  const updateAsset = async (id: string, updates: Partial<AssetItem>) => {
    if (!user) throw new Error('Not authenticated');
    await setDoc(doc(db, 'users', user.uid, 'assets', id), { ...updates, updatedAt: new Date().toISOString() }, { merge: true });
  };

  const deleteAsset = async (id: string) => {
    if (!user) throw new Error('Not authenticated');
    await deleteDoc(doc(db, 'users', user.uid, 'assets', id));
  };

  // Maintenance Records & Workflow C: Maintenance completion to SpendSense
  const addMaintenanceRecord = async (
    rec: Omit<MaintenanceRecord, 'id' | 'userId' | 'createdAt'>,
    createExpense = false
  ) => {
    if (!user) throw new Error('Not authenticated');
    const id = `maint_${Date.now()}`;
    let linkedExpenseId: string | undefined = undefined;

    if (createExpense && rec.cost && rec.cost > 0) {
      const txId = `tx_maint_${id}`;
      const currency = rec.currency || reportingCurrency;
      const { convertedAmount, rateUsed } = convertAmount(rec.cost, currency, reportingCurrency);

      const newTx: TransactionItem = {
        id: txId,
        userId: user.uid,
        description: `Maintenance: ${rec.assetName} - ${rec.description}`,
        amount: rec.cost,
        currency,
        reportingAmount: convertedAmount,
        reportingCurrency,
        exchangeRate: rateUsed,
        type: 'expense',
        category: 'Household Maintenance',
        date: rec.serviceDate,
        accountId: accounts[0]?.id || 'default_acc',
        accountName: accounts[0]?.name || 'Primary Wallet',
        notes: `Service provider: ${rec.provider || 'Self / Local technician'}`,
        sourceModule: 'FixFlow',
        sourceRecordId: id,
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'users', user.uid, 'transactions', txId), newTx);
      linkedExpenseId = txId;

      await triggerAutomationEvent(
        'MAINTENANCE_COMPLETED',
        'FixFlow',
        id,
        { cost: rec.cost, currency, assetName: rec.assetName },
        `Logged maintenance expense of ${currency} ${rec.cost} for ${rec.assetName}`
      );
    }

    // Next service reminder if specified
    if (rec.nextServiceDate) {
      const remId = `rem_maint_${id}`;
      const newRem: ReminderItem = {
        id: remId,
        userId: user.uid,
        title: `Service Due: ${rec.assetName}`,
        description: `Scheduled periodic maintenance for ${rec.assetName}.`,
        category: 'Maintenance',
        dueDate: rec.nextServiceDate,
        priority: 'medium',
        status: 'pending',
        relatedModule: 'FixFlow',
        relatedRecordId: id,
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'users', user.uid, 'reminders', remId), newRem);
    }

    const fullRec: MaintenanceRecord = {
      ...rec,
      id,
      userId: user.uid,
      linkedExpenseId,
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'users', user.uid, 'maintenanceRecords', id), fullRec);
    return id;
  };

  const updateMaintenanceRecord = async (id: string, updates: Partial<MaintenanceRecord>) => {
    if (!user) throw new Error('Not authenticated');
    await setDoc(doc(db, 'users', user.uid, 'maintenanceRecords', id), updates, { merge: true });
  };

  const deleteMaintenanceRecord = async (id: string) => {
    if (!user) throw new Error('Not authenticated');
    await deleteDoc(doc(db, 'users', user.uid, 'maintenanceRecords', id));
  };

  // Pantry Items
  const addPantryItem = async (item: Omit<PantryItem, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) throw new Error('Not authenticated');
    const id = `pantry_${Date.now()}`;
    const fullItem: PantryItem = {
      ...item,
      id,
      userId: user.uid,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'users', user.uid, 'pantryItems', id), fullItem);

    if (item.expiryDate) {
      const remId = `rem_pantry_${id}`;
      const newRem: ReminderItem = {
        id: remId,
        userId: user.uid,
        title: `Grocery Expiry: ${item.name}`,
        description: `${item.name} (${item.quantity} ${item.unit}) is reaching expiry date on ${item.expiryDate}.`,
        category: 'Grocery Expiry',
        dueDate: item.expiryDate,
        priority: 'medium',
        status: 'pending',
        relatedModule: 'PantryPilot',
        relatedRecordId: id,
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'users', user.uid, 'reminders', remId), newRem);
    }

    return id;
  };

  const updatePantryItem = async (id: string, updates: Partial<PantryItem>) => {
    if (!user) throw new Error('Not authenticated');
    await setDoc(doc(db, 'users', user.uid, 'pantryItems', id), { ...updates, updatedAt: new Date().toISOString() }, { merge: true });
  };

  const deletePantryItem = async (id: string) => {
    if (!user) throw new Error('Not authenticated');
    await deleteDoc(doc(db, 'users', user.uid, 'pantryItems', id));
  };

  const consumePantryItem = async (id: string, amount: number) => {
    const item = pantryItems.find((p) => p.id === id);
    if (!item) return;
    const newQty = Math.max(0, item.quantity - amount);
    await updatePantryItem(id, { quantity: newQty });

    // Check low stock trigger
    if (newQty <= item.lowStockThreshold) {
      sendLowStockNotification({ ...item, quantity: newQty });
      await triggerAutomationEvent(
        'STOCK_LOW',
        'PantryPilot',
        id,
        { currentQty: newQty, threshold: item.lowStockThreshold },
        `Stock low alert: ${item.name} is down to ${newQty} ${item.unit}`
      );
    }
  };

  // Shopping Lists & Workflow B: Grocery Purchase
  const addShoppingList = async (list: Omit<ShoppingList, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) throw new Error('Not authenticated');
    const id = `list_${Date.now()}`;
    const fullList: ShoppingList = {
      ...list,
      id,
      userId: user.uid,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'users', user.uid, 'shoppingLists', id), fullList);
    return id;
  };

  const updateShoppingList = async (id: string, updates: Partial<ShoppingList>) => {
    if (!user) throw new Error('Not authenticated');
    await setDoc(doc(db, 'users', user.uid, 'shoppingLists', id), { ...updates, updatedAt: new Date().toISOString() }, { merge: true });
  };

  const deleteShoppingList = async (id: string) => {
    if (!user) throw new Error('Not authenticated');
    await deleteDoc(doc(db, 'users', user.uid, 'shoppingLists', id));
  };

  const purchaseShoppingItem = async (
    listId: string,
    itemId: string,
    options: { createExpense: boolean; accountId?: string }
  ) => {
    if (!user) return;
    const list = shoppingLists.find((l) => l.id === listId);
    if (!list) return;

    const item = list.items.find((i) => i.id === itemId);
    if (!item || item.isBought) return;

    // 1. Mark item as bought in list
    const updatedItems = list.items.map((i) => (i.id === itemId ? { ...i, isBought: true } : i));
    const allBought = updatedItems.every((i) => i.isBought);
    await updateShoppingList(listId, { items: updatedItems, isCompleted: allBought });

    // 2. Add or update Pantry inventory
    const existingPantryItem = pantryItems.find(
      (p) => p.name.toLowerCase().trim() === item.name.toLowerCase().trim()
    );
    if (existingPantryItem) {
      await updatePantryItem(existingPantryItem.id, {
        quantity: existingPantryItem.quantity + item.quantity,
      });
    } else {
      await addPantryItem({
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        lowStockThreshold: 1,
        purchaseDate: new Date().toISOString().split('T')[0],
      });
    }

    // 3. Optional SpendSense Expense
    if (options.createExpense && item.estimatedCost && item.estimatedCost > 0) {
      const txId = `tx_groc_${itemId}`;
      const { convertedAmount, rateUsed } = convertAmount(item.estimatedCost, reportingCurrency, reportingCurrency);

      const newTx: TransactionItem = {
        id: txId,
        userId: user.uid,
        description: `Grocery Purchase: ${item.name} (${item.quantity} ${item.unit})`,
        amount: item.estimatedCost,
        currency: reportingCurrency,
        reportingAmount: convertedAmount,
        reportingCurrency,
        exchangeRate: rateUsed,
        type: 'expense',
        category: 'Groceries',
        date: new Date().toISOString().split('T')[0],
        accountId: options.accountId || accounts[0]?.id || 'default_acc',
        accountName: accounts[0]?.name || 'Primary Wallet',
        notes: `Purchased from shopping list: ${list.name}`,
        sourceModule: 'PantryPilot',
        sourceRecordId: itemId,
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'users', user.uid, 'transactions', txId), newTx);
    }

    await triggerAutomationEvent(
      'GROCERY_PURCHASED',
      'PantryPilot',
      itemId,
      { name: item.name, quantity: item.quantity, unit: item.unit },
      `Added ${item.quantity} ${item.unit} of ${item.name} to pantry`
    );
  };

  // Reminders
  const addReminder = async (rem: Omit<ReminderItem, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) throw new Error('Not authenticated');
    const id = `rem_${Date.now()}`;
    const fullRem: ReminderItem = {
      ...rem,
      id,
      userId: user.uid,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'users', user.uid, 'reminders', id), fullRem);
    return id;
  };

  const updateReminder = async (id: string, updates: Partial<ReminderItem>) => {
    if (!user) throw new Error('Not authenticated');
    await setDoc(doc(db, 'users', user.uid, 'reminders', id), updates, { merge: true });
  };

  const deleteReminder = async (id: string) => {
    if (!user) throw new Error('Not authenticated');
    await deleteDoc(doc(db, 'users', user.uid, 'reminders', id));
  };

  // Ref to keep track of low stock items notified during session
  const notifiedLowStockRef = React.useRef<Set<string>>(new Set());

  const sendLowStockNotification = useCallback((item: PantryItem) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      try {
        new Notification(`Low Stock Alert: ${item.name}`, {
          body: `${item.name} has reached low stock limit (${item.quantity} ${item.unit} remaining, threshold: ${item.lowStockThreshold} ${item.unit}). Time to restock!`,
          icon: '/favicon.ico',
          tag: `low_stock_${item.id}`,
        });
      } catch (err) {
        console.warn('Browser notification failed:', err);
      }
    }
  }, []);

  const requestBrowserNotificationPermission = async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  };

  // Reminder Reconciliation Check on App Boot
  const reconcileAlerts = useCallback(async () => {
    if (!user) return;
    const now = new Date();

    // Check pantry items nearing expiration (within 4 days)
    for (const item of pantryItems) {
      if (item.expiryDate) {
        const exp = new Date(item.expiryDate);
        const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 4 && diffDays >= 0) {
          const remId = `rem_auto_pantry_${item.id}`;
          const exists = reminders.some((r) => r.id === remId);
          if (!exists) {
            await setDoc(doc(db, 'users', user.uid, 'reminders', remId), {
              id: remId,
              userId: user.uid,
              title: `Pantry item expiring soon: ${item.name}`,
              description: `Only ${diffDays} day(s) left until ${item.name} expires. Consider using it in a recipe!`,
              category: 'Grocery Expiry',
              dueDate: item.expiryDate,
              priority: diffDays <= 1 ? 'high' : 'medium',
              status: 'pending',
              relatedModule: 'PantryPilot',
              relatedRecordId: item.id,
              createdAt: new Date().toISOString(),
            });
          }
        }
      }

      // Check low stock
      if (item.quantity <= item.lowStockThreshold) {
        const lowStockId = `rem_auto_stock_${item.id}`;
        const exists = reminders.some((r) => r.id === lowStockId);
        if (!exists) {
          await setDoc(doc(db, 'users', user.uid, 'reminders', lowStockId), {
            id: lowStockId,
            userId: user.uid,
            title: `Low Stock: ${item.name}`,
            description: `Stock level is ${item.quantity} ${item.unit} (threshold: ${item.lowStockThreshold}).`,
            category: 'Low Stock',
            dueDate: new Date().toISOString().split('T')[0],
            priority: 'medium',
            status: 'pending',
            relatedModule: 'PantryPilot',
            relatedRecordId: item.id,
            createdAt: new Date().toISOString(),
          });
        }

        // Trigger browser notification for low stock item if not notified this session
        const notifyKey = `${item.id}_${item.quantity}`;
        if (!notifiedLowStockRef.current.has(notifyKey)) {
          notifiedLowStockRef.current.add(notifyKey);
          sendLowStockNotification(item);
        }
      }
    }

    // Check budget thresholds
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthlyExpenses = transactions
      .filter((t) => t.type === 'expense' && t.date.startsWith(currentMonthStr))
      .reduce((sum, t) => sum + t.reportingAmount, 0);

    if (profile?.monthlyBudget && profile.monthlyBudget > 0) {
      const utilPercent = (monthlyExpenses / profile.monthlyBudget) * 100;
      if (utilPercent >= 80) {
        const bgtEventKey = `BUDGET_THRESHOLD_REACHED_${currentMonthStr}`;
        await triggerAutomationEvent(
          'BUDGET_THRESHOLD_REACHED',
          'SpendSense',
          currentMonthStr,
          { utilPercent: Math.round(utilPercent), monthlyExpenses, budget: profile.monthlyBudget },
          `Monthly budget warning: You have utilized ${Math.round(utilPercent)}% of your spending budget for this month.`
        );
      }
    }
  }, [user, pantryItems, reminders, transactions, profile, triggerAutomationEvent]);

  // Run alert reconciliation when data is loaded
  useEffect(() => {
    if (user && !loadingData && pantryItems.length > 0) {
      reconcileAlerts();
    }
  }, [user, loadingData, pantryItems.length, reconcileAlerts]);

  // Seed Realistic Demo Data (Restricted to Explicitly Labeled Action)
  const seedDemoData = async () => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];

    // Primary Accounts
    const defaultAccounts: AccountItem[] = [
      { id: `acc_checking_${Date.now()}`, userId: user.uid, name: 'HDFC Priority Checking', type: 'bank', currency: 'INR', balance: 145000, createdAt: today },
      { id: `acc_savings_${Date.now()}`, userId: user.uid, name: 'ICICI Savings Reserve', type: 'bank', currency: 'INR', balance: 350000, createdAt: today },
      { id: `acc_card_${Date.now()}`, userId: user.uid, name: 'Regalia Gold Card', type: 'card', currency: 'INR', balance: -24500, createdAt: today },
    ];
    for (const a of defaultAccounts) {
      await setDoc(doc(db, 'users', user.uid, 'accounts', a.id), a);
    }

    // Transactions
    const defaultTx: TransactionItem[] = [
      {
        id: `tx_salary_${Date.now()}`,
        userId: user.uid,
        description: 'Monthly Corporate Salary Credit',
        amount: 185000,
        currency: 'INR',
        reportingAmount: 185000,
        reportingCurrency: 'INR',
        exchangeRate: 1.0,
        type: 'income',
        category: 'Salary',
        date: today,
        accountId: defaultAccounts[0].id,
        accountName: defaultAccounts[0].name,
        createdAt: today,
      },
      {
        id: `tx_rent_${Date.now()}`,
        userId: user.uid,
        description: 'Apartment Monthly Rent & Maintenance',
        amount: 38000,
        currency: 'INR',
        reportingAmount: 38000,
        reportingCurrency: 'INR',
        exchangeRate: 1.0,
        type: 'expense',
        category: 'Housing',
        date: today,
        accountId: defaultAccounts[0].id,
        accountName: defaultAccounts[0].name,
        createdAt: today,
      },
      {
        id: `tx_groceries_${Date.now()}`,
        userId: user.uid,
        description: 'Organic Harvest & Supermarket Pantry',
        amount: 5420,
        currency: 'INR',
        reportingAmount: 5420,
        reportingCurrency: 'INR',
        exchangeRate: 1.0,
        type: 'expense',
        category: 'Groceries',
        date: today,
        accountId: defaultAccounts[2].id,
        accountName: defaultAccounts[2].name,
        createdAt: today,
      },
      {
        id: `tx_tech_${Date.now()}`,
        userId: user.uid,
        description: 'Apple Store - MacBook Pro Accessories',
        amount: 14900,
        currency: 'INR',
        reportingAmount: 14900,
        reportingCurrency: 'INR',
        exchangeRate: 1.0,
        type: 'expense',
        category: 'Shopping',
        date: today,
        accountId: defaultAccounts[2].id,
        accountName: defaultAccounts[2].name,
        createdAt: today,
      },
    ];
    for (const t of defaultTx) {
      await setDoc(doc(db, 'users', user.uid, 'transactions', t.id), t);
    }

    // Assets
    const defaultAssets: AssetItem[] = [
      {
        id: `asset_fridge_${Date.now()}`,
        userId: user.uid,
        name: 'LG Inverter French-Door Refrigerator 674L',
        category: 'Home Appliances',
        brand: 'LG',
        model: 'GR-B832AMPL',
        serialNumber: 'LG-674-IN-9082',
        purchaseDate: '2025-04-12',
        purchasePrice: 92000,
        currency: 'INR',
        warrantyEndDate: '2028-04-12',
        condition: 'Excellent',
        location: 'Kitchen',
        notes: 'Includes 10-year smart compressor warranty.',
        createdAt: today,
      },
      {
        id: `asset_macbook_${Date.now()}`,
        userId: user.uid,
        name: 'Apple MacBook Pro 16" M3 Max',
        category: 'Electronics',
        brand: 'Apple',
        model: 'A2991 Space Black',
        serialNumber: 'C02XK047MD6R',
        purchaseDate: '2025-01-15',
        purchasePrice: 349900,
        currency: 'INR',
        warrantyEndDate: '2027-01-15',
        condition: 'Excellent',
        location: 'Home Office',
        notes: 'Covered under AppleCare+ Protection Plan.',
        createdAt: today,
      },
      {
        id: `asset_car_${Date.now()}`,
        userId: user.uid,
        name: 'Hyundai Creta SX(O) Turbo DCT',
        category: 'Vehicles',
        brand: 'Hyundai',
        model: '2024 Facelift',
        serialNumber: 'MALC181CLPM109283',
        purchaseDate: '2024-08-20',
        purchasePrice: 2015000,
        currency: 'INR',
        warrantyEndDate: '2027-08-20',
        condition: 'Good',
        location: 'Parking Bay 4B',
        notes: 'Comprehensive insurance renewal due in August.',
        createdAt: today,
      },
    ];
    for (const a of defaultAssets) {
      await setDoc(doc(db, 'users', user.uid, 'assets', a.id), a);
    }

    // Documents
    const defaultDocs: DocumentItem[] = [
      {
        id: `doc_health_ins_${Date.now()}`,
        userId: user.uid,
        title: 'HDFC ERGO Optima Secure Health Policy',
        category: 'Insurance',
        fileName: 'HDFC_Health_Policy_2026.pdf',
        fileType: 'application/pdf',
        fileSize: 1845000,
        status: 'confirmed',
        issuingOrg: 'HDFC ERGO General Insurance',
        ownerName: profile?.fullName || 'V. Subramanyan',
        issueDate: '2025-12-01',
        expiryDate: '2026-11-30',
        refNumber: 'POL-HDFC-99120482',
        amount: 28400,
        currency: 'INR',
        summary: 'Family floater comprehensive health insurance policy with ₹1 Crore secure sum insured.',
        confidence: 0.98,
        isVerified: true,
        createdAt: today,
      },
      {
        id: `doc_passport_${Date.now()}`,
        userId: user.uid,
        title: 'Republic of India Passport Booklet',
        category: 'Identity',
        fileName: 'Passport_Scan.pdf',
        fileType: 'application/pdf',
        fileSize: 2200000,
        status: 'confirmed',
        issuingOrg: 'Ministry of External Affairs, India',
        ownerName: profile?.fullName || 'V. Subramanyan',
        issueDate: '2020-05-10',
        expiryDate: '2030-05-09',
        refNumber: 'Z8194021',
        summary: 'Standard 36-page international passport booklet valid till May 2030.',
        confidence: 0.99,
        isVerified: true,
        createdAt: today,
      },
      {
        id: `doc_car_invoice_${Date.now()}`,
        userId: user.uid,
        title: 'Hyundai Service & Scheduled Maintenance Invoice',
        category: 'Vehicle',
        fileName: 'Hyundai_20k_Service_Invoice.pdf',
        fileType: 'application/pdf',
        fileSize: 940000,
        status: 'confirmed',
        issuingOrg: 'Advaith Hyundai Service Center',
        issueDate: today,
        amount: 8450,
        currency: 'INR',
        summary: '20,000 km periodic service with synthetic oil change, wheel alignment, and filter replacements.',
        confidence: 0.95,
        isVerified: true,
        createdAt: today,
      },
    ];
    for (const d of defaultDocs) {
      await setDoc(doc(db, 'users', user.uid, 'documents', d.id), d);
    }

    // Pantry Items
    const defaultPantry: PantryItem[] = [
      { id: `pantry_rice_${Date.now()}`, userId: user.uid, name: 'Organic Royal Basmati Rice', category: 'Grains', quantity: 5, unit: 'kg', lowStockThreshold: 2, purchaseDate: today, expiryDate: '2027-06-01', price: 650, currency: 'INR', location: 'Pantry Shelf 1', createdAt: today },
      { id: `pantry_milk_${Date.now()}`, userId: user.uid, name: 'Organic Farm Fresh Milk', category: 'Dairy', quantity: 1, unit: 'litre', lowStockThreshold: 2, purchaseDate: today, expiryDate: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0], price: 78, currency: 'INR', location: 'Refrigerator Top', createdAt: today },
      { id: `pantry_eggs_${Date.now()}`, userId: user.uid, name: 'Free Range Country Eggs', category: 'Meat and Eggs', quantity: 12, unit: 'pieces', lowStockThreshold: 6, purchaseDate: today, expiryDate: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0], price: 140, currency: 'INR', location: 'Refrigerator Door', createdAt: today },
      { id: `pantry_tomatoes_${Date.now()}`, userId: user.uid, name: 'Ripe Vine Tomatoes', category: 'Vegetables', quantity: 1.5, unit: 'kg', lowStockThreshold: 1, purchaseDate: today, expiryDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0], price: 60, currency: 'INR', location: 'Crisper Drawer', createdAt: today },
      { id: `pantry_oil_${Date.now()}`, userId: user.uid, name: 'Cold Pressed Virgin Olive Oil', category: 'Household Supplies', quantity: 0.4, unit: 'litre', lowStockThreshold: 1, purchaseDate: '2026-09-10', expiryDate: '2027-09-10', price: 950, currency: 'INR', location: 'Spice Rack', createdAt: today },
    ];
    for (const p of defaultPantry) {
      await setDoc(doc(db, 'users', user.uid, 'pantryItems', p.id), p);
    }

    // Shopping List
    const defaultShopping: ShoppingList = {
      id: `list_weekend_${Date.now()}`,
      userId: user.uid,
      name: 'Weekend Farmers Market & Pantry Replenishment',
      isCompleted: false,
      createdAt: today,
      items: [
        { id: 'item_1', name: 'Almond Milk Unsweetened', category: 'Dairy', quantity: 2, unit: 'litre', estimatedCost: 320, isBought: false },
        { id: 'item_2', name: 'Greek Yogurt 400g', category: 'Dairy', quantity: 2, unit: 'packets', estimatedCost: 190, isBought: false },
        { id: 'item_3', name: 'Avocados Hass', category: 'Fruits', quantity: 4, unit: 'pieces', estimatedCost: 360, isBought: false },
        { id: 'item_4', name: 'Whole Wheat Sourdough Loaf', category: 'Grains', quantity: 1, unit: 'pieces', estimatedCost: 140, isBought: false },
      ],
    };
    await setDoc(doc(db, 'users', user.uid, 'shoppingLists', defaultShopping.id), defaultShopping);

    // Reminders
    const defaultReminders: ReminderItem[] = [
      {
        id: `rem_insurance_${Date.now()}`,
        userId: user.uid,
        title: 'HDFC ERGO Health Policy Renewal',
        description: 'Review policy tier and initiate premium renewal before grace period.',
        category: 'Document Expiry',
        dueDate: '2026-11-25',
        priority: 'high',
        status: 'pending',
        relatedModule: 'DocuMind',
        createdAt: today,
      },
      {
        id: `rem_milk_${Date.now()}`,
        userId: user.uid,
        title: 'Milk Expiry in 2 Days',
        description: 'Farm fresh milk in refrigerator nearing expiry.',
        category: 'Grocery Expiry',
        dueDate: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
        priority: 'medium',
        status: 'pending',
        relatedModule: 'PantryPilot',
        createdAt: today,
      },
      {
        id: `rem_car_service_${Date.now()}`,
        userId: user.uid,
        title: 'Creta Wheel Balancing & Tire Rotation',
        description: 'Recommended 5,000 km post-service alignment check.',
        category: 'Maintenance',
        dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        priority: 'low',
        status: 'pending',
        relatedModule: 'FixFlow',
        createdAt: today,
      },
    ];
    for (const r of defaultReminders) {
      await setDoc(doc(db, 'users', user.uid, 'reminders', r.id), r);
    }
  };

  // Export All User Data into clean JSON
  const exportAllData = async (): Promise<string> => {
    const fullBackup = {
      user: {
        uid: user?.uid,
        email: user?.email,
        profile,
      },
      exportTimestamp: new Date().toISOString(),
      documents,
      transactions,
      accounts,
      budgets,
      assets,
      maintenanceRecords,
      pantryItems,
      shoppingLists,
      reminders,
      automationEvents,
    };
    return JSON.stringify(fullBackup, null, 2);
  };

  return (
    <DataContext.Provider
      value={{
        documents,
        transactions,
        accounts,
        budgets,
        assets,
        maintenanceRecords,
        pantryItems,
        shoppingLists,
        reminders,
        automationEvents,
        loadingData,
        addDocument,
        updateDocument,
        deleteDocument,
        confirmDocumentAndTriggerActions,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        addAccount,
        updateAccount,
        deleteAccount,
        addBudget,
        deleteBudget,
        addAsset,
        updateAsset,
        deleteAsset,
        addMaintenanceRecord,
        updateMaintenanceRecord,
        deleteMaintenanceRecord,
        addPantryItem,
        updatePantryItem,
        deletePantryItem,
        consumePantryItem,
        addShoppingList,
        updateShoppingList,
        deleteShoppingList,
        purchaseShoppingItem,
        addReminder,
        updateReminder,
        deleteReminder,
        triggerAutomationEvent,
        seedDemoData,
        exportAllData,
        reconcileAlerts,
        requestBrowserNotificationPermission,
        sendLowStockNotification,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
};
