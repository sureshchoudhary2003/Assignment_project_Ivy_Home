import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './features/auth/LoginPage';
import ListingsPage from './features/listings/ListingsPage';
import ListingDetailPage from './features/listings/ListingDetailPage';
import RentalsPage from './features/rentals/RentalsPage';
import ProjectsPage from './features/projects/ProjectsPage';
import FavouritesPage from './features/favourites/FavouritesPage';
import InsightsPage from './features/insights/InsightsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route path="/listings" element={<ProtectedRoute><ListingsPage /></ProtectedRoute>} />
        <Route path="/listings/:id" element={<ProtectedRoute><ListingDetailPage /></ProtectedRoute>} />
        <Route path="/rentals" element={<ProtectedRoute><RentalsPage /></ProtectedRoute>} />
        <Route path="/projects" element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>} />
        <Route path="/favourites" element={<ProtectedRoute><FavouritesPage /></ProtectedRoute>} />
        <Route path="/insights" element={<ProtectedRoute><InsightsPage /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/listings" replace />} />
      </Routes>
    </BrowserRouter>
  );
}