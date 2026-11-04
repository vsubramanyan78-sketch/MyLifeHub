import React, { useState, useRef } from 'react';
import {
  FileText,
  Upload,
  Search,
  CheckCircle,
  AlertCircle,
  Clock,
  Sparkles,
  Eye,
  Trash2,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  Filter,
  DollarSign,
  Wrench,
  Calendar,
  Check,
  X,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useData } from '../../../context/DataContext';
import { DocumentItem, DocumentCategory } from '../../../types';
import { formatCurrency } from '../../../lib/currency';

interface DocuMindProps {
  initialSelectedId?: string | null;
}

const CATEGORIES: DocumentCategory[] = [
  'Identity',
  'Education',
  'Insurance',
  'Finance',
  'Property',
  'Vehicle',
  'Household',
  'Medical',
  'Other',
];

export const DocuMind: React.FC<DocuMindProps> = ({ initialSelectedId }) => {
  const { profile } = useAuth();
  const {
    documents,
    addDocument,
    updateDocument,
    deleteDocument,
    confirmDocumentAndTriggerActions,
  } = useData();

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [activeDocForReview, setActiveDocForReview] = useState<DocumentItem | null>(() => {
    if (initialSelectedId) {
      return documents.find((d) => d.id === initialSelectedId) || null;
    }
    return null;
  });

  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);

  // Review Form Options (Workflow A: Invoice to Asset / Expense / Reminder)
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewCategory, setReviewCategory] = useState<DocumentCategory>('Other');
  const [reviewOrg, setReviewOrg] = useState('');
  const [reviewOwner, setReviewOwner] = useState('');
  const [reviewIssueDate, setReviewIssueDate] = useState('');
  const [reviewExpiryDate, setReviewExpiryDate] = useState('');
  const [reviewRefNumber, setReviewRefNumber] = useState('');
  const [reviewAmount, setReviewAmount] = useState<string>('');
  const [reviewCurrency, setReviewCurrency] = useState(profile?.preferredCurrency || 'INR');
  const [reviewSummary, setReviewSummary] = useState('');

  // Cross-module action toggles
  const [optCreateExpense, setOptCreateExpense] = useState(true);
  const [optCreateAsset, setOptCreateAsset] = useState(true);
  const [optScheduleReminder, setOptScheduleReminder] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Open review dialog with document data
  const openReviewModal = (docItem: DocumentItem) => {
    setActiveDocForReview(docItem);
    setReviewTitle(docItem.title);
    setReviewCategory(docItem.category);
    setReviewOrg(docItem.issuingOrg || '');
    setReviewOwner(docItem.ownerName || '');
    setReviewIssueDate(docItem.issueDate || '');
    setReviewExpiryDate(docItem.expiryDate || '');
    setReviewRefNumber(docItem.refNumber || '');
    setReviewAmount(docItem.amount ? String(docItem.amount) : '');
    setReviewCurrency(docItem.currency || profile?.preferredCurrency || 'INR');
    setReviewSummary(docItem.summary || '');

    // Set smart defaults for cross-module options based on category
    const hasAmount = Boolean(docItem.amount && docItem.amount > 0);
    const isPurchase =
      docItem.category === 'Household' ||
      docItem.category === 'Vehicle' ||
      docItem.category === 'Finance' ||
      hasAmount;
    setOptCreateExpense(hasAmount);
    setOptCreateAsset(Boolean(isPurchase && (docItem.category === 'Household' || docItem.category === 'Vehicle')));
    setOptScheduleReminder(Boolean(docItem.expiryDate));
  };

  // Handle file drop/upload with server-side Gemini OCR & extraction
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // Read file to data URL for preview and extraction
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;

        // 1. Create document record in "processing" state
        const docId = await addDocument({
          title: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
          category: 'Other',
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          fileUrl: base64Data, // Store preview
          status: 'processing',
          isVerified: false,
        });

        // 2. Call server-side Gemini API for OCR & entity extraction
        try {
          const resp = await fetch('/api/gemini/analyze-document', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              base64Data,
              mimeType: file.type,
              fileName: file.name,
            }),
          });

          if (resp.ok) {
            const result = await resp.json();
            if (result.success && result.data) {
              const ext = result.data;
              await updateDocument(docId, {
                title: ext.title || file.name,
                category: ext.category || 'Other',
                issuingOrg: ext.issuingOrg || '',
                ownerName: ext.ownerName || '',
                issueDate: ext.issueDate || '',
                expiryDate: ext.expiryDate || '',
                refNumber: ext.refNumber || '',
                amount: ext.amount || null,
                currency: ext.currency || profile?.preferredCurrency || 'INR',
                summary: ext.summary || '',
                confidence: ext.confidence || 0.9,
                status: 'review_required',
              });

              // Open review modal immediately for the user
              const updatedDoc = documents.find((d) => d.id === docId);
              if (updatedDoc) {
                openReviewModal(updatedDoc);
              }
            }
          }
        } catch (extractErr) {
          console.warn('AI extraction fallback:', extractErr);
          await updateDocument(docId, {
            status: 'review_required',
            summary: 'File uploaded successfully. Please review and enter any required details.',
          });
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error('File upload failed:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Submit approved extraction & trigger cross-module workflows
  const handleApproveReview = async () => {
    if (!activeDocForReview) return;

    // 1. Update document with user's verified values
    await updateDocument(activeDocForReview.id, {
      title: reviewTitle,
      category: reviewCategory,
      issuingOrg: reviewOrg,
      ownerName: reviewOwner,
      issueDate: reviewIssueDate,
      expiryDate: reviewExpiryDate,
      refNumber: reviewRefNumber,
      amount: reviewAmount ? Number(reviewAmount) : null,
      currency: reviewCurrency,
      summary: reviewSummary,
      isVerified: true,
      status: 'confirmed',
    });

    // 2. Trigger Cross-Module Actions
    await confirmDocumentAndTriggerActions(activeDocForReview.id, {
      createExpense: optCreateExpense && Number(reviewAmount) > 0,
      createAsset: optCreateAsset,
      scheduleReminders: optScheduleReminder && Boolean(reviewExpiryDate),
    });

    setActiveDocForReview(null);
  };

  // Filtered documents
  const filteredDocs = documents.filter((doc) => {
    const matchesCategory = selectedCategory === 'All' || doc.category === selectedCategory;
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.issuingOrg && doc.issuingOrg.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (doc.refNumber && doc.refNumber.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Module Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <FileText className="w-5 h-5" />
            </span>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
              DocuMind Intelligent Hub
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Store documents securely with OCR, Gemini metadata extraction, and cross-module expense/asset generation.
          </p>
        </div>

        {/* Upload Trigger */}
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {isUploading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Processing OCR & Extraction...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Upload Document (PDF / Image)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Review Required Alert Banner if unverified docs exist */}
      {documents.some((d) => !d.isVerified) && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-amber-300">
                AI Extracted Documents Awaiting Verification
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-amber-200/80">
                To guarantee accuracy, DocuMind requires you to review and confirm AI-extracted fields before creating expenses or assets.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Search & Category Filter Pills */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedCategory === 'All'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
            }`}
          >
            All ({documents.length})
          </button>
          {CATEGORIES.map((cat) => {
            const count = documents.filter((d) => d.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-sm font-semibold'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                }`}
              >
                {cat} {count > 0 && `(${count})`}
              </button>
            );
          })}
        </div>

        <div className="relative min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Documents Grid */}
      {filteredDocs.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center">
          <FileText className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
            No documents found
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mt-1">
            Upload an invoice, appliance warranty, insurance card, or vehicle document to experience AI extraction and cross-module automation.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Header status */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                    {doc.category}
                  </span>
                  <div className="flex items-center space-x-1.5">
                    {doc.isVerified ? (
                      <span className="flex items-center text-[10px] text-emerald-500 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        <CheckCircle className="w-3 h-3 mr-1" /> Verified
                      </span>
                    ) : (
                      <span className="flex items-center text-[10px] text-amber-500 font-semibold bg-amber-500/10 px-2 py-0.5 rounded-full">
                        <Clock className="w-3 h-3 mr-1" /> Review Needed
                      </span>
                    )}
                  </div>
                </div>

                {/* Title & Organization */}
                <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2">
                  {doc.title}
                </h3>
                {doc.issuingOrg && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {doc.issuingOrg}
                  </p>
                )}

                {/* Summary */}
                {doc.summary && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-2.5 line-clamp-3 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80">
                    {doc.summary}
                  </p>
                )}

                {/* Metadata Fields */}
                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  {doc.amount && doc.amount > 0 ? (
                    <div>
                      <span className="block text-[10px] text-slate-400">Amount</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {formatCurrency(doc.amount, doc.currency || 'INR')}
                      </span>
                    </div>
                  ) : null}

                  {doc.expiryDate ? (
                    <div>
                      <span className="block text-[10px] text-slate-400">Expires</span>
                      <span className="font-semibold text-rose-500">{doc.expiryDate}</span>
                    </div>
                  ) : null}

                  {doc.refNumber ? (
                    <div className="col-span-2 truncate">
                      <span className="block text-[10px] text-slate-400">Ref / Policy No</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">
                        {doc.refNumber}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  {doc.fileUrl && (
                    <button
                      onClick={() => setPreviewDoc(doc)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Preview Document"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteDocument(doc.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Delete Document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {!doc.isVerified ? (
                  <button
                    onClick={() => openReviewModal(doc)}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-sm transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Review & Verify</span>
                  </button>
                ) : (
                  <button
                    onClick={() => openReviewModal(doc)}
                    className="text-xs font-semibold text-blue-500 hover:underline"
                  >
                    Edit Details
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Verification & Cross-Module Review Modal */}
      {activeDocForReview && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-indigo-500" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Verify Extracted Document Information
                </h3>
              </div>
              <button
                onClick={() => setActiveDocForReview(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              DocuMind extracted these fields. Please review and adjust before committing. You can also trigger integrated actions in SpendSense and FixFlow.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Document Title
                </label>
                <input
                  type="text"
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={reviewCategory}
                  onChange={(e) => setReviewCategory(e.target.value as DocumentCategory)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Issuing Organization / Vendor
                </label>
                <input
                  type="text"
                  value={reviewOrg}
                  onChange={(e) => setReviewOrg(e.target.value)}
                  placeholder="e.g. Samsung, HDFC, Govt of India"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Policy / Reference Number
                </label>
                <input
                  type="text"
                  value={reviewRefNumber}
                  onChange={(e) => setReviewRefNumber(e.target.value)}
                  placeholder="e.g. INV-904812"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Issue Date
                  </label>
                  <input
                    type="date"
                    value={reviewIssueDate}
                    onChange={(e) => setReviewIssueDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Expiry / Warranty End
                  </label>
                  <input
                    type="date"
                    value={reviewExpiryDate}
                    onChange={(e) => setReviewExpiryDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Amount (if Invoice / Bill)
                  </label>
                  <input
                    type="number"
                    value={reviewAmount}
                    onChange={(e) => setReviewAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Currency
                  </label>
                  <input
                    type="text"
                    value={reviewCurrency}
                    onChange={(e) => setReviewCurrency(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Document Summary
                </label>
                <textarea
                  rows={2}
                  value={reviewSummary}
                  onChange={(e) => setReviewSummary(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Workflow A: Cross-Module Automated Suggestions */}
            <div className="mt-5 p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-2.5">
              <span className="block text-xs font-bold text-indigo-400 uppercase tracking-wider">
                Cross-Module Integration Actions (Workflow A)
              </span>

              <label className="flex items-center space-x-2.5 text-xs text-slate-800 dark:text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={optCreateExpense}
                  onChange={(e) => setOptCreateExpense(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-0 w-4 h-4"
                />
                <span>
                  Record financial expense in <strong>SpendSense</strong>{' '}
                  {reviewAmount ? `(${reviewCurrency} ${reviewAmount})` : ''}
                </span>
              </label>

              <label className="flex items-center space-x-2.5 text-xs text-slate-800 dark:text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={optCreateAsset}
                  onChange={(e) => setOptCreateAsset(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-0 w-4 h-4"
                />
                <span>
                  Register corresponding physical asset in <strong>FixFlow</strong> (with warranty link)
                </span>
              </label>

              <label className="flex items-center space-x-2.5 text-xs text-slate-800 dark:text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={optScheduleReminder}
                  onChange={(e) => setOptScheduleReminder(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-0 w-4 h-4"
                />
                <span>
                  Schedule automated deadline reminder in <strong>Automation Centre</strong>
                </span>
              </label>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end space-x-3 pt-5 mt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveDocForReview(null)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApproveReview}
                className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02]"
              >
                <Check className="w-4 h-4" />
                <span>Verify & Execute Actions</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                {previewDoc.title} ({previewDoc.fileName})
              </h3>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-auto my-4 flex items-center justify-center bg-slate-100 dark:bg-slate-950 rounded-2xl p-4">
              {previewDoc.fileType.startsWith('image/') ? (
                <img
                  src={previewDoc.fileUrl}
                  alt={previewDoc.title}
                  className="max-h-[60vh] object-contain rounded-xl"
                />
              ) : previewDoc.fileType === 'application/pdf' ? (
                <iframe
                  src={previewDoc.fileUrl}
                  title={previewDoc.title}
                  className="w-full h-[60vh] rounded-xl border border-slate-800"
                />
              ) : (
                <div className="text-center p-8 text-xs text-slate-400">
                  <FileText className="w-12 h-12 text-slate-500 mx-auto mb-2" />
                  <span>Preview not directly renderable for this format ({previewDoc.fileType}).</span>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
