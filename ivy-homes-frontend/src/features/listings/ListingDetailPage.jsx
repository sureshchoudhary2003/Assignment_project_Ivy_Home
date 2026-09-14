import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { ArrowLeft, MapPin, Phone, BedDouble, Bath, Maximize2, Layers } from 'lucide-react';

export default function ListingDetailPage() {
  const { id } = useParams();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    axiosClient.get(`/v1/listings/${id}`)
      .then((res) => setListing(res.data))
      .catch((err) => {
        console.error(err);
        setError('Listing could not be retrieved.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center p-20">
        <span className="loading loading-bars loading-lg text-primary"></span>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="container mx-auto p-6 max-w-xl text-center">
        <div className="alert alert-error mb-4">
          <span>{error || 'Listing not found'}</span>
        </div>
        <Link to="/listings" className="btn btn-primary btn-sm">Back to Listings</Link>
      </div>
    );
  }

  const isSqm = listing.listing_id?.startsWith('MAG-') || listing.website === 'magichomes';
  const areaSqFt = isSqm ? Math.round(listing.carpet_area * 10.7639) : listing.carpet_area;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Link to="/listings" className="btn btn-ghost btn-sm mb-4 flex items-center gap-2 w-fit">
        <ArrowLeft className="w-4 h-4" /> Back to Listings
      </Link>

      <div className="card bg-base-100 shadow-md border border-base-200 p-6">
        <div className="flex flex-col md:flex-row justify-between md:items-start gap-4 mb-4">
          <div>
            <div className="flex gap-2 mb-2">
              <span className="badge badge-primary badge-outline capitalize">{listing.property_type || 'Apartment'}</span>
              <span className="badge badge-neutral badge-outline capitalize">{listing.furnishing || 'Unfurnished'}</span>
              {listing.is_verified && <span className="badge badge-success badge-xs py-2 px-2 text-white">Verified</span>}
            </div>
            <h1 className="text-2xl font-bold">{listing.apartment_name || 'Independent Property'}</h1>
            <p className="text-sm text-base-content/70 flex items-center gap-1 mt-1 capitalize">
              <MapPin className="w-4 h-4 text-primary" /> {listing.locality}
            </p>
          </div>
          <div className="text-left md:text-right">
            <p className="text-3xl font-extrabold text-primary">₹{(listing.price || 0).toLocaleString('en-IN')}</p>
            <p className="text-xs text-base-content/60 mt-1 font-mono">ID: {listing.listing_id}</p>
          </div>
        </div>

        {listing.description && (
          <div className="bg-base-200/60 p-4 rounded-xl my-4 text-sm leading-relaxed">
            <span className="font-semibold text-xs text-base-content/50 uppercase tracking-wider block mb-1">Description</span>
            {listing.description}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-4">
          <div className="p-3 bg-base-200 rounded-lg text-center">
            <BedDouble className="w-5 h-5 mx-auto mb-1 text-base-content/70" />
            <div className="text-xs text-base-content/60">Bedrooms</div>
            <div className="font-bold text-sm">{listing.bedroom} BHK</div>
          </div>
          <div className="p-3 bg-base-200 rounded-lg text-center">
            <Bath className="w-5 h-5 mx-auto mb-1 text-base-content/70" />
            <div className="text-xs text-base-content/60">Bathrooms</div>
            <div className="font-bold text-sm">{listing.bathroom}</div>
          </div>
          <div className="p-3 bg-base-200 rounded-lg text-center">
            <Layers className="w-5 h-5 mx-auto mb-1 text-base-content/70" />
            <div className="text-xs text-base-content/60">Floor</div>
            <div className="font-bold text-sm">{listing.floor} of {listing.total_floors || '-'}</div>
          </div>
          <div className="p-3 bg-base-200 rounded-lg text-center">
            <Maximize2 className="w-5 h-5 mx-auto mb-1 text-base-content/70" />
            <div className="text-xs text-base-content/60">Carpet Area</div>
            <div className="font-bold text-sm">{areaSqFt} sqft</div>
          </div>
        </div>

        <div className="mt-4 border-t border-base-200 pt-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-2 text-sm">
          <span>Posted by: <strong>{listing.posted_by_name || 'Owner'}</strong> ({listing.posted_by})</span>
          {listing.posted_by_contact && (
            <span className="flex items-center gap-1 font-mono text-primary font-medium">
              <Phone className="w-4 h-4" /> {listing.posted_by_contact}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}