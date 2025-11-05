# Physiosmetic (Expo React Native App)

## 0. App Overview
- Platform: Expo React Native (TypeScript), works on iOS + Android.
- Business: Physiotherapy & Aesthetic Clinic + Sports Performance Studio.
- Goal:
  - User can browse services:
    - Sports Performance Studio
    - Physio Care
    - Skin Care
    - Hair Care
    - Body Care
    - Nutrition Care
  - User can browse products and available appointment slots without login.
  - Login is only required when user tries to:
    - book appointment
    - start online consultation
    - buy a product (checkout)

- Future Goal (MCP Assistant):
  - In-app AI assistant called "Physiosmetic Assistant".
  - The assistant can answer questions like:
    - "Kal evening me knee physio slot available hai?"
    - "PRP session kis specialist ke sath hota hai?"
    - "Back brace stock me hai?"
  - Assistant talks safely to backend through MCP (not directly to database).

---

## 1. Core Screens / Features (Tabs)
Main bottom tab bar will have 4 tabs:
1. Home
2. Services
3. Shop
4. Account

### Home Screen
- Clinic branding and "Mumbai’s First Holistic and Sports Studio".
- Working hours (10:00 am – 07:00 pm) and location/CTA.
- Big quick actions:
  - Book Physio Care
  - Sports Performance Studio
  - Skin / Hair / Body Aesthetic Care
  - Online Consultation
  - Shop Products
- (Future) CTA: "Chat with Physiosmetic Assistant" (AI).

### Services Screen
- Shows 6 categories:
  1. Sports Performance Studio
     - Injury Prevention Programme
     - Elite Athlete Training
     - Functional / High Velocity / Recreational Training
     - Advanced Sports Rehabilitation
     - Sports Specific Exercise
     - Manual Therapy
     - Cryotherapy
  2. Physio Care
     - Musculoskeletal & Orthopaedic
     - Cardiovascular Rehab
     - Pulmonary Rehab
     - Clinical Electrophysiology
     - Geriatric
     - Integumentary
     - Neurological
     - Women’s Health
     - Postural Care & Ergonomics
  3. Skin Care
     - Acne Treatment
     - Anti Aging
     - Pigmentation Treatment
     - Skin Polishing
     - Scar Revision
     - Laser Hair Reduction
     - Therapeutic Facials
  4. Hair Care
     - Hair Loss Treatment
     - Mesotherapy
     - Hair Root Therapy with Mesoporation
     - PRP (Platelet Rich Plasma)
  5. Body Care
     - Weight Loss
     - Non-invasive Lipolysis
     - Detoxification Therapy
     - Vaginal Rejuvenation
  6. Nutrition Care
     - Lifestyle Modification
     - Diet Counselling

- On tap of any service:
  - Open ServiceDetailScreen:
    - Description
    - Who treats (Sports Physio / Aesthetic Specialist / Nutritionist etc.)
    - Duration, starting price
    - Button: "Book This Service"

### Booking Flow Screens
1. Choose Service
2. Choose Specialist / Therapist
3. Choose Date
4. Choose Time Slot
5. Confirm Booking

Rules:
- If user is not logged in and taps Confirm:
  - App shows login/signup first.
- If user is logged in:
  - We create `appointments` row in Supabase.
  - We mark the chosen slot as booked.

### Online Session / Tele-Consult
- Some services allow online consult (`is_online_allowed = true`).
- After booking, "My Appointments" will show session info (time, instructions, video link).
- This comes later (Phase 2/3 of booking, not MVP day 1).

### Shop Screen
- Show clinic products:
  - rehab tools (bands, braces, hot/cold packs)
  - skin / aesthetic products
  - posture / health support products
- Product detail:
  - images
  - price
  - "Add to Cart"
- Checkout flow:
  - If guest → must log in
  - If logged in → create order + order_items rows in Supabase
  - (Payments provider like Stripe/Razorpay is optional future)

