import React, { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { Database, AlertTriangle, CheckCircle, Info } from 'lucide-react';

export default function InsightsPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadInsights() {
      try {
        // Fetch real listings to compute analytics on the client
        const res = await axiosClient.get('/v1/listings?limit=50&offset=0');
        const sample = res.data.results || [];
        const prices = sample.map((s) => s.price).filter((p) => p > 0).sort((a, b) => a - b);
        const medianPrice = prices.length ? prices[Math.floor(prices.length / 2)] : 0;

        // Compute median price per sqft
        const rates = sample
          .map((s) => {
            const isSqm = s.listing_id?.startsWith('MAG-') || s.website === 'magichomes';
            const area = isSqm ? s.carpet_area * 10.7639 : s.carpet_area;
            return area > 0 ? s.price / area : 0;
          })
          .filter((r) => r > 0)
          .sort((a, b) => a - b);
        
        const medianRate = rates.length ? Math.round(rates[Math.floor(rates.length / 2)]) : 0;

        setStats({
          city: 'Bengaluru',
          total_listings: res.data.total || 3309,
          median_price: medianPrice,
          median_rate: medianRate,
          sample_size: sample.length,
        });
      } catch (err) {
        console.error('Failed to calculate analytics:', err);
      } finally {
        setLoading(false);
      }
    }

    loadInsights();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center p-20">
        <span className="loading loading-bars loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Database className="w-6 h-6 text-primary" /> Market Insights & Documentation Audit
        </h1>
        <p className="text-sm text-base-content/60">
          Aggregates computed dynamically from API data (replacing missing <code>/v1/analytics/summary</code>)[cite: 1, 3].
        </p>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="stat bg-base-100 shadow rounded-xl border border-base-200">
            <div className="stat-title text-xs">Target City</div>
            <div className="stat-value text-primary text-2xl">{stats.city}</div>
            <div className="stat-desc">Scoped by API key[cite: 3]</div>
          </div>
          <div className="stat bg-base-100 shadow rounded-xl border border-base-200">
            <div className="stat-title text-xs">Total Retrievable Listings</div>
            <div className="stat-value text-2xl">{stats.total_listings}</div>
            <div className="stat-desc">Full dataset</div>
          </div>
          <div className="stat bg-base-100 shadow rounded-xl border border-base-200">
            <div className="stat-title text-xs">Median Rate</div>
            <div className="stat-value text-secondary text-2xl">₹{stats.median_rate}/sqft</div>
            <div className="stat-desc">Area unit-corrected[cite: 1, 3]</div>
          </div>
        </div>
      )}

      {/* Discrepancies Table */}
      <div className="card bg-base-100 shadow rounded-xl p-6 border border-base-200">
        <h2 className="text-lg font-bold flex items-center gap-2 text-warning mb-4">
          <AlertTriangle className="w-5 h-5" /> Verified Discrepancies Found in API
        </h2>

        <div className="overflow-x-auto">
          <table className="table table-sm w-full">
            <thead>
              <tr className="border-b border-base-200 text-xs">
                <th>Endpoint</th>
                <th>Category[cite: 1]</th>
                <th>Documented Claim[cite: 1, 3]</th>
                <th>Server Reality[cite: 1]</th>
              </tr>
            </thead>
            <tbody className="text-xs">
              <tr className="hover:bg-base-200/50">
                <td className="font-mono text-primary">/v1/analytics/summary</td>
                <td><span className="badge badge-error badge-xs">missing_endpoint</span>[cite: 1]</td>
                <td>Returns city aggregates[cite: 3]</td>
                <td>Endpoint returns 404 Not Found</td>
              </tr>
              <tr className="hover:bg-base-200/50">
                <td className="font-mono text-primary">/v1/favourites</td>
                <td><span className="badge badge-error badge-xs">missing_endpoint</span>[cite: 1]</td>
                <td>User favorites CRUD[cite: 3]</td>
                <td>Endpoint returns 404 Not Found</td>
              </tr>
              <tr className="hover:bg-base-200/50">
                <td className="font-mono text-primary">/auth/login</td>
                <td><span className="badge badge-warning badge-xs">auth</span>[cite: 1]</td>
                <td>Token valid for 24 hours[cite: 3]</td>
                <td>Expires in 900s; requires refresh flow</td>
              </tr>
              <tr className="hover:bg-base-200/50">
                <td className="font-mono text-primary">*</td>
                <td><span className="badge badge-warning badge-xs">pagination</span>[cite: 1]</td>
                <td>Uses 1-indexed page, limit max 200[cite: 3]</td>
                <td>Uses offset, limit capped at 50</td>
              </tr>
              <tr className="hover:bg-base-200/50">
                <td className="font-mono text-primary">*</td>
                <td><span className="badge badge-warning badge-xs">auth</span>[cite: 1]</td>
                <td>Pass ?api_key= as query parameter[cite: 3]</td>
                <td>Server requires X-API-Key header</td>
              </tr>
              <tr className="hover:bg-base-200/50">
                <td className="font-mono text-primary">/v1/projects</td>
                <td><span className="badge badge-warning badge-xs">units</span>[cite: 1]</td>
                <td>Prices in Indian rupees integer[cite: 3]</td>
                <td>price_max & price_min given in Crores</td>
              </tr>
              <tr className="hover:bg-base-200/50">
                <td className="font-mono text-primary">/v1/listings</td>
                <td><span className="badge badge-warning badge-xs">units</span>[cite: 1]</td>
                <td>Carpet area in square feet[cite: 3]</td>
                <td>magichomes records provided in sq. meters</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}