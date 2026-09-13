

import { readFileSync, writeFileSync } from "node:fs";

function load(path) {
  return JSON.parse(readFileSync(path, "utf-8"));
}
function median(arr) {
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const listings = load("data/listings.json");
const unitMismatchCandidates = load("data/analysis/unit_mismatch_candidates.json");
const duplicateCandidates = load("data/analysis/duplicate_candidates.json");

const confirmedCorrectionIds = new Set();
for (const c of unitMismatchCandidates) {
  const ratio = c.sqm_to_sqft_estimate / c.peer_median;
  if (ratio >= 0.7 && ratio <= 1.3) {
    confirmedCorrectionIds.add(c.listing_id);
  }
}
console.log(`Confirmed per-record area corrections: ${confirmedCorrectionIds.size} listings`);
console.log([...confirmedCorrectionIds].slice(0, 10).join(", "), "...\n");

function correctedCarpetArea(l) {
  return confirmedCorrectionIds.has(l.listing_id) ? l.carpet_area * 10.764 : l.carpet_area;
}

// ---------------------------------------------------------------
// Updated Q4 rule: bedroom===0 AND bathroom===0 AND property_type != plot
// ---------------------------------------------------------------
console.log("=".repeat(70));
console.log("Q4 FINAL — corrupt listing candidates (refined rule)");
console.log("=".repeat(70));

const corruptFinal = new Set();
for (const l of listings) {
  if (l.carpet_area != null && l.super_built_up_area != null && l.carpet_area > l.super_built_up_area) {
    corruptFinal.add(l.listing_id);
  }
  if (l.total_floors > 0 && l.floor > l.total_floors) {
    corruptFinal.add(l.listing_id);
  }
  if (l.price <= 0) corruptFinal.add(l.listing_id);
  if (l.carpet_area <= 0) corruptFinal.add(l.listing_id);
  if (l.bedroom === 0 && l.bathroom === 0 && l.property_type !== "plot") {
    corruptFinal.add(l.listing_id);
  }
  if (l.latitude != null && (l.latitude < 6 || l.latitude > 38)) corruptFinal.add(l.listing_id);
  if (l.longitude != null && (l.longitude < 68 || l.longitude > 98)) corruptFinal.add(l.listing_id);
}
const corruptSorted = [...corruptFinal].sort();
console.log(`Total: ${corruptSorted.length}`);
console.log(corruptSorted.join(", "));
writeFileSync("data/analysis/final_corrupt_ids.json", JSON.stringify(corruptSorted, null, 2));

// ---------------------------------------------------------------
// Corrected Q9 — using PER-RECORD area correction, not blanket website
// ---------------------------------------------------------------
console.log("\n" + "=".repeat(70));
console.log("Q9 CORRECTED — fake listing candidates (per-record area fix)");
console.log("=".repeat(70));

const peerGroups = {};
for (const l of listings) {
  if (!l.carpet_area || !l.price) continue;
  const key = `${l.locality}|${l.bedroom}`;
  const pricePerSqft = l.price / correctedCarpetArea(l);
  (peerGroups[key] ??= []).push(pricePerSqft);
}
const peerMedians = {};
for (const [key, arr] of Object.entries(peerGroups)) peerMedians[key] = median(arr);

const byContact = {};
for (const l of listings) {
  if (!l.posted_by_contact) continue;
  (byContact[l.posted_by_contact] ??= []).push(l);
}

const finalFakeCandidates = [];
for (const [contact, group] of Object.entries(byContact)) {
  if (group.length < 3) continue;
  const distinctNames = new Set(group.map((l) => l.posted_by_name));
  let belowPeerCount = 0;
  const details = [];
  for (const l of group) {
    const key = `${l.locality}|${l.bedroom}`;
    const peerMed = peerMedians[key];
    if (!peerMed || !l.carpet_area || !l.price) continue;
    const pricePerSqft = l.price / correctedCarpetArea(l);
    const ratio = pricePerSqft / peerMed;
    if (ratio < 0.6) belowPeerCount++;
    details.push({
      listing_id: l.listing_id,
      corrected: confirmedCorrectionIds.has(l.listing_id),
      price_per_sqft: Math.round(pricePerSqft),
      peer_median: Math.round(peerMed),
      ratio: ratio.toFixed(2),
    });
  }
  if (distinctNames.size >= 3 || belowPeerCount >= 2) {
    finalFakeCandidates.push({
      contact,
      listing_count: group.length,
      distinct_names: distinctNames.size,
      below_peer_price_count: belowPeerCount,
      listing_ids: group.map((l) => l.listing_id),
      details,
    });
  }
}
finalFakeCandidates.sort((a, b) => (b.distinct_names + b.below_peer_price_count) - (a.distinct_names + a.below_peer_price_count));

console.log(`Found ${finalFakeCandidates.length} flagged contacts (after fixing the area-correction bug):`);
for (const c of finalFakeCandidates.slice(0, 15)) {
  console.log(`  ${c.contact}: ${c.listing_count} listings, ${c.distinct_names} names, ${c.below_peer_price_count} priced <60% of peer median`);
  for (const d of c.details) {
    console.log(
      `      ${d.listing_id}${d.corrected ? " [area-corrected]" : ""}: price/sqft=${d.price_per_sqft} vs peer=${d.peer_median} (ratio ${d.ratio})`
    );
  }
}
writeFileSync("data/analysis/final_fake_candidates.json", JSON.stringify(finalFakeCandidates, null, 2));

// ---------------------------------------------------------------
// Q2 duplicate groups — add contact-number cross-check
// ---------------------------------------------------------------
console.log("\n" + "=".repeat(70));
console.log("Q2 DUPLICATE GROUPS — with contact-number cross-check");
console.log("=".repeat(70));

const listingById = Object.fromEntries(listings.map((l) => [l.listing_id, l]));
let highConfidence = 0;
for (const g of duplicateCandidates) {
  const contacts = new Set(g.listing_ids.map((id) => listingById[id]?.posted_by_contact));
  const sameContact = contacts.size === 1;
  if (sameContact) highConfidence++;
  console.log(
    `  ${g.listing_ids.join(", ")} | same contact: ${sameContact ? "YES (high confidence)" : "no (verify manually)"} | names: ${g.apartment_names.join(" / ")}`
  );
}
console.log(`\n${highConfidence} of ${duplicateCandidates.length} groups share the same contact number across all listings.`);

console.log("\nDone.");