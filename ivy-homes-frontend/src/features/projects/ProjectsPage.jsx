import React, { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { Building2, MapPin } from 'lucide-react';

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosClient.get('/v1/projects?limit=50&offset=0')
      .then((res) => setProjects(res.data.results || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-20 text-center"><span className="loading loading-bars"></span></div>;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2"><Building2 className="w-6 h-6 text-primary"/> Builder Projects</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {projects.map((p) => {
          // Normalize unit mismatch: prices < 1000 are in Crores
          const minPrice = p.price_min < 1000 ? p.price_min * 10000000 : p.price_min;
          const maxPrice = p.price_max < 1000 ? p.price_max * 10000000 : p.price_max;

          return (
            <div key={p.project_id} className="card bg-base-100 shadow p-5">
              <span className="badge badge-secondary badge-sm mb-2">{p.project_status}</span>
              <h2 className="font-bold text-lg">{p.apartment_name}</h2>
              <p className="text-xs text-base-content/60">by {p.developer_name}</p>
              <p className="text-sm text-base-content/70 capitalize flex items-center gap-1 mt-1"><MapPin className="w-3.5 h-3.5"/> {p.locality}</p>
              
              <div className="mt-3">
                <p className="text-xs text-base-content/60">Starting from</p>
                <p className="text-lg font-bold text-primary">₹{(minPrice || 0).toLocaleString('en-IN')} - ₹{(maxPrice || 0).toLocaleString('en-IN')}</p>
              </div>

              <div className="text-xs text-base-content/70 mt-3 pt-3 border-t flex justify-between">
                <span>{p.min_area_sqft} - {p.max_area_sqft} sqft</span>
                <span>{p.total_listings} active listings</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}