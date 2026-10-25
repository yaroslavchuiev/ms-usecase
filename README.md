# Mindspace Location Dashboards

**Live demo:** https://ms-usecase.vercel.app/

**Repository:** https://github.com/yaroslavchuiev/ms-usecase

**Demo users:** pick one on the login page, no password.

## 1. Pitch

A space information monitor: one place to see how things are going inside a Mindspace building, using the data that already lives in Salesforce. It has two parts. **Reception** is the live view for the front desk: what is happening in the space today. **Manager & Sales** (the Location Stats tab) is the view over 7, 30 or 90 days: how the space is used and how sales are going. Teams get these insights without a Salesforce licence, and each person only sees the locations they have been given.

## 2. Architecture

What happens when someone opens Reception:

1. The browser asks for `/reception?location=warsaw`. `proxy.ts` checks the session cookie. No valid cookie means a redirect to `/login` (for `/api/*`, a 401).
2. The server renders the shared layout. It finds the user from the cookie, loads the location list (from Salesforce `Location__c` in live mode) and keeps only the locations the user's groups allow. This feeds the header picklist and tabs. A skeleton is streamed first, so the page is not blank while this runs.
3. The page runs in the browser and shows a skeleton. It calls `GET /api/reception?location=warsaw`.
4. The route checks the session (401) and then `authorise(user, location, role)` (403). Only then does it touch data.
5. The data layer works out "today" in the location's time zone, then fetches the records: Salesforce-format fixtures in mock mode, or a handful of SOQL queries in parallel in live mode. Live results are cached for 30 seconds.
6. Mappers turn the raw records into DTOs (`lib/dto.ts`) and the route returns JSON. The browser draws the panels. It asks again every 30 seconds, but not while the tab is hidden. If a refresh fails, it keeps the last data and shows a banner.

Other pages follow the same path. Stats makes one call per period choice. "My tasks" is a separate call every 60 seconds, because it belongs to the user, not the building. Adding a delivery or marking one collected is a write, followed by a reload.

```
Browser ──(JSON + session cookie)──► Next.js on Vercel ──(REST + OAuth token)──► Salesforce
         proxy.ts → route handler → authorise → data layer → mappers
```

The browser never talks to Salesforce. The token, the client secret and the org URL stay on the server, and the UI only sees DTOs, never Salesforce field names. Mock and live mode return the same shapes, so switching modes changes nothing in the UI.

| Route | Who | What |
|---|---|---|
| `GET /api/me` | signed in | user, allowed locations and roles |
| `GET /api/reception?location=` | `reception` role | the Reception data |
| `GET /api/stats?location=&range=` | `stats` role | the Stats data (`7d`, `30d`, `90d`) |
| `GET /api/tasks?location=` | `reception` role | the signed-in user's own tasks |
| `POST /api/deliveries?location=` | `reception` role | log a parcel |
| `PATCH /api/deliveries/<id>?location=` | `reception` role | mark a parcel collected |
| `POST /api/auth/login`, `/logout` | none | demo login |

Errors always look like `{ "error": "..." }`: 400 bad input, 401 no session, 403 no access, 404, 415 not JSON, 502 Salesforce unavailable.

## 3. Data model

Almost everything points to a location through `Location__c` (the exceptions are `Account` and the standard `Task`). Mock data uses exactly these API names and shapes (`records[].attributes`, 18-character IDs, `__r` relationships), and timestamps are generated relative to now.

