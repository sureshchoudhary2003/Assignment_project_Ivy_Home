import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser } from '../features/auth/authSlice';
import { Home, Heart, Building2, Key, BarChart3, LogOut } from 'lucide-react';

export default function Navbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, token } = useSelector((state) => state.auth);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/login');
  };

  const navItemClass = ({ isActive }) =>
    `btn btn-sm btn-ghost transition-all duration-200 ease-in-out hover:bg-primary hover:text-white ${
      isActive ? 'bg-primary/10 text-primary font-bold border-b-2 border-primary rounded-b-none' : 'text-base-content/80'
    }`;

  return (
    <div className="navbar bg-base-100/90 backdrop-blur-md shadow-sm px-6 sticky top-0 z-50 border-b border-base-200">
      <div className="flex-1">
        <Link to="/listings" className="btn btn-ghost text-xl font-bold tracking-tight text-primary flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Home className="w-6 h-6" /> Ivy Homes
        </Link>
      </div>

      {token && (
        <div className="flex items-center gap-2">
          <NavLink to="/listings" className={navItemClass}>
            Sale
          </NavLink>
          <NavLink to="/rentals" className={navItemClass}>
            <Key className="w-4 h-4" /> Rentals
          </NavLink>
          <NavLink to="/projects" className={navItemClass}>
            <Building2 className="w-4 h-4" /> Projects
          </NavLink>
          <NavLink to="/favourites" className={navItemClass}>
            <Heart className="w-4 h-4" /> Favourites
          </NavLink>
          <NavLink to="/insights" className={navItemClass}>
            <BarChart3 className="w-4 h-4" /> Insights
          </NavLink>

          <div className="dropdown dropdown-end ml-4">
            <label tabIndex={0} className="btn btn-outline btn-primary btn-sm rounded-full cursor-pointer hover:shadow-md transition">
              {user?.name || user?.email || 'Demo User'}
            </label>
            <ul tabIndex={0} className="mt-3 z-[1] p-2 shadow-lg menu menu-sm dropdown-content bg-base-100 rounded-box w-52 border border-base-200">
              <li>
                <button onClick={handleLogout} className="text-error hover:bg-error/10 flex items-center gap-2">
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}