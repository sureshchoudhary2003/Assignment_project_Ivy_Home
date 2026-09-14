import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchListings } from './listingsSlice';
import { addFavourite } from '../favourites/favouritesSlice';
import { Link } from 'react-router-dom';
import { Heart, Filter, Bath, BedDouble, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 50;

export default function ListingsPage() {
    const dispatch = useDispatch();
    const { filteredItems, total, offset, loading } = useSelector((state) => state.listings);

    const [filters, setFilters] = useState({
        locality: '',
        bhk: '',
        furnishing: '',
        min_price: '',
        max_price: '',
    });

    const loadData = (targetOffset = 0) => {
        const cleaned = Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''));
        dispatch(fetchListings({ ...cleaned, limit: PAGE_SIZE, offset: targetOffset }));
    };

    useEffect(() => {
        loadData(0);
    }, []);

    const handleFilterSubmit = (e) => {
        e.preventDefault();
        loadData(0);
    };

    return (
        <div className="container mx-auto p-6 max-w-7xl">
            <form onSubmit={handleFilterSubmit} className="bg-base-100 p-4 rounded-xl shadow-sm mb-6 grid grid-cols-1 md:grid-cols-5 gap-3">
                <input
                    type="text"
                    placeholder="Locality (e.g. whitefield)"
                    className="input input-bordered input-sm w-full"
                    value={filters.locality}
                    onChange={(e) => setFilters({ ...filters, locality: e.target.value })}
                />
                <select
                    className="select select-bordered select-sm w-full"
                    value={filters.bhk}
                    onChange={(e) => setFilters({ ...filters, bhk: e.target.value })}
                >
                    <option value="">All BHK</option>
                    <option value="1">1 BHK</option>
                    <option value="2">2 BHK</option>
                    <option value="3">3 BHK</option>
                    <option value="4">4+ BHK</option>
                </select>
                <select
                    className="select select-bordered select-sm w-full"
                    value={filters.furnishing}
                    onChange={(e) => setFilters({ ...filters, furnishing: e.target.value })}
                >
                    <option value="">Furnishing</option>
                    <option value="unfurnished">Unfurnished</option>
                    <option value="semi-furnished">Semi-Furnished</option>
                    <option value="fully-furnished">Fully-Furnished</option>
                </select>
                <input
                    type="number"
                    placeholder="Max Price (INR)"
                    className="input input-bordered input-sm w-full"
                    value={filters.max_price}
                    onChange={(e) => setFilters({ ...filters, max_price: e.target.value })}
                />
                <button type="submit" className="btn btn-primary btn-sm flex items-center gap-2">
                    <Filter className="w-4 h-4" /> Filter
                </button>
            </form>

            {loading ? (
                <div className="flex justify-center p-20"><span className="loading loading-bars loading-lg"></span></div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {filteredItems.map((item) => (
                            <div key={item.listing_id} className="card bg-base-100 shadow hover:shadow-md transition">
                                <div className="card-body p-5">
                                    <div className="flex justify-between items-start">
                                        <span className="badge badge-outline capitalize">{item.locality}</span>
                                        <button
                                            type="button"
                                            onClick={() => dispatch(addFavourite(item))}
                                            className="btn btn-ghost btn-circle btn-xs text-error hover:bg-error/20"
                                        >
                                            <Heart className="w-4 h-4 fill-error" />
                                        </button>
                                    </div>
                                    <h3 className="card-title text-base mt-2">{item.apartment_name || 'Independent Property'}</h3>
                                    <p className="text-xl font-bold text-primary">₹{(item.price || 0).toLocaleString('en-IN')}</p>
                                    <div className="flex items-center gap-4 text-xs text-base-content/70 mt-3 border-t pt-3">
                                        <span className="flex items-center gap-1"><BedDouble className="w-3.5 h-3.5" /> {item.bedroom} BHK</span>
                                        <span className="flex items-center gap-1"><Bath className="w-3.5 h-3.5" /> {item.bathroom} Baths</span>
                                        <span className="flex items-center gap-1">
                                            <Maximize2 className="w-3.5 h-3.5" />
                                            {item.carpet_area_sqft} sqft {item.is_sqm_converted && <span className="text-[10px] text-accent">(normalized)</span>}
                                        </span>
                                    </div>
                                    <div className="card-actions justify-end mt-4">
                                        <Link to={`/listings/${item.listing_id}`} className="btn btn-secondary btn-sm w-full">View Details</Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination Toolbar */}
                    <div className="flex justify-between items-center mt-8 bg-base-100 p-4 rounded-xl shadow-sm">
                        <span className="text-sm text-base-content/70">
                            Showing {offset + 1} - {Math.min(offset + PAGE_SIZE, total)} of {total} records
                        </span>
                        <div className="join">
                            <button
                                disabled={offset === 0}
                                onClick={() => loadData(Math.max(0, offset - PAGE_SIZE))}
                                className="btn btn-sm join-item"
                            >
                                <ChevronLeft className="w-4 h-4" /> Prev
                            </button>
                            <button
                                disabled={offset + PAGE_SIZE >= total}
                                onClick={() => loadData(offset + PAGE_SIZE)}
                                className="btn btn-sm join-item"
                            >
                                Next <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}