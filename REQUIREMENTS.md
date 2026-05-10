# Pollution Center Management System - Requirements Document

## Project Overview

A comprehensive financial tracking and management system for pollution testing centers with multi-user support, transaction management, daily settlements, and administrative oversight.

---

## 1. BUSINESS CONTEXT

### 1.1 Background
Pollution testing centers process hundreds of vehicles daily and collect various fees including:
- Pollution test certificates (PUC)
- Road tax
- Insurance processing
- Service charges
- Document verification

The system needs to track all income sources, manage daily settlements, and provide comprehensive reporting for management oversight.

### 1.2 Current Challenges
- Manual entry tracking prone to errors
- Difficulty in tracking multiple income sources
- No centralized reporting
- Settlement reconciliation issues
- Lack of accountability and audit trail
- No system for edit control and approvals

---

## 2. USER ROLES

### 2.1 Staff User
**Description:** Front-line employees at pollution centers who handle day-to-day operations.

**Access Level:** Limited

**Responsibilities:**
- Enter transaction details
- Submit daily settlements
- Request edits for locked transactions
- View own center's data

**Restrictions:**
- Cannot edit locked entries
- Cannot access other centers' data
- Cannot approve/reject requests
- Cannot manage users or centers

### 2.2 Admin User
**Description:** System administrators and management personnel.

**Access Level:** Full system access

**Responsibilities:**
- View all centers and transactions
- Manage users and centers
- Approve/reject edit requests
- Approve/reject settlements
- Generate reports across all centers
- System configuration
- Full CRUD operations on all entities

---

## 3. FUNCTIONAL REQUIREMENTS

### 3.1 User Authentication & Authorization

#### FR-3.1.1 Login
- Users must authenticate with username and password
- System generates JWT token upon successful login
- Token expires after 24 hours
- Support for "Remember Me" functionality

#### FR-3.1.2 Role-Based Access
- System enforces role-based permissions (Admin/Staff)
- Staff can only access assigned centers
- Admin has access to all centers and administrative functions

#### FR-3.1.3 Password Management
- Users can change their password
- Passwords must be hashed (bcrypt)
- Minimum password length: 6 characters

---

### 3.2 Transaction Management

#### FR-3.2.1 Transaction Entry (Staff)
**Priority:** High

**User Story:** As a staff member, I want to enter transaction details for vehicles so that all income is recorded.

**Acceptance Criteria:**
- Must select vehicle type (2-wheeler, 4-wheeler, commercial, etc.)
- Must enter vehicle number
- Must select income source (PUC, road tax, insurance, etc.)
- Amount is auto-filled based on income source but can be modified
- Can add optional notes
- Date and time are automatically recorded
- Transaction is automatically locked after creation
- Unique transaction number is generated

