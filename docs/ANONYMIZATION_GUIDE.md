# Anonymization Guide - Removing Personal Identifiers

**Purpose:** Remove all personally identifying information from the Homebase codebase to protect privacy and make the project more generic/reusable.

**Date:** January 8, 2026

---

## Summary of Identified Personal Information

### Geographic Locations
- **QC / Quezon City** → Replace with "City A" or "Urban Residence"
- **Magalang, Pampanga** → Replace with "City B" or "Rural Property"
- **Metro Manila** → Replace with "Metro Area"
- **Philippines / Philippine** → Replace with generic or remove
- **SM North / SM QC / Puregold QC** → Replace with "Store A", "Supermarket"
- **Asia/Manila timezone** → Replace with "Asia/Tokyo" or "UTC+8"

### Utility Companies & Providers
- **PELCO** → Replace with "Local Electric Co" or "ElectricCo-B"
- **MERALCO** → Replace with "Metro Electric" or "ElectricCo-A"
- **PLDT** → Replace with "Internet Provider" or "TelecomCo"
- **Maynilad** → Replace with "Water Company" or "WaterCo"

### Organization Names
- **Dev Family** → Replace with "Sample Family" or "Test Org"
- **test@devfamily.com** → Replace with "demo@example.com"

### Currency & Locale
- **₱ PHP / Philippine Pesos** → Consider USD or generic "currency units"
- **en-PH locale** → Replace with "en-US" or generic
- **Specific peso amounts** → Can keep as examples, but remove context

### Distance/Travel References
- **80km between residences** → Replace with "distance" or generic value

---

## File-by-File Changes Required

### CRITICAL FILES (Contains Most References)

#### 1. `src/lib/db/seed.ts`
**Current:**
```typescript
name: 'Dev Family',
name: 'QC Apartment',
address: 'Quezon City, Metro Manila, Philippines',
name: 'Magalang House',
address: 'Magalang, Pampanga, Philippines',
email: 'test@devfamily.com',
```

**Replace with:**
```typescript
name: 'Sample Family',
name: 'Primary Residence',
address: 'City A, State, Country',
name: 'Secondary Residence',
address: 'City B, Region, Country',
email: 'demo@example.com',
```

---

#### 2. `README.md`

**Lines to change:**

**Line 36:**
```diff
-- ✅ Philippine locale support (₱ PHP, Manila timezone)
+- ✅ Multi-currency support (USD/EUR/etc, configurable timezone)
```

**Lines 137, 157-167 (Use case examples):**
```diff
-  ├── residences (QC House, Magalang Property, etc.)
+  ├── residences (Urban Home, Rural Property, etc.)

-**Problem:** Forgot PELCO bill → power cut → food spoiled → emergency trip during typhoon
+**Problem:** Forgot electric bill → power cut → food spoiled → emergency trip during storm

-**Solution:**
-- 14 days before: "PELCO due in 2 weeks - calendar it"
-- 7 days before: "PELCO critical - plan remote property trip"
-- 3 days before: "PELCO + storm forecast = URGENT: pay early"
+**Solution:**
+- 14 days before: "Electric bill due in 2 weeks - calendar it"
+- 7 days before: "Electric bill critical - plan property trip"
+- 3 days before: "Electric bill + storm forecast = URGENT: pay early"

-**Problem:** At QC residence, forgetting about Magalang bills/maintenance
+**Problem:** At primary residence, forgetting about secondary property bills/maintenance

-**Solution:**
-- Shared activity feed: "X paid MERALCO"
+**Solution:**
+- Shared activity feed: "X paid Electric Company"
```

**Line 303:**
```diff
-- [ ] Can add bill (MERALCO, PELCO, etc.)
+- [ ] Can add bill (Electric, Water, Internet, etc.)
```

---

#### 3. `src/app/(dashboard)/bills/page.tsx`

**Line 123:**
```diff
-      timeZone: 'Asia/Manila',
+      timeZone: 'UTC',
```

**Alternative (if timezone support needed):**
```typescript
timeZone: process.env.NEXT_PUBLIC_TIMEZONE || 'UTC',
```