| Object | Used for | Key fields | Access |
|---|---|---|---|
| `Location__c` | the buildings | `Name`, `Capacity__c`, `Time_Zone__c` | read |
| `Space__c` | desks, offices, rooms, event space | `Type__c`, `Capacity__c`, `Status__c`, `Location__c` | read |
| `Case` (record type *Building Incident*) | ongoing cases, incident stats | `Subject`, `Category__c`, `Priority`, `Status`, `CreatedDate`, `ClosedDate`, `SLA_Breached__c` | read |
| `Check_In__c` | who entered | `Type__c` (Member/Guest), `Contact__c` or `Guest_Name__c`, `Account__c`, `Check_In_Time__c` | read |
| `Booking__c` | room and event space bookings | `Space__c`, `Account__c`, `Start__c`, `End__c`, `Guest_Count__c` | read |
| `Tour__c` | sales tours | `Start__c`, `End__c`, `Prospect_Company__c`, `Host__c`, `Status__c`, `Signed_Date__c` | read |
| `Delivery__c` | parcels at reception | `Account__c`, `Carrier__c`, `Received_Time__c`, `Collected_Time__c`, `Status__c` | read and write |
| `Occupancy_Snapshot__c` | occupancy history | `Date__c`, `Occupied__c`, `Total__c` | read |
| `Account` / `Contract` | member companies and their contracts | `Name`; `StartDate`, `EndDate`, `Status`, `Location__c` | read |
| `Task` (standard) | "My tasks" | `Subject`, `ActivityDate`, `Priority`, `IsClosed`, `Owner.Email` | read |

Inside the app there are four simple entities: a **user** (id, name, email, groups), a **group** (`<role>-<location>`), a **location** (id, slug, name, time zone) and a **role** (`reception` or `stats`).

Check-ins only have an entry time, because the door system gives no check-out. Reception therefore shows a counter of entries, not "people in the building".

## 4. Environment variables

| Name | Purpose | Example | Required |
|---|---|---|---|
| `DATA_MODE` | `mock` = fixtures, `live` = real Salesforce | `mock` | no (default `mock`) |
| `SALESFORCE_INSTANCE_URL` | the org's My Domain URL (https only). Live mode calls it; in both modes it builds the "Open in Salesforce" links | `https://acme.my.salesforce.com` | live; optional in mock |
| `SF_API_VERSION` | Salesforce REST API version | `v62.0` | no (default `v62.0`) |
| `SF_CLIENT_ID` | External Client App key | `3MVG9...` | live |
| `SF_CLIENT_SECRET` | External Client App secret | `4E1F...` | live |
| `AUTH_MODE` | `placeholder` = demo login. `google` is not built yet | `placeholder` | yes |
| `AUTH_SECRET` | signs the session cookie, at least 16 characters | output of `openssl rand -base64 32` | yes |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `ALLOWED_DOMAIN` | Google sign-in. Nothing reads them yet | `123.apps.googleusercontent.com`, `GOCSPX-...`, `yourcompany.com` | later |

Locally: `cp .env.example .env.local`, set `AUTH_SECRET`, then `npm install && npm run dev`. On Vercel: *Project, Settings, Environment Variables*, then redeploy. `.env*` is git-ignored except `.env.example`, and no secret or org URL is in the code.

## 5. Code map

| Path | What it does |
|---|---|
| `proxy.ts` | session check before every page and API call (`middleware.ts` is called `proxy.ts` in Next.js 16) |
| `app/api/` | the route handlers |
| `app/(dashboard)/`, `app/login/` | Reception and Stats pages, shared layout, login |
| `lib/auth/` | demo users, signed cookie, `authorise()`, route guard |
| `lib/data/` | one function per dashboard: mock or live, cache, map to DTO, delivery writes |
| `lib/salesforce/` | OAuth token and REST client, SOQL queries, mappers, raw Salesforce types |
| `lib/mock/` | fixture generator and mock queries |
| `lib/dto.ts` | the response types the UI uses |
| `lib/` (rest) | `links.ts` useful links, `locations.ts`, `me.ts`, `cache.ts`, `time.ts` (time zones) |
| `components/` | header, panels, charts, dialogs, skeletons, polling hook |

## 6. Access model

A person gets access to a location by being in a group named `<role>-<location>`, for example `reception-warsaw` or `stats-krakow`. A group gives one role for one location, and nothing else gives access.