**Fields:**
- Transaction Number (auto-generated)
- Vehicle Number (alphanumeric, format: XX##XX####)
- Vehicle Type (dropdown)
- Income Source (dropdown)
- Amount (₹, decimal)
- Date (auto-filled, can modify)
- Time (auto-filled)
- Notes (optional, text area)

#### FR-3.2.2 Transaction Locking
- All transactions are locked immediately after creation
- Locked transactions cannot be edited by staff
- Only admin can directly edit transactions
- Staff must raise edit request for changes

#### FR-3.2.3 Transaction Viewing
**Staff:**
- View own center's transactions
- Filter by date, income source, vehicle type
- Pagination support (50 records per page)

**Admin:**
- View all centers' transactions
- Advanced filtering options
- Export capabilities

---

### 3.3 Expense Management

#### FR-3.3.1 Expense Entry (Staff)
**Priority:** High

**User Story:** As a staff member, I want to record daily expenses so that all operational costs are tracked.

**Acceptance Criteria:**
- Must select expense category (rent, utilities, salaries, maintenance, supplies, etc.)
- Must enter expense amount
- Must select payment mode (cash, bank transfer, UPI, etc.)
- Can upload receipt/bill (optional, image or PDF)
- Can add vendor/payee name
- Can add description/notes
- Date is auto-filled but can be modified
- Transaction is locked after creation
- Unique expense number is generated

**Fields:**
- Expense Number (auto-generated)
- Expense Category (dropdown)
- Expense Sub-Category (optional, dropdown based on category)
- Amount (₹, decimal)
- Payment Mode (Cash/Bank Transfer/UPI/Card/Cheque)
- Vendor/Payee Name (text)
- Description (text area)
- Date (auto-filled, can modify)
- Receipt/Bill Upload (optional, image/PDF)
- Status (PENDING/APPROVED/REJECTED)

**Expense Categories:**
- Staff Salaries
- Rent
- Electricity Bill
- Water Bill
- Internet/Phone Bill
- Equipment Maintenance
- Office Supplies
- Cleaning & Sanitation
- Transportation
- Marketing
- Miscellaneous

#### FR-3.3.2 Expense Approval (Admin)
**Priority:** High

**User Story:** As an admin, I want to approve expenses so that I control spending and verify authenticity.

**Acceptance Criteria:**
- View all pending expenses from all centers
- See expense details and receipt (if uploaded)
- Can approve or reject
- Can add approval notes
- Approved expenses are final
- Rejected expenses can be deleted or resubmitted with corrections
- Email notification to staff on approval/rejection

#### FR-3.3.3 Expense Limits
**Priority:** Medium

**Configuration:** Set expense limits per category

**Business Rules:**
- Expenses below threshold: Auto-approved
- Expenses above threshold: Require admin approval
- Can set daily/weekly/monthly limits per center
- Alerts when approaching limits

#### FR-3.3.4 Recurring Expenses
**Priority:** Low (Future)

**User Story:** As a staff member, I want to set up recurring expenses so that monthly bills are automatically recorded.

**Examples:**
- Monthly rent
- Electricity bill
- Internet bill
- Salaries

#### FR-3.3.5 Expense Viewing
**Staff:**
- View own center's expenses
- Filter by category, date range, payment mode
- See approval status

**Admin:**
- View all centers' expenses
- Advanced filtering
- Export capabilities
- Spending analytics

---

### 3.4 Profit & Loss Tracking

#### FR-3.4.1 P&L Dashboard
**Priority:** High

**User Story:** As an admin, I want to see profit/loss so that I can monitor financial health.

**Components:**
- Total Income vs Total Expenses
- Net Profit/Loss
- Center-wise P&L comparison
- Month-over-month trends
- Category-wise expense breakdown

#### FR-3.4.2 Financial Reports
**Priority:** High

**Reports:**
- Daily P&L statement
- Monthly P&L statement
- Yearly P&L statement
- Center comparison report
- Expense analysis report
- Income vs Expense trends

**Export:** Excel, PDF, CSV

---

### 3.5 Edit Request System

#### FR-3.3.1 Request Edit (Staff)
**Priority:** High

**User Story:** As a staff member, I want to request edits to locked transactions so that errors can be corrected.

**Acceptance Criteria:**
- Can select any locked transaction from own center
- Must provide reason for edit request
- Must specify proposed changes
- Original data is preserved
- Request status starts as "PENDING"
- Cannot edit while request is pending

**Fields:**
- Transaction ID (selection)
- Request Reason (required, text)
- Proposed Changes (display old vs new values)
- Status (PENDING/APPROVED/REJECTED)

#### FR-3.3.2 Review Edit Requests (Admin)
**Priority:** High

**User Story:** As an admin, I want to review and approve/reject edit requests so that I maintain control over data changes.

**Acceptance Criteria:**
- View all pending edit requests
- See original vs proposed values side-by-side
- Can add review notes
- Can approve or reject request
- On approval, transaction is updated with new values
- On rejection, transaction remains unchanged
- Staff is notified of decision
- Audit log records the action

---

### 3.6 Daily Settlement

#### FR-3.4.1 Submit Settlement (Staff)
**Priority:** High

**User Story:** As a staff member, I want to submit daily settlements so that my accounts are cleared.

**Acceptance Criteria:**
- Can submit settlement for current or previous days
- System auto-calculates total from transactions
- Shows carry-forward amount from previous day
- Calculates net amount (total + carry-forward)
- One settlement per center per day
- Cannot submit if already submitted (unless rejected)
- Optional notes field

**Business Logic:**
- Total Amount = Sum of all transactions for the day
- Carry Forward = Unsettled amount from previous day
- Net Amount = Total Amount + Carry Forward

**Fields:**
- Settlement Number (auto-generated)
- Settlement Date
- Total Amount (auto-calculated)
- Carry Forward Amount (auto-calculated)
- Net Amount (auto-calculated)
- Notes (optional)
- Status (PENDING/APPROVED/REJECTED)

#### FR-3.4.2 Carry Forward Logic
- If settlement not submitted, amount carries to next day
- Carry forward accumulates until settlement
- Settlement clears carry forward if approved
- Rejected settlement keeps carry forward active

#### FR-3.4.3 Settlement Approval (Admin)
**Priority:** Medium

**Configuration:** Optional feature (can be toggled)

**User Story:** As an admin, I want to approve settlements so that I verify all amounts before clearing.

**Acceptance Criteria:**
- View pending settlements from all centers
- See breakdown of transactions
- Can approve or reject
- Can add approval notes
- On approval, carry forward is cleared
- On rejection, staff can resubmit

---

### 3.7 Dashboard & Analytics

#### FR-3.7.1 Staff Dashboard
**Priority:** Medium

**Displays:**
- Today's income summary
- Today's expense summary
- Net profit/loss for today
- Pending settlements
- Pending edit requests
- Quick income entry button
- Quick expense entry button
- Recent transactions (income & expenses)

#### FR-3.7.2 Admin Dashboard
**Priority:** High

**User Story:** As an admin, I want to see comprehensive analytics so that I can monitor performance.

**Components:**

**Financial Cards:**
- Today's income
- Today's expenses
- Today's profit/loss
- This week's income
- This week's expenses
- This week's profit/loss
- This month's income
- This month's expenses
- This month's profit/loss

**Charts:**
1. Income vs Expense Trend (Line chart)
   - X-axis: Date
   - Y-axis: Amount
   - Two lines: Income (green) and Expenses (red)
   - Time range: Last 7/30 days

2. Profit/Loss Trend (Area chart)
   - X-axis: Date
   - Y-axis: Profit/Loss
   - Positive values: Green, Negative: Red

3. Center Performance (Bar chart)
   - X-axis: Centers
   - Y-axis: Income, Expenses, Profit
   - Grouped bars
   - Sortable by metric

4. Income Source Breakdown (Pie chart)
   - Segments: Different income sources
   - Shows percentage distribution

5. Expense Category Breakdown (Donut chart)
   - Segments: Different expense categories
   - Shows spending distribution

6. Vehicle Type Distribution (Bar chart)
   - Shows transaction count by vehicle type

**Filters:**
- Date range picker
- Center selection (multi-select)
- Transaction type (Income/Expense/Both)
- Income source filter (multi-select)
- Expense category filter (multi-select)
- Vehicle type filter
- Payment mode filter (for expenses)

---

### 3.8 Reports

#### FR-3.8.1 Report Generation
**Priority:** High

**User Story:** As an admin, I want to generate custom reports so that I can analyze data for specific periods.

**Report Types:**
1. Income Report
2. Expense Report
3. Profit & Loss Report
4. Center-wise Report
5. Category-wise Report
6. Payment Mode Report

**Features:**
- Advanced filter options
- Date range selection
- Multi-select centers
- Transaction type (Income/Expense/Both)
- Multi-select income sources
- Multi-select expense categories
- Multi-select vehicle types
- Payment mode filter
- Transaction status filter
- Data table with pagination
- Summary statistics (Total Income, Total Expenses, Net Profit/Loss)

#### FR-3.8.2 Export Reports
**Priority:** High

**Supported Formats:**
- Excel (.xlsx)
- PDF
- CSV

**Export Includes:**
- Filtered data
- Summary totals
- Header with filters applied
- Date of generation

#### FR-3.8.3 Print Reports
**Priority:** Medium

- Print preview functionality
- Formatted for A4 paper
- Includes logo and header
- Footer with page numbers

---

### 3.9 Admin Panel

#### FR-3.9.1 User Management
**Priority:** High

**Features:**
- Create new users (Admin/Staff)
- Edit user details
- Assign centers to staff
- Activate/deactivate users
- Reset passwords (future)
- View user activity log

**User Fields:**
- Username (unique)
- Email (unique)
- Role (Admin/Staff)
- Assigned Centers (for Staff)
- Active Status

#### FR-3.9.2 Center Management
**Priority:** High

**Features:**
- Create new centers
- Edit center details
- Activate/deactivate centers
- View center statistics

**Center Fields:**
- Center Code (unique)
- Center Name
- Address
- Contact Number
- Email
- Active Status

#### FR-3.9.3 Master Data Configuration
**Priority:** Medium

**Income Sources:**
- Add/Edit/Delete income sources
- Set default amounts
- Activate/deactivate

**Vehicle Types:**
- Add/Edit/Delete vehicle types
- Set base charges
- Activate/deactivate

**Expense Categories:**
- Add/Edit/Delete expense categories
- Add sub-categories
- Set approval thresholds
- Activate/deactivate

**Payment Modes:**
- Add/Edit/Delete payment modes
- Set as default
- Activate/deactivate

---

## 4. NON-FUNCTIONAL REQUIREMENTS

### 4.1 Performance
- Page load time: < 2 seconds
- API response time: < 200ms (95th percentile)
- Support 100+ concurrent users
- Handle 10,000+ transactions per day
- Database query optimization with proper indexing

### 4.2 Security
- All passwords hashed with bcrypt (10 rounds)
- JWT token-based authentication
- Token expiry after 24 hours
- HTTPS in production (SSL/TLS)
- CORS enabled with whitelist
- Rate limiting on API endpoints
- SQL injection prevention (via ORM)
- XSS protection
- Input validation on all forms
- Audit logging for critical actions

### 4.3 Usability
- Responsive design (mobile, tablet, desktop)
- Intuitive user interface
- Material Design principles
- Loading indicators for async operations
- Clear error messages
- Toast notifications for success/error
- Confirmation dialogs for destructive actions
- Keyboard shortcuts for common actions
- Auto-complete for vehicle numbers

### 4.4 Reliability
- 99.9% uptime target
- Automated database backups
- Error logging and monitoring
- Graceful error handling
- Data validation at all layers
- Transaction atomicity

### 4.5 Maintainability
- Clean code architecture
- TypeScript strict mode
- Feature-based folder structure
- Comprehensive documentation
- ESLint + Prettier enforcement
- Unit test coverage >70%
- API documentation (Swagger)

### 4.6 Scalability
- Horizontal scaling capability
- Database connection pooling
- Efficient pagination
- Lazy loading for large datasets
- Future: Redis caching for analytics

### 4.7 Browser Compatibility
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

## 5. DATA REQUIREMENTS

### 5.1 Data Entities

#### Expenses
- Unique identifiers (UUID)
- Category and sub-category
- Amount tracking
- Payment mode
- Vendor/payee information
- Receipt storage (file path/URL)
- Approval workflow
- Audit trail

#### ExpenseCategory (Master Data)
- Category name
- Sub-categories
- Approval threshold
- Active status

#### PaymentMode (Master Data)
- Mode name (Cash, Bank, UPI, etc.)
- Default flag
- Active status

#### Users
- Unique identifiers (UUID)
- Username and email uniqueness
- Password hashing
- Role assignment
- Active status flag

#### Centers
- Unique center codes
- Complete address information
- Contact details
- Active status management

#### Transactions
- Immutable after creation (locked)
- Audit trail (created_by, updated_by)
- Soft delete capability (future)
- Date/time stamping

#### Edit Requests
- Link to original transaction
- Change tracking (old vs new)
- Approval workflow
- Timestamped requests and reviews

#### Settlements
- Daily uniqueness per center
- Automatic calculations
- Approval tracking
- Historical record

#### Audit Logs
- Complete action history
- User identification
- Entity tracking
- Timestamp recording
- IP address and user agent

### 5.2 Data Retention
- Transaction data: Indefinite
- Audit logs: 2 years
- Settlements: Indefinite
- Edit requests: 1 year

### 5.3 Backup Requirements
- Daily automated backups
- 30-day retention period
- Point-in-time recovery capability
- Backup verification

---

## 6. BUSINESS RULES

### 6.1 Income Transaction Rules
- One transaction can have only one income source
- Vehicle number format validation (Indian format)
- Amount must be positive
- Transaction number must be unique
- Date cannot be in future
- Locked transactions cannot be deleted

### 6.2 Expense Rules
- Expense amount must be positive
- Expense category is mandatory
- Payment mode is mandatory
- Expenses above threshold require admin approval
- Receipt upload recommended for expenses >₹500
- Expense date cannot be in future
- Approved expenses cannot be deleted (soft delete only)

### 6.3 Settlement Rules
- One settlement per center per day
- Cannot settle future dates
- Must include all transactions for the day
- Carry forward calculated automatically
- Rejected settlements can be resubmitted

- Settlements now include net profit/loss calculation
- Formula: Net Amount = (Total Income - Total Expenses) + Carry Forward

### 6.4 Edit Request Rules
- Only one pending request per transaction
- Cannot request edit for already pending transaction
- Original data preserved in request
- Must provide reason (minimum 10 characters)

- Edit requests now apply to both income transactions and expenses

### 6.5 User Assignment Rules
- Staff must be assigned to at least one center
- Admin users are not center-specific
- User can be assigned to multiple centers
- Deactivating user doesn't delete their transaction history

---

## 7. WORKFLOW DIAGRAMS

### 7.1 Income Transaction Entry Flow
```
Staff Login → Select Center → Entry Form → Fill Details → Submit
→ System Validates → Generate Transaction Number → Lock Transaction
→ Success Notification → Return to Dashboard
```

### 7.2 Expense Entry Flow
```
Staff Login → Select Center → Expense Form → Select Category → Enter Amount
→ Select Payment Mode → Add Vendor/Description → Upload Receipt (optional)
→ Submit → System Validates → Check Approval Threshold
→ If Below Threshold: Auto-approve → Generate Expense Number
→ If Above Threshold: Send to Admin for Approval → Status: PENDING
→ Success Notification → Return to Dashboard
```

### 7.3 Expense Approval Flow
```
Admin → View Pending Expenses → Review Details → Check Receipt
→ Verify Amount & Category → Approve/Reject → Add Notes (optional)
→ If Approved: Update Status → Generate Expense Number → Notify Staff
→ If Rejected: Update Status → Add Rejection Reason → Notify Staff
```

### 7.4 Edit Request Flow
```
Staff → View Locked Transaction → Request Edit → Fill Reason & Changes
→ Submit Request → Status: PENDING → Admin Reviews → Approve/Reject
→ If Approved: Update Transaction → Notify Staff
→ If Rejected: Keep Original → Notify Staff with Reason
```

### 7.5 Settlement Flow
```
End of Day → Staff → Settlement Form → System Calculates:
  - Total Income (sum of all income transactions)
  - Total Expenses (sum of all approved expenses)
  - Net Profit/Loss (Income - Expenses)
  - Carry Forward from Previous Day
  - Final Net Amount (Net Profit/Loss + Carry Forward)
→ Staff Reviews → Submit Settlement
→ [Optional: Admin Approval] → Settlement Complete
→ Clear Carry Forward → Generate Receipt with P&L Details
```

---

## 8. USER INTERFACE REQUIREMENTS

### 8.1 Login Page
- Center-aligned form
- Username and password fields
- Login button
- Display test credentials (development only)
- Error message display area
- Remember me checkbox (future)

### 8.2 Staff Dashboard
- Financial summary cards:
  - Today's income
  - Today's expenses
  - Net profit/loss
- Quick stats:
  - Income transaction count
  - Expense count
  - Pending expense approvals
  - Pending settlements
- Action buttons:
  - Add Income Transaction
  - Add Expense
- Recent transactions list (income & expenses)
- Alerts for rejected expenses

### 8.3 Admin Dashboard
- Financial overview cards (9 cards):
  - Today/Week/Month: Income, Expenses, Profit/Loss
- Multiple charts:
  - Income vs Expense trend
  - Profit/Loss trend
  - Center comparison
  - Income source breakdown
  - Expense category breakdown
- Filter panel (collapsible)
- Pending approvals section:
  - Pending expenses count
  - Pending edit requests
  - Pending settlements
- Export buttons (Excel, PDF, CSV)
- Recent activity feed
- Alert notifications for:
  - High expenses
  - Negative profit centers
  - Pending approvals >24hrs

### 8.4 Income Transaction List
- Searchable table
- Column sorting
- Pagination controls
- Filter dropdowns (date, center, income source, vehicle type)
- Action buttons (View/Edit/Request Edit)
- Export button
- Summary row (total amount)

### 8.5 Expense List
- Searchable table
- Column sorting
- Pagination controls
- Filter dropdowns (date, center, category, payment mode, status)
- Action buttons (View/Edit/Approve/Reject for pending)
- Receipt preview/download
- Export button
- Summary row (total expenses by status)

### 8.6 Profit & Loss View
- Date range selector
- Center filter
- Summary cards:
  - Total Income
  - Total Expenses
  - Net Profit/Loss
  - Profit Margin %
- Detailed breakdown table
- Visual charts
- Export options

### 8.7 Forms
- Clear labels
- Validation messages
- Required field indicators
- Auto-complete where applicable
- Submit/Cancel buttons
- Loading states

---

## 9. CONSTRAINTS & ASSUMPTIONS

### 9.1 Technical Constraints
- MySQL 8.0+ required
- Node.js 20+ required
- Modern browser required
- JavaScript must be enabled
- Local time zone handling

### 9.2 Business Constraints
- Single currency (INR)
- Indian vehicle number format
- Indian date format (DD/MM/YYYY)
- Single language (English)

### 9.3 Assumptions
- Users have basic computer literacy
- Reliable internet connection available
- Centers operate during business hours
- One staff member per center at a time
- Settlements submitted before closing

---

## 10. FUTURE ENHANCEMENTS

### Phase 2 (Post-MVP)
- Mobile application (React Native)
- SMS notifications
- Email notifications
- Bulk transaction upload (Excel import)
- Advanced analytics (predictive)
- Multi-language support
- QR code for transactions
- Photo upload for pollution certificates
- Integration with payment gateways
- Biometric authentication
- Offline mode support
- Real-time collaboration

### Phase 3 (Long-term)
- AI-based fraud detection
- Automated report scheduling
- WhatsApp integration
- E-receipt generation
- Customer portal
- API for third-party integrations
- Mobile app for customers
- Advanced role management

---

## 11. ACCEPTANCE CRITERIA

### 11.1 System Ready When:
- ✅ All user roles implemented
- ✅ Transaction entry and locking functional
- ✅ Edit request workflow complete
- ✅ Settlement system operational
- ✅ Dashboard with analytics working
- ✅ Reports can be generated and exported
- ✅ Admin panel fully functional
- ✅ All validations in place
- ✅ Security measures implemented
- ✅ Database properly indexed
- ✅ Audit logging active
- ✅ Error handling comprehensive
- ✅ User documentation complete

### 11.2 Launch Criteria
- [ ] UAT successfully completed
- [ ] Performance benchmarks met
- [ ] Security audit passed
- [ ] Database backup tested
- [ ] Training completed
- [ ] Support process defined
- [ ] Production environment ready

---

## 12. SUCCESS METRICS

### 12.1 User Adoption
- 100% of centers onboarded within 1 month
- 90%+ daily active usage
- Average of 500+ transactions per day

### 12.2 Efficiency
- Transaction entry time < 1 minute
- Settlement time < 5 minutes
- Report generation < 30 seconds

### 12.3 Accuracy
- Zero data loss
- < 1% edit request rate
- 100% settlement reconciliation

### 12.4 System Performance
- 99.9% uptime achieved
- API response time < 200ms
- Zero security incidents

---

**Document Version:** 1.0  
**Last Updated:** April 3, 2026  
**Status:** Approved  
**Prepared By:** Development Team  
**Approved By:** Project Stakeholders
