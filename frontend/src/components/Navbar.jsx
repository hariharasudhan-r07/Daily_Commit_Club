import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Coffee, LayoutDashboard, Users, LogOut, Menu, X, ShieldCheck } from 'lucide-react';

export default function Navbar() {
  const { profile, logout, isAdmin } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navItemClass = ({ isActive }) =>
    `nav-link ${isActive ? 'active' : ''}`;

  return (
    <div className="navbar-wrap">
      <header className="navbar">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)] shrink-0">
            <Coffee className="w-5 h-5 text-slate-950 stroke-[2.2]" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold tracking-tight text-sm text-[#ecfdf5] font-display-clean leading-none">
              COMMIT CLUB
            </span>
            <span className="text-[11px] text-emerald-300/80 font-sans-clean font-medium mt-0.5 hidden sm:block">
              Daily GitHub Tracker
            </span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1.5">
          <NavLink to="/" end className={navItemClass}>
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </NavLink>

          <NavLink to="/members" className={navItemClass}>
            <Users className="w-4 h-4" />
            <span>Members</span>
          </NavLink>

          <NavLink to="/coffee" className={navItemClass}>
            <Coffee className="w-4 h-4 text-amber-400" />
            <span>Coffee Debt</span>
          </NavLink>

          {isAdmin && (
            <NavLink to="/admin" className={navItemClass}>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Admin</span>
            </NavLink>
          )}
        </nav>

        {/* Right Section: IST Badge + User Capsule */}
        <div className="hidden lg:flex items-center gap-3">
          {/* Live Rule Badge */}
          <div className="pixel-badge hidden xl:inline-flex">
            <span className="pixel-dot"></span>
            <span>IST • 8:00 PM RULE</span>
          </div>

          {/* User Capsule & Sign Out */}
          <div className="flex items-center gap-2 pl-3 border-l border-emerald-900/60">
            <div className="flex items-center gap-2.5 px-3 py-1.5 bg-[#031109]/90 border border-emerald-800/60 rounded-xl">
              {profile?.github_avatar_url ? (
                <img 
                  src={profile.github_avatar_url} 
                  alt={profile.name || 'User'} 
                  className="w-5 h-5 rounded-full shrink-0 object-cover border border-emerald-500/50"
                />
              ) : (
                <div className="w-5 h-5 rounded-full shrink-0 bg-emerald-800 flex items-center justify-center text-[10px] font-bold text-white">
                  {profile?.name?.[0] || 'U'}
                </div>
              )}
              <span className="text-xs font-medium text-emerald-100 max-w-[100px] truncate">
                {profile?.name}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 text-emerald-300 hover:text-emerald-100 hover:bg-emerald-900/40 rounded-xl transition-all cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-emerald-100 bg-[#031109] border border-emerald-800/60 rounded-xl cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="pointer-events-auto w-full max-w-sm mt-3 mx-auto bg-[#061910]/95 backdrop-blur-xl border border-emerald-500/30 rounded-2xl shadow-2xl p-4 space-y-3 md:hidden">
          <nav className="flex flex-col space-y-1">
            <NavLink to="/" end onClick={() => setMobileMenuOpen(false)} className={navItemClass}>
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </NavLink>

            <NavLink to="/members" onClick={() => setMobileMenuOpen(false)} className={navItemClass}>
              <Users className="w-4 h-4" />
              <span>Members</span>
            </NavLink>

            <NavLink to="/coffee" onClick={() => setMobileMenuOpen(false)} className={navItemClass}>
              <Coffee className="w-4 h-4 text-amber-400" />
              <span>Coffee Debt</span>
            </NavLink>

            {isAdmin && (
              <NavLink to="/admin" onClick={() => setMobileMenuOpen(false)} className={navItemClass}>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Admin Console</span>
              </NavLink>
            )}
          </nav>

          <div className="pt-3 border-t border-emerald-900/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {profile?.github_avatar_url ? (
                <img src={profile.github_avatar_url} alt="" className="w-6 h-6 rounded-full object-cover border border-emerald-500/50" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-emerald-800 flex items-center justify-center text-xs font-bold text-white">
                  {profile?.name?.[0] || 'U'}
                </div>
              )}
              <span className="text-xs text-emerald-100 font-medium">{profile?.name}</span>
            </div>

            <button
              onClick={handleLogout}
              className="px-3 py-1.5 bg-[#031109] text-xs text-emerald-300 hover:text-emerald-100 rounded-xl border border-emerald-800/60 flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