1. The server reads the user's groups and turns them into (location, role) pairs.
2. `/api/me` returns only those locations. The picklist and the Reception and Stats tabs are built from it.
3. Every API call checks the pair again on the server. The picklist is only convenience. If someone edits the location in the URL to one they are not allowed, the page replaces it with a location they can use, and the API answers 403 to any direct call.

| Demo user | Groups | Sees |
|---|---|---|
| Reception – Warsaw | `reception-warsaw` | Warsaw Reception |
| Manager – multi-location | `stats-warsaw`, `stats-krakow`, `reception-warsaw` | Warsaw Reception and Stats, Kraków Stats |
| Analyst – Tel Aviv | `stats-tel-aviv` | Tel Aviv Stats |

Today the demo groups are defined in `lib/auth/users.ts`. With Google sign-in, access is granted by adding the person to the matching Google Group.

## 7. Security

**How it is guarded now**
- Login sets a cookie that is signed (HMAC-SHA256 with `AUTH_SECRET`), HttpOnly, SameSite=Lax, Secure in production and valid for 8 hours. It holds only the user id; groups are looked up on every request.
- Two checks: `proxy.ts` rejects calls without a valid session, and each route runs `authorise()` for the location and role. Unknown locations also return 403, so nothing leaks.
- Salesforce code is `server-only`. The token, secret and org URL never reach the browser. The instance URL must be https.
- The server never trusts the client: "My tasks" uses the session email, a delivery's company and location are re-checked, and ids are validated. SOQL values are escaped or validated, and writes accept JSON only.
- Salesforce errors become a generic 502, with details only in the server log. Data responses are `no-store`.
- Weak points today: the demo login has no passwords, there is no rate limiting, and CSRF protection relies on SameSite plus JSON-only writes.

**With Google sign-in**
- Auth.js replaces the demo login and `AUTH_MODE=google` switches the placeholder login off. Google OAuth app type is *Internal*, so only the company's Workspace can sign in.
- The server checks the ID token itself: `email_verified` is true and the `hd` claim equals `ALLOWED_DOMAIN`. The `hd` request parameter alone is only a hint to Google.
- Groups come from Google Groups (Admin SDK Directory API, read-only, via a service account), cached for a few minutes. Removing someone from a group removes access within that time.
- Sessions use Auth.js's HttpOnly cookie. `authorise()` and every route stay unchanged, because they only need `{ id, email, groups }`.
- Workspace rules such as 2-step verification and account suspension then apply automatically.

## 8. What to change for go live

> *If I were connecting this to a real Salesforce org, what would I need to change, and what challenges would I expect?*

**Changes**
1. dedicated API-only user and an External Client App in SF. Give access to the objects above
2. Change .env `DATA_MODE=live`, `SALESFORCE_INSTANCE_URL`, `SF_CLIENT_ID` and `SF_CLIENT_SECRET`
3. Create Google app - configure secutiry and add google login so it would be accessable after Google login
4. Configure groups - reception/managers(for stats) and add people

**Open security point**

Move from client credentials to JWT bearer: a signed certificate request instead of a shared secret. More complex logic but might be too much for dashboard. Up for consideration based on a standard. 

**To keep in mind**
- **API limits.** stats are very API consuming since it fetches all data using queries.
  - Solution: cache stats every 3 hours - server can do it async without user intervention or once user goes to page - refresh with up-to-date data.
    1. every 3 hours async - more calls even if users is not looking
    2. on user login refresh - less calls - a little more waiting. system can show cached data and fetch new in background
- **Volume.** Stats pulls individual check-ins and bookings for 90 days, needs `GROUP BY` aggregates or snapshots.
- **Data to Salesforce.** 
  - if desks and check-ins are booked in other system - add sync to SF or change code to fetch data from them. 
  - Populate `Occupancy_Snapshot__c` with data from 3rdparty

**Not built yet:**
- Google sign-in
- UI
  - completing tasks
  - "more info" cases
  - "more info" meetings in agenda
  - "more info" in stats
