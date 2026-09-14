# Ivy Homes — Software Engineering Internship Assessment 

- **Candidate Name**: Suresh Choudhary
- **Email**: suresh.20233281@mnnit.ac.in
- **Repository**: [https://github.com/sureshchoudhary2003/Assignment_project_Ivy_Home](https://github.com/sureshchoudhary2003/Assignment_project_Ivy_Home)
- **Live Demo**: [https://assignment-project-ivy-home-5upm1blxe.vercel.app](https://assignment-project-ivy-home-5upm1blxe.vercel.app)

---

## 1. How to Run It

### Running the Web Frontend Locally
```bash
cd ivy-homes-frontend
npm install
npm run dev
```
### Production Build
```bash
cd ivy-homes-frontend
npm run build
npm run preview
```

### Prerequisites
- Node.js (v18 or higher)
- npm

### Data Ingestion & Analysis
From the root directory:
```bash
# 1. Pull the full dataset from API (requires credentials in .env)
node pull-data.js

# 2. Run analysis and generate submission.json
node generate_complete_submission.js
```

## 2. API Testing & Exploration (Postman Practice)

Before writing the application code, I tested all endpoints directly in Postman to understand how the API actually behaves.

### 1. Authentication Testing — `POST /auth/login`

- Discovered that sending `api_key` in the URL query parameters fails with `401 Unauthorized`.
- Verified that the API key must be sent using the `X-API-Key` request header.
- Tested the login payload and observed that `expires_in` is `900` seconds (15 minutes), which returns a `refresh_token`.

**Request:**

```http
POST /auth/login
X-API-Key: <YOUR_API_KEY>
Content-Type: application/json
```

**Example Payload:**

```json
{
  "email": "<EMAIL>",
  "password": "<PASSWORD>"
}
```

**Authentication Flow:**

```text
Login
  ↓
Access Token + Refresh Token
  ↓
Access Token expires after 15 minutes
  ↓
Refresh Token
  ↓
New Access Token
```

### 2. Session Refresh Testing — `POST /auth/refresh`

- Sent the `refresh_token` in Postman to confirm silent token renewal.
- This validation was completed before implementing the Axios interceptor.

**Request:**

```http
POST /auth/refresh
Content-Type: application/json
```

**Payload:**

```json
{
  "refresh_token": "<REFRESH_TOKEN>"
}
```

### 3. Endpoint Validation

The following endpoints were tested directly in Postman:

| Endpoint | Result | Observation |
|---|---|---|
| `GET /v1/analytics/summary` | `404 Not Found` | Endpoint unavailable |
| `GET /v1/favourites` | `404 Not Found` | Endpoint unavailable |
| `GET /v1/listing/{id}` | `404 Not Found` | Incorrect singular path |
| `GET /v1/listings/{id}` | `200 OK` | Correct plural path |
| `GET /v1/listings?limit=200` | `200 OK` | Server limits response to 50 records |

### 4. Pagination & API Limit

Testing `limit=200` revealed that the server strictly returns a maximum of **50 records** per request.

Pagination is handled using the `offset` parameter:

```http
GET /v1/listings?limit=50&offset=0
GET /v1/listings?limit=50&offset=50
GET /v1/listings?limit=50&offset=100
```

Therefore, the frontend uses the API's `offset`-based pagination instead of requesting more than 50 records at once.


## 3. I Worked Out  to Distrust 

Rather than accepting `API_REFERENCE.md` blindly, I pulled down all retrievable records — approximately **3,309 listings, 1,248 rentals, and 378 projects** — and programmatically verified response headers, status codes, pagination behavior, and structural distributions.

### Critical Discrepancies Found & Handled

#### 1. Authentication Header Requirement

- **Documented:** API key passed as a URL query parameter:

```http
POST /auth/login?api_key=<API_KEY>
```

- **Observed:** Server returned `401 Unauthorized` and rejected the query parameter.
- **Required:** API key must be sent using the `X-API-Key` request header.

```http
POST /auth/login
X-API-Key: <API_KEY>
```

- **Action Taken:** Configured an Axios request interceptor to automatically inject `X-API-Key` into outgoing API requests.

---

#### 2. Session Lifetimes & Refresh Token

- **Documented:** 24-hour access-token lifetime with no refresh flow.
- **Observed:** Access tokens expire after **900 seconds (15 minutes)** and the API provides a `refresh_token`.
- **Action Taken:** Implemented an Axios response interceptor that:

```text
API Request
    ↓
401 Unauthorized
    ↓
POST /auth/refresh
    ↓
Receive New Access Token
    ↓
Retry Failed Request
    ↓
Return Original Response
```

This allows the application to maintain the user's session without requiring them to log in again after the access token expires.

---

#### 3. Pagination Structure & Caps

- **Documented:** 1-indexed `page` parameter with `limit` up to 200.
- **Observed:** The server ignores `page` and uses `offset` for pagination.
- **Observed:** The server hard-caps the response at **50 records per request**.
- **Action Taken:** Implemented offset-based batching in both data analysis and the frontend UI.

```http
GET /v1/listings?limit=50&offset=0
GET /v1/listings?limit=50&offset=50
GET /v1/listings?limit=50&offset=100
```

---

#### 4. Missing Endpoints

The API documentation listed the following endpoints:

```text
GET     /v1/listing/{id}
GET     /v1/favourites
POST    /v1/favourites
GET     /v1/analytics/summary
```

However, testing revealed:

| Documented Endpoint | Observed Result | Resolution |
|---|---|---|
| `GET /v1/listing/{id}` | `404 Not Found` | Changed to `/v1/listings/{id}` |
| `GET /v1/favourites` | `404 Not Found` | Implemented client-side persistence |
| `POST /v1/favourites` | `404 Not Found` | Implemented client-side persistence |
| `GET /v1/analytics/summary` | `404 Not Found` | Calculated analytics from listings |

The working single-listing endpoint is:

```http
GET /v1/listings/{id}
```

---

#### 5. Unit Distortions

##### Carpet Area

Listings with the `MAG-` prefix (MagicHomes) return carpet area in **square meters**, while other listings return values in **square feet**.

The observed conversion factor was approximately **10.76**.

**Normalization:**

```text
Square Feet = Square Meters × 10.7639
```

Example:

```text
50 m² × 10.7639
≈ 538.20 sq ft
```

This normalization ensures that carpet-area values are comparable across different listing sources.

##### Project Prices

Some project prices below `1,000` are represented in **Crores**.

For example:

```text
5.66 = ₹5.66 Crore
```

Converted to INR:

```text
5.66 × 10,000,000
= ₹56,600,000
```

The UI therefore scales these values appropriately before displaying them to users.

---

## 4. I Checked That Turned Out to Be Fine

Not every undocumented behavior turned out to be a problem. I also tested several hypotheses and confirmed that the API data was behaving correctly.

### 1. Geographic Coordinates Validity

**Hypothesis:** Sellers might have scrambled coordinates across different localities.

**Result:** Apart from isolated corrupt records — for example, `ZER-6001341` with coordinates outside India — the coordinates mapped cleanly to legitimate Bengaluru localities such as:

- Whitefield
- Koramangala
- Indiranagar

**Conclusion:** Geographic coordinates were generally reliable and did not require broad normalization.

---

### 2. Rental Deposit-to-Rent Ratios

**Hypothesis:** Security deposits might have incorrect units, swapped values, or additional trailing zeroes.

**Result:** Deposits consistently fell within the expected **5×–10× monthly rent** range commonly observed for Bengaluru residential rentals.

**Conclusion:** Rental deposit values appeared structurally consistent.

---

### 3. High-Throughput Rate Limiting

**Hypothesis:** The advertised **1,200 requests/minute** rate limit might fail when fetching records rapidly.

**Result:** Sequentially retrieving all collections required approximately **150 requests** and completed without receiving a single:

```http
429 Too Many Requests
```

**Conclusion:** The observed request volume remained within the server's effective rate limits during testing.

---

## 5. I Would Do With Another Two Days

If additional development time were available, the following improvements would be prioritized.

### 1. Interactive Geospatial Mapping

Integrate **Leaflet** or **MapLibre** to provide:

- Interactive property maps
- Clustered property markers
- Locality boundary overlays
- Map-based property exploration
- Location-aware filtering

---

### 2. Virtual Windowing

Use `@tanstack/react-virtual` to efficiently render thousands of properties.

```text
Without Virtualization
Thousands of records
        ↓
Thousands of DOM nodes
        ↓
Higher memory usage
        ↓
Slower scrolling

With Virtualization
Thousands of records
        ↓
Only visible rows rendered
        ↓
Lower DOM memory usage
        ↓
Smoother scrolling
```

This would improve frontend performance when browsing large property collections.

---

### 3. Automated E2E Session Testing

Add **Playwright** test suites covering authentication and token expiration scenarios.

Example flow:

```text
Login
  ↓
Receive Access Token
  ↓
Simulate Token Expiration
  ↓
API Request → 401
  ↓
Refresh Token
  ↓
Receive New Access Token
  ↓
Retry Original Request
  ↓
Request Succeeds
```

Additional tests would cover network failures, invalid refresh tokens, and concurrent API requests during token renewal.

---

### 4. Offline Sync & Service Worker

Introduce **IndexedDB** and a Service Worker to cache recently viewed properties.

Potential flow:

```text
User Browses Properties
        ↓
API Response
        ↓
Store Data in IndexedDB
        ↓
User Goes Offline
        ↓
Load Cached Properties
        ↓
Instant Offline Re-render
```

This would improve perceived performance and provide a better experience on unstable network connections.

---

## Summary

The implementation was driven by **observed API behavior rather than documentation alone**.

The API was systematically tested to identify differences between the documented contract and the actual server behavior. These findings directly influenced the application's:

- Authentication architecture
- Axios interceptors
- Token refresh mechanism
- Pagination strategy
- Endpoint selection
- Data normalization
- Favorites implementation
- Analytics implementation
- Frontend performance decisions

This approach helped ensure that the application was built against the **real API contract**, rather than relying solely on potentially outdated documentation.