---

#### 4. `src/app/(dashboard)/bills/new/page.tsx`

**Line 95:**
```diff
-                Amount (₱)
+                Amount
```

Or keep currency symbol but make it configurable:
```typescript
const currencySymbol = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$';
// Then use: Amount ({currencySymbol})
```

---

#### 5. `src/app/page.tsx`

**Line 61:**
```diff
-              Philippine-pesos currency, Manila timezone, and built for Filipino households
+              Multi-currency support, configurable timezone, and built for modern households
```

---

### DOCUMENTATION FILES

#### 6. `docs/prompt.md`

**Replace all example data:**

**Lines 163-168:**
```diff
-// - 1 organization: "Dev Family"
-// - 2 residences: "QC Residence", "Magalang Residence"
+// - 1 organization: "Sample Family"
+// - 2 residences: "Primary Residence", "Secondary Residence"

-//   - MERALCO (QC, ₱4200, due in 5 days, utility)
-//   - PELCO (Magalang, ₱1800, due in 8 days, utility, critical=true, requiresTravel=true)
-//   - PLDT (QC, ₱1999, due in 10 days, telecom)
+//   - Electric Co A (Primary, $42.00, due in 5 days, utility)
+//   - Electric Co B (Secondary, $18.00, due in 8 days, utility, critical=true, requiresTravel=true)
+//   - Internet Provider (Primary, $19.99, due in 10 days, telecom)
```

**Lines 195-198 (Philippine locale):**
```diff
-5. **Philippine Locale:**
-   - Format currency: `new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })`
-   - Timezone: 'Asia/Manila'
+5. **Locale Configuration:**
+   - Format currency: `new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })`
+   - Timezone: Configurable via environment variable
```

**Lines 575-601 (Test scenarios):**
```diff
-# - Name: MERALCO
-# - Provider: MERALCO
+# - Name: Electric Bill
+# - Provider: Electric Company A

-# 4. Add critical bill (PELCO Magalang):
-# - Name: PELCO
-# - Provider: PELCO
+# 4. Add critical bill (Remote Electric):
+# - Name: Electric Bill (Remote)
+# - Provider: Electric Company B
```

---

#### 7. `docs/architecture.md`

**This file has MANY references. Key changes:**

**Line 1312:**
```diff
-Perfect—this gives me everything I need to tailor Phase 1 to your specific pain points. Let's design the MVP around **grocery shopping + bills** with QC as primary residence.
+Perfect—this gives me everything I need to tailor Phase 1 to your specific pain points. Let's design the MVP around **grocery shopping + bills** with urban residence as primary.
```

**Lines 1322-1327 (Use case):**
```diff
-- Both benefit from **location context** (QC groceries ≠ Magalang groceries)
+- Both benefit from **location context** (Primary groceries ≠ Secondary groceries)

-> "I'm at SM QC. Open app → see grocery list with 'low stock' items highlighted. Add items to cart. At checkout, scan receipt → inventory auto-updates. Later, app reminds me: 'Meralco due in 3 days'—I pay via GCash, mark as paid in app."
+> "I'm at the supermarket. Open app → see grocery list with 'low stock' items highlighted. Add items to cart. At checkout, scan receipt → inventory auto-updates. Later, app reminds me: 'Electric bill due in 3 days'—I pay via mobile app, mark as paid."
```

**Throughout the file:**
- Replace all "Magalang" → "Secondary Property" or "Remote Residence"
- Replace all "QC" → "Primary Residence" or "Urban Home"
- Replace "PELCO" → "Electric Co B" or "Remote Electric"
- Replace "MERALCO" → "Electric Co A" or "Urban Electric"
- Replace specific store names → "Supermarket A", "Store B"
- Replace typhoon → storm/severe weather
- Replace 80km → "significant distance"

---

#### 8. `docs/ADR.md`

**Similar patterns to architecture.md:**

**Line 124:**
```diff
-  timezone: text('timezone').default('Asia/Manila'),
+  timezone: text('timezone').default('UTC'),
```

