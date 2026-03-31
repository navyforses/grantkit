# Admin Panel Translation Audit

## Hardcoded strings found in Admin.tsx (2041 lines)

### StatusBadge (line 79-92)
- "Active", "Cancelled", "Past Due", "Paused", "None"

### RoleBadge (line 95-108)
- "Admin", "User"

### categoryLabels (line 111-121)
- "Medical Treatment", "Financial Assistance", "Assistive Technology", "Social Services", "Scholarships", "Housing", "Travel & Transport", "International", "Other"

### GrantFormModal (line 140-573)
- "Add New Grant" / "Edit Grant"
- Form labels: "Name", "Organization", "Description", "Category", "Type", "Country", "Amount", "Eligibility", "Website", "Email", "Phone", "Status"
- Placeholders: "Grant name...", "Organization name...", "Describe the grant...", "e.g., $5,000 - $25,000", "Who is eligible...", "https://...", "contact@...", "+1 (555) ...", "Open, Closed, Rolling..."
- Select options: "Grant", "Resource", "🇺🇸 United States", "🌍 International"
- "Enrichment Details" section header
- Labels: "Application Process", "Deadline", "Funding Type", "Target Diagnosis / Condition", "Age Range", "State", "City", "Geographic Scope", "B-2 Visa Eligible", "Documents Required"
- Placeholders: "Step-by-step application process...", "Rolling, Dec 31, 2026...", "Cancer, Rare Disease, Any...", "All Ages, Children (0-17), Adults...", "California, New York, Nationwide...", "Los Angeles, New York City...", "Nationwide, State-specific...", "Medical records, proof of income, ID..."
- Select options: "Not specified", "One-Time", "Recurring", "Reimbursement", "Varies", "Yes", "No", "Uncertain"
- "Notify subscribers about this new grant" + "Send email notification about this new grant to all active subscribers"
- Buttons: "Cancel", "Create Grant", "Save Changes"

### DeleteConfirmModal (line 576-618)
- "Delete Grant"
- "Are you sure you want to permanently delete ... ? This action cannot be undone."
- "Cancel", "Delete"

### SendNotificationModal (line 621-763)
- "Send Grant Notification"
- "Select grants to notify subscribers about"
- "Selected (X/20):"
- "Search grants to include..."
- "No grants found"
- "Select at least one grant"
- "X grant(s) selected"
- "Cancel", "Send to Subscribers"

### Main Admin Component (line 766+)
- Toast messages: "User role updated", "Subscription status updated", "Grant created successfully", "Grant updated", "Grant deleted", "Notification sent to X subscribers for X grant(s)", "Failed to send notification", "No grants to export", "Exported X grants as CSV", "Exported X grants as Excel", "Export failed:", "Failed to parse file:", "Imported X new, updated X existing grants", "Import failed:"
- "Access Denied", "You do not have permission to access this page.", "Return to Home"
- "Admin Panel", "Refresh"
- Stat labels: "Total Users", "Active Subs", "Total Grants", "Subscribers", "Cancelled", "Past Due", "No Sub"
- Tab labels: "Users", "Grants", "Newsletter"

### Users Tab
- "Users" section title
- "Search name or email..." placeholder
- "All Statuses", "Active", "Cancelled", "Past Due", "Paused", "No Subscription"
- Table headers: "User", "Role", "Subscription", "Joined", "Last Login", "Actions"
- "Loading users...", "No users found"
- "Demote" / "Promote"
- Subscription select: "None", "Active", "Cancelled", "Past Due", "Paused"
- "Showing X–Y of Z"

### Grants Tab
- "Grants & Resources" + "X grants, Y resources"
- "Search grants..." placeholder
- "All Categories"
- "CSV", "Excel", "Import", "Add Grant"
- Table headers: "Grant", "Category", "Type", "Country", "Status", "Added", "Actions"
- "Loading grants...", "No grants found"
- "Grant" / "Resource" type badges
- "Active" / "Inactive" status badges
- "Showing X–Y of Z"

### Newsletter Tab
- "Active Subscribers", "Notifications Sent"
- "X total (Y unsubscribed)", "X completed, Y failed"
- "Send Grant Notification" button
- "Notification History"
- Table headers: "Subject", "Grants", "Recipients", "Success", "Status", "Sent At"
- "No notifications sent yet", "Click 'Send Grant Notification' to get started"

### Import Modal
- "Import Grants"
- Steps: "Upload a CSV or Excel file", "Review parsed data before importing", "Importing grants...", "Import completed"
- "Parsing file...", "Drop your CSV or Excel file here", "or click to browse"
- "Expected columns:", "Required:", "Optional:", "Translations:", "Tip: Export existing grants first to see the exact format."
- "Valid Rows", "Skipped", "Errors"
- "Validation Errors"
- "Preview (first 10 rows)"
- Table headers: "#", "Name", "Category", "Country", "Type", "Translations"
- "...and X more rows"
- "Importing X grants...", "This may take a moment"
- "Import Complete"
- "Created", "Updated", "Failed"
- "Failed Entries:"
- "Close", "Cancel", "Upload Different File", "Import X Grants", "Done"
