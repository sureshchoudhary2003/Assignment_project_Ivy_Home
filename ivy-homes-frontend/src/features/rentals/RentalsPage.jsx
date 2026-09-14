import React, { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { Key, MapPin, BedDouble } from 'lucide-react';

export default function RentalsPage() {
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosClient.get('/v1/rentals?limit=50&offset=0')
      .then((res) => setRentals(res.data.results || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-20 text-center"><span className="loading loading-bars"></span></div>;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2"><Key className="w-6 h-6 text-primary"/> Rental Properties</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {rentals.map((r) => (
          <div key={r.listing_id} className="card bg-base-100 shadow p-5">
            <h2 className="font-bold text-lg">{r.apartment_name || r.title}</h2>
            <p className="text-sm text-base-content/70 capitalize flex items-center gap-1"><MapPin className="w-3.5 h-3.5"/> {r.locality}</p>
            <div className="mt-3">
              <span className="text-xl font-bold text-primary">₹{r.price?.toLocaleString('en-IN')} / mo</span>
              <span className="text-xs text-base-content/60 ml-2">(Deposit: ₹{r.deposit?.toLocaleString('en-IN')})</span>
            </div>
            <div className="flex gap-4 text-xs text-base-content/70 mt-3 pt-3 border-t">
              <span><BedDouble className="w-3 h-3 inline"/> {r.bedroom} BHK</span>
              <span>{r.furnishing}</span>
              <span>{r.carpet_area} sqft</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}