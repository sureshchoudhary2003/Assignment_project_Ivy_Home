
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const REFERENCE = new Date("2026-09-10T00:00:00+05:30");
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const WINDOW_START = new Date(REFERENCE.getTime() - SEVEN_DAYS_MS);

function load(path) {
  return JSON.parse(readFileSync(path, "utf-8"));
}

mkdirSync("data/analysis", { recursive: true });

const listings = load("data/listings.json");
const rentals = load("data/rentals.json");
const projects = load("data/projects.json");

console.log("=".repeat(70));
console.log("BASIC COUNTS");
console.log("=".repeat(70));
console.log(`Listings: ${listings.length}`);
console.log(`Rentals:  ${rentals.length}`);
console.log(`Projects: ${projects.length}`);

// ---------------------------------------------------------------
// Q3 candidate — is_live distribution
// ---------------------------------------------------------------
const liveCount = listings.filter((l) => l.is_live === true).length;
const notLiveCount = listings.filter((l) => l.is_live === false).length;
const missingIsLive = listings.length - liveCount - notLiveCount;
console.log("\n" + "=".repeat(70));
console.log("Q3 CANDIDATE — is_live distribution");
console.log("=".repeat(70));
console.log(`is_live true:  ${liveCount}`);
console.log(`is_live false: ${notLiveCount}`);
console.log(`missing/other: ${missingIsLive}`);

// ---------------------------------------------------------------
// Field presence / null check across listings
// ---------------------------------------------------------------
console.log("\n" + "=".repeat(70));
console.log("FIELD NULL/MISSING CHECK (listings)");
console.log("=".repeat(70));
const fieldKeys = new Set();
listings.forEach((l) => Object.keys(l).forEach((k) => fieldKeys.add(k)));
for (const key of [...fieldKeys].sort()) {
  const nullCount = listings.filter(
    (l) => l[key] === null || l[key] === undefined
  ).length;
  if (nullCount > 0) {
    console.log(`  ${key}: ${nullCount} null/missing out of ${listings.length}`);
  }
}

// ---------------------------------------------------------------
// Corrupt listing candidates (Q4) — physically impossible records
// ---------------------------------------------------------------
console.log("\n" + "=".repeat(70));
console.log("Q4 CANDIDATES — corrupt / physically impossible listings");
console.log("=".repeat(70));

const corruptCandidates = [];

function flagCorrupt(listing, reason) {
  corruptCandidates.push({ listing_id: listing.listing_id, reason });
}

for (const l of listings) {
  if (l.carpet_area != null && l.super_built_up_area != null) {
    if (l.carpet_area > l.super_built_up_area) {
      flagCorrupt(l, `carpet_area (${l.carpet_area}) > super_built_up_area (${l.super_built_up_area})`);
    }
  }
  if (l.total_floors > 0 && l.floor > l.total_floors) {
    flagCorrupt(l, `floor (${l.floor}) > total_floors (${l.total_floors})`);
  }
  if (l.price <= 0) flagCorrupt(l, `price <= 0 (${l.price})`);
  if (l.carpet_area <= 0) flagCorrupt(l, `carpet_area <= 0 (${l.carpet_area})`);
  if (l.bedroom < 0 || l.bathroom < 0) flagCorrupt(l, `negative bedroom/bathroom`);
  if (l.bedroom === 0 && l.property_type !== "plot") {
    flagCorrupt(l, `bedroom = 0 but property_type is "${l.property_type}", not plot`);
  }
  if (l.latitude != null && (l.latitude < 6 || l.latitude > 38)) {
    flagCorrupt(l, `latitude (${l.latitude}) outside India's bounds`);
  }
  if (l.longitude != null && (l.longitude < 68 || l.longitude > 98)) {
    flagCorrupt(l, `longitude (${l.longitude}) outside India's bounds`);
  }
}

console.log(`Found ${corruptCandidates.length} candidate issues (a listing may appear more than once):`);
for (const c of corruptCandidates.slice(0, 40)) {
  console.log(`  ${c.listing_id}: ${c.reason}`);
}
if (corruptCandidates.length > 40) console.log(`  ... and ${corruptCandidates.length - 40} more`);
writeFileSync("data/analysis/corrupt_candidates.json", JSON.stringify(corruptCandidates, null, 2));

// ---------------------------------------------------------------
// Unit-mismatch candidates — area suspiciously small for bedroom count
// ---------------------------------------------------------------
console.log("\n" + "=".repeat(70));
console.log("UNIT-MISMATCH CANDIDATES — area far below peers of same bedroom count");
console.log("=".repeat(70));

