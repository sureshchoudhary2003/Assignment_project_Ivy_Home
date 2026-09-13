
import { writeFile, mkdir } from "node:fs/promises";
import { readFileSync, existsSync } from "node:fs";

// ---------- tiny .env loader (no dependency needed) ----------
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

// ---------- config ----------
const BASE_URL = process.env.IVY_BASE_URL || "https://solve.ivy.homes";
const API_KEY = process.env.IVY_API_KEY;
const EMAIL = process.env.IVY_EMAIL || "demo1@ivy.homes";
const PASSWORD = process.env.IVY_PASSWORD;
const PAGE_LIMIT = 200; // documented max

if (!API_KEY || !PASSWORD) {
  console.error(
    "Missing IVY_API_KEY or IVY_PASSWORD. Copy .env.example to .env and fill it in."
  );
  process.exit(1);
}

// ---------- auth state ----------
let accessToken = null;
let refreshToken = null;

async function login() {
  
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY,
    },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) {
    throw new Error(`Login failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  accessToken = data.access_token;
  refreshToken = data.refresh_token;
  console.log(
    `Logged in as ${EMAIL}. Token expires in ${data.expires_in}s.`
  );
}

async function refresh() {
  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY,
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) {
   
    console.log("Refresh failed, logging in again...");
    await login();
    return;
  }
  const data = await res.json();
  accessToken = data.access_token;
 
  if (data.refresh_token) refreshToken = data.refresh_token;
  console.log("Access token refreshed.");
}

async function authedFetch(url) {
  let res = await fetch(url, {
    headers: {
      "X-API-Key": API_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (res.status === 401) {
    await refresh();
    res = await fetch(url, {
      headers: {
        "X-API-Key": API_KEY,
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} ${await res.text()} (${url})`);
  }
  return res.json();
}

// ---------- generic offset/limit/has_more paginator ----------

async function fetchAll(endpointPath, label) {
  let offset = 0;
  let all = [];
  let total = null;
  let page = 0;

  while (true) {
    const url = `${BASE_URL}${endpointPath}?limit=${PAGE_LIMIT}&offset=${offset}`;
    const data = await authedFetch(url);
    total = data.total;
    all = all.concat(data.results);
    page += 1;
    console.log(
      `${label}: page ${page}, offset ${offset}, got ${data.results.length}, running total ${all.length}/${total}`
    );

    if (!data.has_more || data.results.length === 0) break;
    offset += PAGE_LIMIT;

    // safety valve so a pagination bug can't loop forever
    if (page > 500) {
      console.warn(`${label}: stopped after 500 pages as a safety limit.`);
      break;
    }
  }

  if (total !== null && all.length !== total) {
    console.warn(
      `${label}: WARNING — collected ${all.length} records but total reported ${total}. ` +
        `This mismatch is itself worth investigating as a pagination finding.`
    );
  }

  return all;
}

async function main() {
  await mkdir("data", { recursive: true });
  await login();

  const listings = await fetchAll("/v1/listings", "listings");
  await writeFile("data/listings.json", JSON.stringify(listings, null, 2));
  console.log(`Saved ${listings.length} listings to data/listings.json\n`);

  const rentals = await fetchAll("/v1/rentals", "rentals");
  await writeFile("data/rentals.json", JSON.stringify(rentals, null, 2));
  console.log(`Saved ${rentals.length} rentals to data/rentals.json\n`);

  const projects = await fetchAll("/v1/projects", "projects");
  await writeFile("data/projects.json", JSON.stringify(projects, null, 2));
  console.log(`Saved ${projects.length} projects to data/projects.json\n`);

  console.log("Done. Raw data saved under ./data/");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});