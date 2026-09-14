import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { removeFavourite } from './favouritesSlice';
import { Link } from 'react-router-dom';
import { Trash2, Heart, ExternalLink } from 'lucide-react';

export default function FavouritesPage() {
  const dispatch = useDispatch();
  const items = useSelector((state) => state.favourites.items) || [];

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <Heart className="w-7 h-7 text-error fill-error" />
        <div>
          <h1 className="text-2xl font-bold">Saved Listings</h1>
          <p className="text-xs text-base-content/60">Persistent per user session across reloads</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="card bg-base-100 p-12 text-center shadow-sm border border-base-200">
          <p className="text-base-content/60 mb-4">No saved listings yet.</p>
          <Link to="/listings" className="btn btn-primary btn-sm mx-auto">Browse Listings</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item) => {
            const id = item.listing_id || item.id;
            return (
              <div key={id} className="card bg-base-100 shadow-sm border border-base-200 p-4 flex flex-row justify-between items-center hover:shadow-md transition">
                <div>
                  <h3 className="font-bold text-base">{item.apartment_name || `Listing #${id}`}</h3>
                  <p className="text-xs text-base-content/60 capitalize">{item.locality || 'Verified Area'}</p>
                  <p className="text-sm font-semibold text-primary mt-1">₹{(item.price || 0).toLocaleString('en-IN')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Link to={`/listings/${id}`} className="btn btn-ghost btn-sm btn-square hover:bg-base-200">
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                  <button 
                    onClick={() => dispatch(removeFavourite(id))}
                    className="btn btn-ghost btn-sm btn-square text-error hover:bg-error/10"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}