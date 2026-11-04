# MyLifeHub — Your Personal Life. One Intelligent Hub.

MyLifeHub is a unified personal life management platform combining four core modules into one integrated system:

1. **DocuMind**: Intelligent Document Management with OCR, categorization, Gemini AI entity extraction, expiry alerts, and verification workflows.
2. **SpendSense**: Personal Financial Management with income/expense ledgers, multi-currency support, wallets/accounts, monthly category budgets, threshold notifications, and CSV import.
3. **FixFlow**: Household Asset & Maintenance Management with appliance, electronics, and vehicle tracking, warranty countdowns, and maintenance logs synced to SpendSense.
4. **PantryPilot**: Grocery and Inventory Management with real-time stock levels, low-stock alerts, expiry tracking, shopping lists with one-click purchase and expense sync, and AI recipe generation.

---

## 🌟 Key Architectural Capabilities

- **Unified Cross-Module Integration Engine**:
  - **Workflow A (Invoice to Asset)**: Upload an invoice/receipt in DocuMind &rarr; AI extracts vendor, amount, warranty &rarr; User verifies &rarr; SpendSense expense and FixFlow asset created with reminder scheduled.
  - **Workflow B (Grocery Purchase)**: Mark items bought in PantryPilot shopping lists &rarr; Pantry inventory automatically updated &rarr; Expense logged in SpendSense.
  - **Workflow C (Maintenance Completion)**: Log service in FixFlow &rarr; Cost automatically recorded as a household expense in SpendSense.
  - **Workflow D (Warranty Tracking)**: Verified warranties trigger calendar reminders.
  - **Workflow E (Budget Monitoring)**: Real-time threshold monitoring alerts the user at 80% and 100% monthly budget utilization.
  - **Idempotency Guarantee**: Every automation event receives a deterministic composite key (`{EVENT_TYPE}_{RECORD_ID}`) to prevent duplicate entries.
- **Server-Side Gemini AI Layer**:
  - Document OCR & entity extraction (`/api/gemini/analyze-document`)
  - Context-aware Natural Language AI Assistant (`/api/gemini/assistant`)
  - Pantry-aware Recipe Generator (`/api/gemini/recipes`)
  - No client-side exposure of `GEMINI_API_KEY`.
- **Multi-Currency System**:
  - Supported currencies: INR (default), USD, EUR, GBP, AED, SGD, AUD, CAD, JPY.
  - Preserves original transaction currency & amount while converting to the user's reporting currency with live/cached exchange rates.
- **Security & Data Isolation**:
  - Cloud Firestore user-isolated data paths (`/users/{uid}/...`).
  - Zero-trust Firestore Security Rules deployed directly.
  - Private Storage access paths for uploaded documents.

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 20+
- A Google Cloud / Firebase Project (automatically configured in AI Studio)
- Gemini API key set in `GEMINI_API_KEY` (configured in Secrets panel or `.env`)

### 2. Environment Configuration
Create or inspect `.env`:
```bash
GEMINI_API_KEY="your-gemini-api-key"
PORT=3000
```

### 3. Running the Full-Stack Server
Development mode (starts Express backend proxy with Vite middleware on port 3000):
```bash
npm run dev
```

Production build:
```bash
npm run build
npm start
```

---

## 🧪 Testing & Verification

1. **Authentication & Onboarding**:
   - Click "Sign In", "Create New Account", or use the one-click **"Instant Evaluation (Guest Demo Access)"** button.
   - Configure your preferred currency (e.g. INR), country, and monthly spending budget in the onboarding wizard.
2. **Demo Data Generation**:
   - Go to **Settings &rarr; Evaluation & Demo Mode &rarr; "Generate Demo Records"**.
   - Populates realistic invoices (health policy, car service), assets (LG Refrigerator, Apple MacBook Pro, Hyundai Creta), transactions, and pantry items.
3. **Cross-Module Verification (Workflow A)**:
   - Upload any receipt/invoice image or PDF in DocuMind.
   - Review the extracted fields in the review modal and approve with "Record in SpendSense" and "Register in FixFlow" checked.
   - Inspect the **Integration Activity Stream** on the Dashboard and the **Automation Centre** in Intelligence to verify the event log.
4. **AI Assistant**:
   - Open **Intelligence &rarr; AI Assistant** or click **"Ask AI"** in the top navigation.
   - Ask: *"How much did I spend this month?"* or *"Which warranties expire soon?"*
   - Verify the structured response with Confirmed Data and Inferred Data breakdown.
5. **Data Backup**:
   - Navigate to **Settings &rarr; Data Portability & Export &rarr; "Download JSON Backup"** to retrieve your complete database archive.

---

## 🔒 Security Architecture

- **User Data Isolation**: Every collection is nested under `users/{userId}/...` in Cloud Firestore.
- **Rules Verification**: Firestore security rules restrict all reads and writes to `request.auth.uid == userId`.
- **Input Sanitization**: AI extraction results are treated as unconfirmed drafts until explicitly approved by the user.
