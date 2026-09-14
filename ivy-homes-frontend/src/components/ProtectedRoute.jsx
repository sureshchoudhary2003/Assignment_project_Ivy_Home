import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

export default function ProtectedRoute({ children }) {
  const { token, loading } = useSelector((state) => state.auth);
  const location = useLocation();

  // If auth is still processing, wait instead of kicking to /login
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  if (!token && !localStorage.getItem('ivy_token')) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}