**Line 171:**
```diff
-  provider: text('provider'), // MERALCO, PELCO, PLDT, etc.
+  provider: text('provider'), // Electric Co A, Electric Co B, Internet Provider, etc.
```

**Line 505:**
```diff
-  '🚨 PELCO MAGALANG DUE TOMORROW - ₱1,800. Open app to schedule payment trip.'
+  '🚨 REMOTE ELECTRIC DUE TOMORROW - $18.00. Open app to schedule payment trip.'
```

**Line 1265:**
```diff
-For PELCO Magalang (requires travel), need to check weather forecast before suggesting trip dates.
+For remote property utilities (requires travel), need to check weather forecast before suggesting trip dates.
```

**Lines 1544-1698 (Replace all PELCO/MERALCO references):**
- PELCO → Electric Co B / Remote Electric
- MERALCO → Electric Co A / Primary Electric
- Magalang → Secondary Residence

**Lines 2274-2279 (Example components):**
```diff
-    <PropertyTaxCard dueDate="Jan 15" amount={8500} residence="QC" />
-    <HOACard dueDate="Dec 15" amount={3500} residence="Magalang" />
+    <PropertyTaxCard dueDate="Jan 15" amount={850} residence="Primary" />
+    <HOACard dueDate="Dec 15" amount={350} residence="Secondary" />

-    <Alert>Magalang lease expires in 45 days</Alert>
+    <Alert>Secondary property lease expires in 45 days</Alert>
```

---

#### 9. `docs/ADR-Phase12-13.md`

**Lines 16-30 (JARVIS examples):**
```diff
-JARVIS: "Three bills: MERALCO ₱4,200 on Friday, PLDT ₱1,999 on Saturday,
-         Maynilad ₱1,800 next Monday."
+JARVIS: "Three bills: Electric $42.00 on Friday, Internet $19.99 on Saturday,
+         Water $18.00 next Monday."

-You: "Pay the MERALCO bill."
+You: "Pay the electric bill."

-JARVIS (proactive): "Heads up—PELCO Magalang is due in 8 days,
+JARVIS (proactive): "Heads up—Remote property electric is due in 8 days,
```

**Lines 160, 447-471 (Philippine context):**
```diff
-- Use Philippine context (pesos, local stores, weather)
+- Use local context (regional currency, nearby stores, weather)

-### Minimum Viable Setup (Budget: ~₱40,000-60,000)
+### Minimum Viable Setup (Budget: ~$700-1,100)
```

Convert all peso amounts to USD (divide by ~55):
- ₱6,000 → ~$110
- ₱16,000 → ~$290
- ₱45,000-60,000 → ~$820-1,100

**Line 698:**
```diff
-- Philippine context (uses pesos, local stores, Filipino terms where natural)
+- Local context (uses configured currency, nearby stores, natural language)
```

---

#### 10. `docs/adr-super.md`

**Similar changes as ADR-Phase12-13.md:**
- Replace all peso amounts
- Replace QC/Magalang references
- Replace Philippine-specific context
- Replace utility company names

**Lines 67, 82 (Architecture diagrams):**
```diff
-│      QC HOME SERVER (Mini PC / Pi 5)          │
+│      PRIMARY HOME SERVER (Mini PC / Pi 5)     │

-│  │  Same stack, syncs with QC     │   │
+│  │  Same stack, syncs with Primary │   │
```

---

#### 11. `docs/checklist.md`

**Lines 70-72:**
```diff
-When you deploy and can mark PELCO as paid, come back and say:
+When you deploy and can mark your first bill as paid, come back and say:

-**"Phase 1 shipped. PELCO is tracked."**
+**"Phase 1 shipped. Bills are tracked."**
```

---

#### 12. `docs/CODE_REVIEW_PHASE1.md` (The review I just created)

**Should also be anonymized if sharing publicly:**

Search and replace:
- QC → Primary Residence
- Magalang → Secondary Residence
- PELCO → Electric Co B
- MERALCO → Electric Co A
- Dev Family → Sample Family
- test@devfamily.com → demo@example.com
- Philippine/Philippines → (remove or make generic)
- Manila timezone → UTC or configurable timezone

