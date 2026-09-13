
import { readFileSync, writeFileSync } from "node:fs";

function load(path) {
  return JSON.parse(readFileSync(path, "utf-8"));
}

const listings = load("data/listings.json");
const projects = load("data/projects.json");

function median(arr) {
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// ---------------------------------------------------------------
// 1. Per-website area stats — confirm the magichomes sqm hypothesis
// ---------------------------------------------------------------
console.log("=".repeat(70));
console.log("PER-WEBSITE AREA STATS (confirm unit bug scope)");
console.log("=".repeat(70));
const byWebsite = {};
for (const l of listings) {
  (byWebsite[l.website] ??= []).push(l);
}
for (const [site, group] of Object.entries(byWebsite)) {
  const areas = group.map((l) => l.carpet_area).filter((a) => a != null);
  const ratios = group
    .filter((l) => l.carpet_area && l.super_built_up_area)
    .map((l) => l.super_built_up_area / l.carpet_area);
  console.log(
    `${site.padEnd(12)} n=${group.length.toString().padEnd(4)} ` +
      `avg_carpet_area=${mean(areas).toFixed(0).padEnd(6)} ` +
      `median_carpet_area=${median(areas).toFixed(0).padEnd(6)} ` +
      `avg_superbuilt/carpet_ratio=${mean(ratios).toFixed(3)}`
  );
}
console.log(
  "\nIf one site's avg_carpet_area is ~10x smaller than the others but the ratio " +
    "column is similar across all sites, that site is recording area in sqm, not sqft."
);

// ---------------------------------------------------------------
// 2. Project price unit bug — find the crore-vs-rupee split
// ---------------------------------------------------------------
console.log("\n" + "=".repeat(70));
console.log("PROJECT PRICE_MAX DISTRIBUTION (find the crore/rupee bug)");
console.log("=".repeat(70));
const sortedByMax = [...projects].sort((a, b) => a.price_max - b.price_max);
console.log("10 smallest price_max values:");
for (const p of sortedByMax.slice(0, 10)) {
  console.log(`  ${p.project_id}: price_max=${p.price_max}, price_min=${p.price_min}`);
}
console.log("10 largest price_max values:");
for (const p of sortedByMax.slice(-10)) {
  console.log(`  ${p.project_id}: price_max=${p.price_max}, price_min=${p.price_min}`);
}


const CRORE_THRESHOLD = 100000;
const suspectedCroreProjects = projects.filter((p) => p.price_max < CRORE_THRESHOLD);
console.log(`\nProjects with price_max < ${CRORE_THRESHOLD} (suspected crore units): ${suspectedCroreProjects.length}`);
for (const p of suspectedCroreProjects) {
  console.log(`  ${p.project_id}: price_max=${p.price_max} -> if crore, = ${p.price_max * 1e7} rupees`);
}

const normalizedProjects = projects.map((p) => ({
  ...p,
  price_max_normalized: p.price_max < CRORE_THRESHOLD ? p.price_max * 1e7 : p.price_max,
}));
const costliestNormalized = normalizedProjects.reduce((max, p) =>
  p.price_max_normalized > (max?.price_max_normalized ?? -Infinity) ? p : max, null);
console.log(
  `\nCostliest project AFTER normalizing suspected crore values: ` +
    `${costliestNormalized.project_id}, price_max_inr=${costliestNormalized.price_max_normalized} ` +
    `(raw stored value was ${costliestNormalized.price_max})`
);

// ---------------------------------------------------------------
// 3. Refine fake-listing candidates with price-per-sqft comparison
// ---------------------------------------------------------------
console.log("\n" + "=".repeat(70));
console.log("REFINED Q9 CANDIDATES — suspicious contact + suspiciously cheap");
console.log("=".repeat(70));

function correctedCarpetArea(l) {
  return l.website === "magichomes" ? l.carpet_area * 10.764 : l.carpet_area;
}

const peerGroups = {};
for (const l of listings) {
  if (!l.carpet_area || !l.price) continue;
  const key = `${l.locality}|${l.bedroom}`;
  const pricePerSqft = l.price / correctedCarpetArea(l);
  (peerGroups[key] ??= []).push(pricePerSqft);
}
const peerMedians = {};
for (const [key, arr] of Object.entries(peerGroups)) {
  peerMedians[key] = median(arr);
}

const byContact = {};
for (const l of listings) {
  if (!l.posted_by_contact) continue;
  (byContact[l.posted_by_contact] ??= []).push(l);
}

const refinedFakeCandidates = [];
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
    details.push({ listing_id: l.listing_id, price_per_sqft: Math.round(pricePerSqft), peer_median: Math.round(peerMed), ratio: ratio.toFixed(2) });
  }
  if (distinctNames.size >= 3 || belowPeerCount >= 2) {
    refinedFakeCandidates.push({
      contact,
      listing_count: group.length,
      distinct_names: distinctNames.size,
      below_peer_price_count: belowPeerCount,
      listing_ids: group.map((l) => l.listing_id),
      details,
    });
  }
}
refinedFakeCandidates.sort((a, b) => (b.distinct_names + b.below_peer_price_count) - (a.distinct_names + a.below_peer_price_count));

console.log(`Found ${refinedFakeCandidates.length} contacts flagged by (>=3 distinct names) OR (>=2 listings priced <60% of peer median):`);
for (const c of refinedFakeCandidates.slice(0, 15)) {
  console.log(
    `  ${c.contact}: ${c.listing_count} listings, ${c.distinct_names} names, ${c.below_peer_price_count} priced <60% of local peer median`
  );
  for (const d of c.details) {
    console.log(`      ${d.listing_id}: price/sqft=${d.price_per_sqft} vs peer median=${d.peer_median} (ratio ${d.ratio})`);
  }
}
writeFileSync("data/analysis/refined_fake_candidates.json", JSON.stringify(refinedFakeCandidates, null, 2));

// ---------------------------------------------------------------
// 4. Print full detail on ambiguous bedroom=0 corrupt candidates
// ---------------------------------------------------------------
console.log("\n" + "=".repeat(70));
console.log("FULL DETAIL — ambiguous bedroom=0 candidates (manual review)");
console.log("=".repeat(70));
const zeroBhkIds = ["SQU-6001628", "MAG-6000212"]; 
for (const id of zeroBhkIds) {
  const l = listings.find((x) => x.listing_id === id);
  if (l) console.log(JSON.stringify(l, null, 2));
}

console.log("\nDone.");