function median(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const byBedroom = {};
for (const l of listings) {
  if (l.bedroom == null || l.carpet_area == null) continue;
  (byBedroom[l.bedroom] ??= []).push(l);
}

const unitMismatchCandidates = [];
for (const [bhk, group] of Object.entries(byBedroom)) {
  const med = median(group.map((l) => l.carpet_area));
  for (const l of group) {
    if (l.carpet_area < med * 0.3) {
      unitMismatchCandidates.push({
        listing_id: l.listing_id,
        bedroom: Number(bhk),
        carpet_area: l.carpet_area,
        peer_median: med,
        sqm_to_sqft_estimate: Math.round(l.carpet_area * 10.764),
      });
    }
  }
}
console.log(`Found ${unitMismatchCandidates.length} candidates:`);
for (const c of unitMismatchCandidates) {
  console.log(
    `  ${c.listing_id}: ${c.bedroom}BHK, carpet_area=${c.carpet_area} vs peer median ${c.peer_median} ` +
      `(x10.764 => ${c.sqm_to_sqft_estimate}, ${c.sqm_to_sqft_estimate / c.peer_median < 1.3 && c.sqm_to_sqft_estimate / c.peer_median > 0.7 ? "MATCHES peers" : "still off"})`
  );
}
writeFileSync("data/analysis/unit_mismatch_candidates.json", JSON.stringify(unitMismatchCandidates, null, 2));

// ---------------------------------------------------------------
// Duplicate property candidates (Q2) — same physical property, multiple listing_ids
// ---------------------------------------------------------------
console.log("\n" + "=".repeat(70));
console.log("Q2 CANDIDATES — possible duplicate properties");
console.log("=".repeat(70));

function roundCoord(n, dp = 3) {
  return Math.round(n * 10 ** dp) / 10 ** dp;
}

const dupGroups = {};
for (const l of listings) {
  if (l.latitude == null || l.longitude == null) continue;
  const key = `${roundCoord(l.latitude)}|${roundCoord(l.longitude)}|${l.bedroom}`;
  (dupGroups[key] ??= []).push(l);
}

const duplicateCandidates = Object.entries(dupGroups)
  .filter(([, group]) => group.length > 1)
  .map(([key, group]) => ({
    key,
    listing_ids: group.map((l) => l.listing_id),
    apartment_names: [...new Set(group.map((l) => l.apartment_name))],
    websites: [...new Set(group.map((l) => l.website))],
  }));

console.log(`Found ${duplicateCandidates.length} coordinate+bedroom groups with more than one listing_id:`);
for (const g of duplicateCandidates.slice(0, 20)) {
  console.log(`  ${g.listing_ids.join(", ")} | names: ${g.apartment_names.join(" / ")} | sites: ${g.websites.join(", ")}`);
}
if (duplicateCandidates.length > 20) console.log(`  ... and ${duplicateCandidates.length - 20} more groups`);
writeFileSync("data/analysis/duplicate_candidates.json", JSON.stringify(duplicateCandidates, null, 2));

const totalDuplicateListings = duplicateCandidates.reduce((sum, g) => sum + g.listing_ids.length, 0);
const impliedUniqueIfAllReal = listings.length - totalDuplicateListings + duplicateCandidates.length;
console.log(
  `\nIf every one of these groups is truly one property: listings.length (${listings.length}) ` +
    `- duplicate records (${totalDuplicateListings}) + one per group (${duplicateCandidates.length}) ` +
    `= ${impliedUniqueIfAllReal} unique properties (rough, unverified estimate — inspect the groups first)`
);

// ---------------------------------------------------------------
// Fake listing candidates (Q9) — same contact number reused suspiciously
// ---------------------------------------------------------------
console.log("\n" + "=".repeat(70));
console.log("Q9 CANDIDATES — phone numbers reused across many listings");
console.log("=".repeat(70));

const byContact = {};
for (const l of listings) {
  if (!l.posted_by_contact) continue;
  (byContact[l.posted_by_contact] ??= []).push(l);
}

const suspiciousContacts = Object.entries(byContact)
  .filter(([, group]) => group.length > 2)
  .sort((a, b) => b[1].length - a[1].length);

console.log(`Found ${suspiciousContacts.length} contact numbers appearing on more than 2 listings:`);
for (const [contact, group] of suspiciousContacts.slice(0, 20)) {
  const localities = [...new Set(group.map((l) => l.locality))];
  const names = [...new Set(group.map((l) => l.posted_by_name))];
  console.log(
    `  ${contact}: ${group.length} listings, ${localities.length} localities, ${names.length} distinct names posted under it`
  );
}
writeFileSync(
  "data/analysis/suspicious_contacts.json",
  JSON.stringify(suspiciousContacts.map(([contact, group]) => ({
    contact,
    count: group.length,
    listing_ids: group.map((l) => l.listing_id),
    localities: [...new Set(group.map((l) => l.locality))],
    names: [...new Set(group.map((l) => l.posted_by_name))],
  })), null, 2)
);

// ---------------------------------------------------------------
// Project listing-count mismatch (Q10)
// ---------------------------------------------------------------
console.log("\n" + "=".repeat(70));
console.log("Q10 CANDIDATES — project total_listings vs actual count");
console.log("=".repeat(70));

const listingsByProject = {};
for (const l of listings) {
  if (!l.project_id) continue;
  (listingsByProject[l.project_id] ??= []).push(l);
}

let mismatchAllCount = 0;
let mismatchLiveOnlyCount = 0;
const projectMismatches = [];

for (const p of projects) {
  const actualAll = (listingsByProject[p.project_id] || []).length;
  const actualLiveOnly = (listingsByProject[p.project_id] || []).filter((l) => l.is_live).length;
  const mismatchAll = actualAll !== p.total_listings;
  const mismatchLive = actualLiveOnly !== p.total_listings;
  if (mismatchAll) mismatchAllCount++;
  if (mismatchLive) mismatchLiveOnlyCount++;
  if (mismatchAll || mismatchLive) {
    projectMismatches.push({
      project_id: p.project_id,
      declared_total_listings: p.total_listings,
      actual_all_listings: actualAll,
      actual_live_only_listings: actualLiveOnly,
    });
  }
}

console.log(`Projects where total_listings != count of ALL matching listings:  ${mismatchAllCount}`);
console.log(`Projects where total_listings != count of LIVE-ONLY matching listings: ${mismatchLiveOnlyCount}`);
console.log(`(Try both interpretations — the doc doesn't say whether total_listings should include inactive ones)`);
writeFileSync("data/analysis/project_mismatches.json", JSON.stringify(projectMismatches, null, 2));

// ---------------------------------------------------------------
// Q7 — costliest project
// ---------------------------------------------------------------
console.log("\n" + "=".repeat(70));
console.log("Q7 — costliest project");
console.log("=".repeat(70));
const costliest = projects.reduce((max, p) =>
  p.price_max > (max?.price_max ?? -Infinity) ? p : max, null);
console.log(`project_id: ${costliest.project_id}, price_max_inr: ${costliest.price_max}`);

// ---------------------------------------------------------------
// Q8 — listings in the 7 days before REFERENCE (treating posted_at as naive IST)
// ---------------------------------------------------------------
console.log("\n" + "=".repeat(70));
console.log("Q8 CANDIDATE — listings posted in [REFERENCE - 7d, REFERENCE)");
console.log("=".repeat(70));
console.log(`Window: ${WINDOW_START.toISOString()} to ${REFERENCE.toISOString()} (as UTC instants)`);
console.log(`Treating posted_at (no timezone suffix) as naive IST, per your /health finding.`);

function parseAsIST(naiveTimestamp) {

  return new Date(`${naiveTimestamp}+05:30`);
}

const last7Days = listings.filter((l) => {
  const d = parseAsIST(l.posted_at);
  return d >= WINDOW_START && d < REFERENCE;
});
console.log(`Candidate count: ${last7Days.length}`);
console.log(`(Sanity check this against a few individual posted_at values by hand before trusting it.)`);

// ---------------------------------------------------------------
// Timestamp sanity check — any records that DO have a timezone marker?
// ---------------------------------------------------------------
console.log("\n" + "=".repeat(70));
console.log("TIMESTAMP FORMAT CHECK");
console.log("=".repeat(70));
const withZ = listings.filter((l) => l.posted_at?.includes("Z")).length;
const withOffset = listings.filter((l) => /[+-]\d{2}:\d{2}$/.test(l.posted_at || "")).length;
const bare = listings.length - withZ - withOffset;
console.log(`posted_at with 'Z' suffix: ${withZ}`);
console.log(`posted_at with explicit offset: ${withOffset}`);
console.log(`posted_at bare (no timezone marker): ${bare}`);

console.log("\nDone. Candidate files written to data/analysis/*.json — inspect before trusting any of this.");