---

### CONFIGURATION FILES

#### 13. Create `.env.example`

**Add as new file:**
```bash
# Database
DATABASE_URL="postgresql://user:pass@host:5432/dbname"

# Authentication
JWT_SECRET="generate-with-openssl-rand-base64-32"

# Application Settings
NODE_ENV="development"

# Locale Settings (Optional)
NEXT_PUBLIC_TIMEZONE="UTC"
NEXT_PUBLIC_CURRENCY="USD"
NEXT_PUBLIC_CURRENCY_SYMBOL="$"
NEXT_PUBLIC_LOCALE="en-US"

# Phase 2+ (Notifications)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=""
VAPID_PRIVATE_KEY=""
TWILIO_ACCOUNT_SID=""
TWILIO_AUTH_TOKEN=""
TWILIO_PHONE_NUMBER=""

# Phase 3+ (Weather)
OPENWEATHER_API_KEY=""

# Phase 12+ (JARVIS)
OLLAMA_URL="http://localhost:11434"
```

---

### SCHEMA FILES

#### 14. `src/lib/db/schema.ts`

**No changes needed** - schema is already generic.

---

## Automated Search & Replace Script

Create a script to automate some replacements:

```bash
#!/bin/bash
# File: scripts/anonymize.sh

# Create backup
git checkout -b anonymization-backup

# Search and replace (case-sensitive)
find . -type f \( -name "*.md" -o -name "*.ts" -o -name "*.tsx" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/.git/*" \
  -exec sed -i '' \
    -e 's/PELCO/ElectricCoB/g' \
    -e 's/MERALCO/ElectricCoA/g' \
    -e 's/PLDT/InternetProvider/g' \
    -e 's/Maynilad/WaterCo/g' \
    -e 's/Dev Family/Sample Family/g' \
    -e 's/test@devfamily\.com/demo@example.com/g' \
    -e 's/Quezon City/City A/g' \
    -e 's/QC Apartment/Primary Residence/g' \
    -e 's/QC House/Primary Residence/g' \
    -e 's/QC Residence/Primary Residence/g' \
    -e 's/Magalang House/Secondary Residence/g' \
    -e 's/Magalang Property/Secondary Residence/g' \
    -e 's/Magalang Residence/Secondary Residence/g' \
    -e 's/Magalang, Pampanga, Philippines/City B, Region, Country/g' \
    -e 's/Metro Manila/Metro Area/g' \
    -e 's/Asia\/Manila/UTC/g' \
    -e 's/Philippine-pesos/multi-currency/g' \
    -e 's/en-PH/en-US/g' \
    -e 's/₱/\$/g' \
    -e 's/PHP/USD/g' \
    {} \;

echo "Anonymization complete. Review changes before committing."
```

**WARNING:** This script will modify many files. Review each change carefully.

---

## Manual Review Checklist

After running automated replacements, manually review:

### [ ] Personal Context Removed
- [ ] No specific city names remain
- [ ] No specific utility company names remain
- [ ] No personal organization names remain
- [ ] No personal email addresses remain

### [ ] Geographic References
- [ ] Distance references are generic ("significant distance" instead of "80km")
- [ ] Weather references are generic ("storm" instead of "typhoon")
- [ ] Store names are generic ("Supermarket" instead of "SM North")

### [ ] Currency & Locale
- [ ] Currency symbols are configurable or generic
- [ ] Timezone is UTC or configurable
- [ ] Locale references are generic (en-US or configurable)
- [ ] Price examples don't reveal location

### [ ] Examples & Documentation
- [ ] Code examples use generic names
- [ ] User stories use generic scenarios
- [ ] Test data is anonymized
- [ ] Comments don't contain personal info

### [ ] Narrative/Story Elements
- [ ] Personal anecdotes are removed or genericized
- [ ] Specific incident references (PELCO blackout) are made generic
- [ ] Conversational examples don't reveal identity

---

## Priority Levels

