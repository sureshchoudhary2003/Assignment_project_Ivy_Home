import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { ArrowLeft, CheckCircle2, Phone, MapPin } from 'lucide-react';

export default function ListingDetailPage() {
  const { id } = useParams();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosClient.get(`/v1/listing/${id}`)
      .then((res) => setListing(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-12 text-center"><span className="loading loading-spinner"></span></div>;
  if (!listing) return <div className="p-12 text-center">Listing not found.</div>;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Link to="/listings" className="btn btn-ghost btn-sm mb-4 flex items-center gap-2"><ArrowLeft className="w-4 h-4"/> Back</Link>
      <div className="card bg-base-100 shadow-lg p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold">{listing.apartment_name}</h1>
            <p className="text-base-content/70 flex items-center gap-1 mt-1 capitalize"><MapPin className="w-4 h-4"/> {listing.locality}</p>
          </div>
          <p className="text-3xl font-extrabold text-primary">₹{(listing.price || 0).toLocaleString('en-IN')}</p>
        </div>
        <p className="text-sm bg-base-200 p-4 rounded-lg my-4">{listing.description}</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center my-4">
          <div className="p-3 bg-base-200 rounded">Bedrooms: <strong>{listing.bedroom}</strong></div>
          <div className="p-3 bg-base-200 rounded">Bathrooms: <strong>{listing.bathroom}</strong></div>
          <div className="p-3 bg-base-200 rounded">Floor: <strong>{listing.floor} / {listing.total_floors}</strong></div>
          <div className="p-3 bg-base-200 rounded">Carpet Area: <strong>{listing.carpet_area} sqft</strong></div>
        </div>
        <div className="mt-4 border-t pt-4 flex justify-between items-center text-sm">
          <span>Posted by: <strong>{listing.posted_by_name}</strong></span>
          <span className="flex items-center gap-1"><Phone className="w-4 h-4"/> {listing.posted_by_contact}</span>
        </div>
      </div>
    </div>
  );
}