### Account Screen
If logged in:
- My Appointments
- My Orders
- (Future) My Rehab / Recovery Plan
- Contact Clinic / WhatsApp / Call / Directions
- Logout

If guest:
- "Sign In / Create Account"
- Message: "Track appointments, get your recovery plan, and manage orders."

---

## 2. Auth Rules / Access Logic
- Guest can browse all services, products, and preview times.
- Guest cannot finalize booking or checkout.
- Login is forced ONLY at final confirm.
- We'll keep global session store:
  - isLoggedIn: boolean
  - userId: string | null
- Before protected actions we check:
  - if (!isLoggedIn) { openLoginModal() }

This matches clinic policy: "Login only at the point of commitment."

---

## 3. Tech Stack
### Frontend
- Expo React Native (TypeScript)
- React Navigation (bottom tabs + stacks)
- Zustand or Context for auth/cart state
- Supabase JS client for data (services, slots, products, etc.)
- Optional: nativewind/Tailwind-style styling for speed
- Icons: @expo/vector-icons

### Backend
- Supabase:
  - Auth (email/password)
  - Postgres DB
  - Row Level Security (each patient can only see their own appointments/orders)
  - Storage (therapist photos, product photos)
  - Edge Functions later for atomic booking

### MCP (Future AI layer)
- MCP server = secure gateway between AI assistant and Supabase.
- Mobile app will NOT expose Supabase secret keys.
- MCP can answer:
  - available slots
  - which service is good for knee pain
  - product availability
- MCP can never silently book without user confirm.

---

## State Management → Zustand
- We use Zustand for lightweight global state.
- Stores live under `src/store/`.
- Session store: `useSessionStore`
  - `isLoggedIn: boolean`
  - `user: { id?: string; name?: string } | null`
  - `login(user)` / `logout()`
- Cart store: `useCartStore`
  - `items: Array<{ id: string; name: string; price: number; qty: number }>`
  - `addItem(item)` / `removeItem(itemId)` / `clearCart()`
  - `total(): number` derived getter

Example usage:
```ts
import { useSessionStore } from './src/store/useSessionStore';
import { useCartStore } from './src/store/useCartStore';

const isLoggedIn = useSessionStore((s) => s.isLoggedIn);
const addItem = useCartStore((s) => s.addItem);
```

---

## 4. Project Structure (Expo)
We will create this structure in /src:

src/
  config/
    supabaseClient.ts
    env.ts
    clinicConstants.ts
  types/
    Service.ts
    Therapist.ts
    AvailabilitySlot.ts
    Appointment.ts
    Product.ts
    Order.ts
    OrderItem.ts
    UserProfile.ts
  services/
    authService.ts
    serviceCatalogService.ts
    bookingService.ts
    productService.ts
    orderService.ts
    mcpServiceStub.ts
  store/
    useSessionStore.ts
    useCartStore.ts
  navigation/
    AppTabs.tsx
    RootNavigator.tsx
  screens/
    Home/
      HomeScreen.tsx
    Services/
      ServicesScreen.tsx
      ServiceDetailScreen.tsx
      CategorySection.tsx
    Booking/
      BookingFlowScreen.tsx
      SelectTherapistScreen.tsx
      SelectDateScreen.tsx
      SelectTimeSlotScreen.tsx
    Shop/
      ShopScreen.tsx
      ProductDetailScreen.tsx
      CartScreen.tsx
    Account/
      AccountScreen.tsx
      MyAppointmentsScreen.tsx
      MyOrdersScreen.tsx
    Auth/
      SignInScreen.tsx
      SignUpScreen.tsx
  components/
    ServiceCard.tsx
    ProductCard.tsx
    SectionHeader.tsx
    CTAButton.tsx
  utils/
    formatPrice.ts
    formatDate.ts
    requireLoginGuard.ts

---

## 5. Supabase Data Model
Tables required in Supabase:

- profiles
  - id (uuid, same as auth.users.id)
  - full_name
  - phone
  - role (patient / staff / admin)
  - created_at