### 🔴 HIGH PRIORITY (Must change before public sharing)
1. `src/lib/db/seed.ts` - Contains actual test email and locations
2. `README.md` - Public-facing, contains many examples
3. `src/app/page.tsx` - Landing page mentions Philippines
4. `.env.example` - Should exist and be generic

### 🟡 MEDIUM PRIORITY (Change for clean codebase)
5. All documentation files in `docs/` folder
6. Component files with hardcoded locale/currency
7. Test files (when created)

### 🟢 LOW PRIORITY (Nice to have)
8. Comments in code
9. Git commit messages (can't change easily)
10. Session notes (`session-ses_464d.md`)

---

## Alternative Approach: Feature Flags

Instead of removing Philippine context entirely, make it configurable:

```typescript
// src/lib/config/locale.ts
export const localeConfig = {
  timezone: process.env.NEXT_PUBLIC_TIMEZONE || 'UTC',
  currency: process.env.NEXT_PUBLIC_CURRENCY || 'USD',
  currencySymbol: process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$',
  locale: process.env.NEXT_PUBLIC_LOCALE || 'en-US',
  // Presets
  presets: {
    philippines: {
      timezone: 'Asia/Manila',
      currency: 'PHP',
      currencySymbol: '₱',
      locale: 'en-PH',
    },
    usa: {
      timezone: 'America/New_York',
      currency: 'USD',
      currencySymbol: '$',
      locale: 'en-US',
    },
  }
};
```

Then use throughout the app:
```typescript
import { localeConfig } from '@/lib/config/locale';

const formatted = new Intl.NumberFormat(localeConfig.locale, {
  style: 'currency',
  currency: localeConfig.currency,
}).format(amount);
```

This allows:
- Public codebase uses generic USD defaults
- You can use PHP preset locally via `.env.local`
- Makes the project truly multi-locale

---

## Git History Concerns

**Problem:** Even after changing files, git history contains the old values.

**Solutions:**

### Option 1: Accept It
- Old commits show personal info
- Only new commits are anonymized
- Good enough for public open-source

### Option 2: Fresh Start
- Create new repo from current state
- Lose git history
- Clean slate

### Option 3: Git Filter (Advanced)
```bash
git filter-branch --tree-filter '
  find . -type f -exec sed -i "s/PELCO/ElectricCoB/g" {} \;
' --all
```

**WARNING:** This rewrites entire git history. Dangerous.

---

## Recommendation

### Minimal Anonymization (2-3 hours)
1. Fix seed data (`src/lib/db/seed.ts`)
2. Update README.md examples
3. Make locale/currency configurable
4. Create `.env.example`
5. Update public-facing pages

### Full Anonymization (1-2 days)
1. All of minimal +
2. All documentation files
3. Architecture docs
4. Test scenarios
5. Code comments
6. Create feature flags for locale

### My Suggestion
Start with **minimal anonymization** for the code that actually runs. Documentation can be anonymized later or kept internal.

---

## Testing After Anonymization

After making changes, verify:

```bash
# Search for any remaining personal references
grep -r "PELCO" --exclude-dir={node_modules,.git}
grep -r "MERALCO" --exclude-dir={node_modules,.git}
grep -r "Magalang" --exclude-dir={node_modules,.git}
grep -r "devfamily" --exclude-dir={node_modules,.git}
grep -r "Quezon" --exclude-dir={node_modules,.git}

# Check that app still runs
npm run dev

# Check that seed script works
npx tsx src/lib/db/seed.ts
```

---

## Conclusion

**Total References Found:**
- **PELCO:** ~50+ references across docs
- **MERALCO:** ~30+ references
- **QC/Quezon City:** ~40+ references
- **Magalang:** ~60+ references
- **Dev Family:** 5 references
- **Philippine context:** 100+ references

**Estimated Time:**
- Automated script: 30 minutes to write/test
- Manual review: 2-4 hours
- Testing: 1 hour
- **Total: 4-6 hours** for thorough anonymization

**Next Steps:**
1. Decide: Minimal vs Full anonymization?
2. Create backup branch
3. Run automated replacements
4. Manual review
5. Test thoroughly
6. Commit changes

Would you like me to proceed with any of these changes?
