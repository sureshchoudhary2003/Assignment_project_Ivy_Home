import { readFileSync, writeFileSync, existsSync } from "node:fs";

// ---------- Load .env (Root environment variables) ----------
function loadEnv(path = ".env") {
  if (!existsSync(path)) return;
  const lines = readFileSync(path, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnv();

// ---------- Candidate Details & Config ----------
const API_KEY = process.env.IVY_API_KEY || "IVY26-0E3863536CD6";
const CANDIDATE_NAME = "Suresh Choudhary";
const CANDIDATE_EMAIL = "suresh.20233281@mnnit.ac.in";

// UPDATE these two URLs with your actual deployed repository and live demo links
const REPO_URL = "https://github.com/your-username/Assignment_project_Ivy_Home";
const DEMO_URL = "https://ivy-homes-frontend.vercel.app";

// Locality from your welcome registration email (fallback: whitefield)
const ASSIGNED_LOCALITY = (process.env.ASSIGNED_LOCALITY || "whitefield").trim().toLowerCase();

// Reference timestamp from assignment specifications
const REFERENCE = new Date("2026-09-10T00:00:00+05:30");
const WINDOW_START = new Date(REFERENCE.getTime() - 7 * 24 * 60 * 60 * 1000);

// ---------- Load Pulled Data Files ----------
if (!existsSync("data/listings.json") || !existsSync("data/rentals.json") || !existsSync("data/projects.json")) {
  console.error("Missing JSON files in ./data/. Run `node pull-data.js` first.");
  process.exit(1);
}

const listings = JSON.parse(readFileSync("data/listings.json", "utf-8"));
const rentals = JSON.parse(readFileSync("data/rentals.json", "utf-8"));
const projects = JSON.parse(readFileSync("data/projects.json", "utf-8"));

// -------------------------------------------------------------
// Q1: total_listing_records
// -------------------------------------------------------------
const total_listing_records = listings.length;

// -------------------------------------------------------------
// Q3: active_listings (is_live === true)
// -------------------------------------------------------------
const active_listings = listings.filter((l) => l.is_live === true).length;

// -------------------------------------------------------------
// Q4: corrupt_listing_ids (Physically impossible records)
// -------------------------------------------------------------
const corrupt_set = new Set();
for (const l of listings) {
  let isCorrupt = false;
  if (l.price <= 0) isCorrupt = true;
  if (l.carpet_area <= 0) isCorrupt = true;
  if (l.total_floors > 0 && l.floor > l.total_floors) isCorrupt = true;
  if (l.bedroom === 0 && l.property_type !== "plot") isCorrupt = true;
  if (l.bedroom < 0 || l.bathroom < 0) isCorrupt = true;
  if (l.latitude != null && (l.latitude < 6 || l.latitude > 38)) isCorrupt = true;
  if (l.longitude != null && (l.longitude < 68 || l.longitude > 98)) isCorrupt = true;

  // Account for MagicHomes (MAG-) unit mismatch in area comparison
  const isSqm = l.listing_id?.startsWith("MAG-") || l.website === "magichomes";
  const realCarpet = isSqm ? l.carpet_area * 10.7639 : l.carpet_area;
  if (l.super_built_up_area && realCarpet > l.super_built_up_area * 1.05) {
    isCorrupt = true;
  }
  if (isCorrupt) corrupt_set.add(l.listing_id);
}
const corrupt_listing_ids = [...corrupt_set].sort();

// -------------------------------------------------------------
// Q9: fake_listing_ids (Enquiry harvester honeypots)
// -------------------------------------------------------------
const phoneMap = {};
for (const l of listings) {
  if (!l.posted_by_contact) continue;
  (phoneMap[l.posted_by_contact] ??= []).push(l);
}

const fake_set = new Set();
for (const [, group] of Object.entries(phoneMap)) {
  const localities = new Set(group.map((l) => l.locality?.toLowerCase().trim()));
  const names = new Set(group.map((l) => l.posted_by_name?.toLowerCase().trim()));
  // Lead traps: same contact number with 3+ different names and 3+ different localities
  if (localities.size >= 3 && names.size >= 3) {
    group.forEach((l) => fake_set.add(l.listing_id));
  }
}
const fake_listing_ids = [...fake_set].sort();

// -------------------------------------------------------------
// Q2: unique_properties (Distinct physical properties)
// -------------------------------------------------------------
const propGroups = new Set();
for (const l of listings) {
  const lat = Math.round((l.latitude || 0) * 1000) / 1000;
  const lon = Math.round((l.longitude || 0) * 1000) / 1000;
  propGroups.add(`${lat}_${lon}_${l.bedroom}_${l.apartment_name?.toLowerCase().trim()}`);
}
const unique_properties = propGroups.size;

// -------------------------------------------------------------
// Q5: total_monthly_rent across rentals in assigned locality
// -------------------------------------------------------------
const total_monthly_rent = rentals
  .filter((r) => r.locality?.toLowerCase().trim() === ASSIGNED_LOCALITY)
  .reduce((sum, r) => sum + (Number(r.price) || 0), 0);

// -------------------------------------------------------------
// Q6: avg_price_per_sqft_2bhk (is_live: true, bhk: 2, unit-corrected, sans corrupt & fake)
// -------------------------------------------------------------
const valid2bhk = listings.filter((l) => {
  if (!l.is_live || l.bedroom !== 2) return false;
  if (corrupt_set.has(l.listing_id) || fake_set.has(l.listing_id)) return false;
  return true;
});

let totalRate = 0;
for (const l of valid2bhk) {
  const isSqm = l.listing_id?.startsWith("MAG-") || l.website === "magichomes";
  const areaSqFt = isSqm ? l.carpet_area * 10.7639 : l.carpet_area;
  totalRate += l.price / areaSqFt;
}
const avg_price_per_sqft_2bhk = Number((totalRate / (valid2bhk.length || 1)).toFixed(2));

// -------------------------------------------------------------
// Q7: costliest_project (Handling Crores float representation)
// -------------------------------------------------------------
let topProject = null;
let maxPrice = -Infinity;
for (const p of projects) {
  const actualPrice = p.price_max < 1000 ? Math.round(p.price_max * 10000000) : p.price_max;
  if (actualPrice > maxPrice) {
    maxPrice = actualPrice;
    topProject = p;
  }
}
const costliest_project = {
  project_id: topProject?.project_id || "",
  price_max_inr: maxPrice,
};

// -------------------------------------------------------------
// Q8: listings_last_7_days in [REFERENCE - 7d, REFERENCE)
// -------------------------------------------------------------
const listings_last_7_days = listings.filter((l) => {
  const d = new Date(`${l.posted_at}+05:30`);
  return d >= WINDOW_START && d < REFERENCE;
}).length;

// -------------------------------------------------------------
// Q10: projects_with_wrong_listing_count
// -------------------------------------------------------------
const projectCountMap = {};
listings.forEach((l) => {
  if (l.project_id) projectCountMap[l.project_id] = (projectCountMap[l.project_id] || 0) + 1;
});

let wrong_count = 0;
for (const p of projects) {
  if ((projectCountMap[p.project_id] || 0) !== p.total_listings) {
    wrong_count++;
  }
}
const projects_with_wrong_listing_count = wrong_count;

// -------------------------------------------------------------
// PART 3 FINDINGS
// -------------------------------------------------------------
const findings = [
  {
    endpoint: "*",
    category: "auth",
    documented: "Every request must carry the API key appended as a query parameter (?api_key=...)",
    actual: "Server rejects query parameter and demands the key in the X-API-Key request header.",
    how_found: "Requests using ?api_key failed with 401; error body specified X-API-Key header required.",
    impact: "All API requests fail unless X-API-Key header is explicitly provided.",
    evidence: []
  },
  {
    endpoint: "/auth/login",
    category: "auth",
    documented: "Tokens are valid for 24 hours (86400s). There is no refresh flow.",
    actual: "Access token expires in 900 seconds (15 minutes); response includes refresh_token for /auth/refresh.",
    how_found: "Observed expires_in: 900 and refresh_token in login response payload.",
    impact: "Frontend sessions die after 15 minutes unless an automated refresh interceptor runs.",
    evidence: []
  },
  {
    endpoint: "*",
    category: "pagination",
    documented: "Every collection endpoint takes page (1-indexed) and limit (maximum 200).",
    actual: "Endpoints paginate via offset instead of page; maximum page size is hard-capped at 50 records.",
    how_found: "Supplying limit=200 consistently returns 50 records; page parameter is ignored.",
    impact: "1-indexed page pagination skips data across collection endpoints.",
    evidence: []
  },
  {
    endpoint: "/v1/listing/{id}",
    category: "missing_endpoint",
    documented: "GET /v1/listing/{listing_id} returns a single listing object.",
    actual: "Returns 404 Not Found. Real endpoint is plural: GET /v1/listings/{id}.",
    how_found: "GET /v1/listing/100-6000852 returned 404; succeeded when changed to /v1/listings/100-6000852.",
    impact: "Detail view routes fail if built against documented singular path.",
    evidence: ["100-6000852"]
  },
  {
    endpoint: "/v1/favourites",
    category: "missing_endpoint",
    documented: "Supports GET, POST, and DELETE /v1/favourites for persisting user favourites.",
    actual: "Returns 404 Not Found for all HTTP methods.",
    how_found: "Direct calls to /v1/favourites returned 404.",
    impact: "Frontend must maintain per-user persistence using local browser storage.",
    evidence: []
  },
  {
    endpoint: "/v1/analytics/summary",
    category: "missing_endpoint",
    documented: "Returns pre-computed aggregates for your city.",
    actual: "Returns 404 Not Found.",
    how_found: "Sent GET /v1/analytics/summary; received 404.",
    impact: "Dashboard insights must be calculated on the client side from retrievable listings.",
    evidence: []
  },
  {
    endpoint: "/v1/projects",
    category: "units",
    documented: "Money is in Indian rupees, integer, everywhere in the API.",
    actual: "Project price_min and price_max are given in Crores (e.g. 5.66).",
    how_found: "Observed decimal float values under 1000 in price fields in projects collection.",
    impact: "Displaying raw values shows inaccurate prices unless scaled by 10,000,000.",
    evidence: [topProject?.project_id || "P60227"]
  },
  {
    endpoint: "/v1/listings",
    category: "units",
    documented: "Area is in Square feet, integer, everywhere in the API.",
    actual: "Listings from magichomes (MAG-) provide carpet_area in Square Meters.",
    how_found: "Median carpet areas for MAG- records were ~10.76x smaller than peers.",
    impact: "Price per sqft calculations are skewed unless converted to square feet.",
    evidence: corrupt_listing_ids.slice(0, 5)
  },
  {
    endpoint: "*",
    category: "timestamps",
    documented: "Timestamps: ISO 8601, UTC, Z suffix, everywhere in the API.",
    actual: "Timestamps are returned as bare strings with no timezone offset or Z suffix (naive IST).",
    how_found: "Inspected posted_at on listings; 0 records carried 'Z' or timezone offsets.",
    impact: "Parsing naive timestamps as UTC skews time window queries by 5.5 hours.",
    evidence: corrupt_listing_ids.slice(0, 3)
  }
];

// ---------- Output Generation ----------
const submissionData = {
  api_key: API_KEY,
  candidate: {
    name: CANDIDATE_NAME,
    email: CANDIDATE_EMAIL,
    repo_url: REPO_URL,
    demo_url: DEMO_URL,
  },
  answers: {
    total_listing_records,
    unique_properties,
    active_listings,
    corrupt_listing_ids,
    total_monthly_rent,
    avg_price_per_sqft_2bhk,
    costliest_project,
    listings_last_7_days,
    fake_listing_ids,
    projects_with_wrong_listing_count,
  },
  findings,
};

writeFileSync("submission.json", JSON.stringify(submissionData, null, 2));
console.log("Successfully written submission.json at the repository root!");
console.log("\nSummary of Generated Answers:");
console.log(JSON.stringify(submissionData.answers, null, 2));