- services
  - id
  - name
  - category ("Sports Performance Studio" | "Physio Care" | "Skin Care" | "Hair Care" | "Body Care" | "Nutrition Care")
  - description
  - duration_minutes
  - base_price
  - is_online_allowed
  - is_active
  - image_url

- therapists
  - id
  - name
  - speciality
  - about
  - photo_url
  - is_active

- availability_slots
  - id
  - therapist_id (FK therapists.id)
  - service_id (FK services.id)
  - date
  - start_time
  - end_time
  - is_booked

- appointments
  - id
  - user_id (FK profiles.id)
  - service_id
  - therapist_id
  - slot_id
  - status ("booked","completed","cancelled")
  - notes
  - created_at

- products
  - id
  - name
  - description
  - price
  - image_url
  - category
  - in_stock

- orders
  - id
  - user_id (FK profiles.id)
  - total_amount
  - status ("placed","shipped","delivered","cancelled")
  - created_at

- order_items
  - id
  - order_id (FK orders.id)
  - product_id (FK products.id)
  - qty
  - price_each

Security:
- Row Level Security so each patient only sees their own `appointments`, `orders`, `order_items`.

---

## 6. Build Phases
1. Navigation + 4 tabs (Home / Services / Shop / Account) with dummy text.
2. ServicesScreen with categories and ServiceDetailScreen with "Book This Service".
3. Connect Supabase: fetch services/products live.
4. Auth & Session (SignIn / SignUp, AccountScreen changes if logged).
5. Booking flow (select therapist/date/slot → confirm → save appointment).
6. Shop with cart, orders table, checkout requires login.
7. MCP hook stub (mcpServiceStub.ts) for future AI assistant.
8. Branding polish (clinic hours, WhatsApp link, call clinic, etc.).

### Smoke Path (Rescue Rebuild)
Follow this to validate the booking flow end‑to‑end:

1) Seed availability for next 14 days

```
supabase db execute -f scripts/reset_test_data.sql
npm run seed:avail
```

2) In the app:
- Tab: Services → pick any service → Book This Service → pick any listed date (including >+2 days) → pick a slot.
- The Continue button becomes enabled after selecting a slot. Confirm booking.

3) Try to double‑book the same date+time (choose another service/therapist for the same timestamp):
- App blocks with a clear toast: “You already have an appointment at this time.”

4) Cancel the appointment:
- From Home → “Your Next Appointment” card → Cancel, or from Account → My Appointments → Cancel.
- Slot reappears under the same date.

5) “Your Next Appointment” card on Home reflects live state and hides when none.

6) UI detail: On the time slot screen, the “Pick another date” link is aligned under the slot list.
### Configure availability via JSON

You can seed therapist availability for the next 14 days from a JSON config.

1) Edit `config/availability.json` with defaults and optional therapist/service overrides:

```
{
  "defaults": { "timezone": "Asia/Dubai", "slotMinutes": 30, "hours": { "mon":["10:00-13:00","15:00-18:00"], "sun":[] } },
  "therapists": {
    "<THERAPIST_UUID_A>": { "services": { "<SERVICE_UUID_X>": { "hours": { "mon":["10:00-12:00"], "wed":["14:00-18:00"] } } }, "hours": { "mon":["10:00-18:00"] } }
  }
}
```

Rules: `therapist.services[serviceId].hours` override `therapist.hours`; which override `defaults.hours`. Empty array = closed.

2) Ensure DB has unique index for upsert: see `scripts/indexes.sql` (already applied).

3) Seed availability (requires env `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`):

```
npm run seed:avail
```

This generates slots for today → +13 days and upserts into `public.availability_slots` (conflict on therapist_id, service_id, date, start_time).

4) Reset test data (appointments and slots) then reseed:

```
supabase db execute -f scripts/reset_test_data.sql
npm run seed:avail
```

App uses only real `availability_slots` (is_booked=false) in production; dev-only fallback slots are hidden in prod.
