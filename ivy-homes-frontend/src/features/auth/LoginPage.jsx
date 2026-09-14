import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser } from './authSlice';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { email: 'demo1@ivy.homes', password: '' }
  });
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, token } = useSelector((state) => state.auth);

  // If already logged in, redirect directly to listings
  useEffect(() => {
    if (token) {
      navigate('/listings', { replace: true });
    }
  }, [token, navigate]);

  const onSubmit = async (data) => {
    try {
      await dispatch(loginUser(data)).unwrap();
      dispatch(reloadFavouritesForUser());
      navigate('/listings', { replace: true });
    } catch {
      // Error handled by Redux state
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-base-200 px-4">
      <div className="card w-full max-w-md bg-base-100 shadow-xl p-8 border border-base-200">
        <h2 className="text-2xl font-bold text-center text-primary mb-1">Ivy Homes Portal</h2>
        <p className="text-xs text-center text-base-content/60 mb-6">Candidate Assigned City (Gurgaon)</p>
         <p className="text-xs text-center text-base-content/60 mb-6">Candidate Assigned locality (Sector 56 )</p>
        {error && (
          <div className="alert alert-error text-xs mb-4 py-2 px-3 shadow-sm rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{typeof error === 'string' ? error : 'Invalid credentials'}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="form-control">
            <label className="label"><span className="label-text font-medium text-xs">Email Address</span></label>
            <div className="input input-bordered input-sm flex items-center gap-2 focus-within:border-primary">
              <Mail className="w-4 h-4 text-base-content/40" />
              <input 
                type="email" 
                className="grow text-sm" 
                placeholder="demo1@ivy.homes" 
                {...register('email', { required: 'Email is required' })} 
              />
            </div>
            {errors.email && <span className="text-[11px] text-error mt-1">{errors.email.message}</span>}
          </div>

          <div className="form-control">
            <label className="label"><span className="label-text font-medium text-xs">Shared Demo Password</span></label>
            <div className="input input-bordered input-sm flex items-center gap-2 focus-within:border-primary">
              <Lock className="w-4 h-4 text-base-content/40" />
              <input 
                type="password" 
                className="grow text-sm" 
                placeholder="••••••••" 
                {...register('password', { required: 'Password is required' })} 
              />
            </div>
            {errors.password && <span className="text-[11px] text-error mt-1">{errors.password.message}</span>}
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="btn btn-primary btn-sm w-full mt-2 hover:shadow-md transition-all duration-200"
          >
            {loading ? <span className="loading loading-spinner loading-xs"></span> : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}