import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { getKolkataDateString, formatKolkataTime, formatKolkataDisplayDate } from '../utils/dateUtils';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Coffee, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Flame, 
  RefreshCw, 
  Search, 
  History, 
  MinusCircle, 
  Trash2, 
  ArrowLeft, 
  ExternalLink, 
  AlertCircle,
  HelpCircle,
  UserCheck,
  Check,
  X
} from 'lucide-react';

export default function AdminDashboardPage() {
  const { user, profile, isAdmin, adjustCoffeeDebt, fetchAuditLogs, checkAdminRole } = useAuth();
  const navigate = useNavigate();

  const [members, setMembers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifyingAdmin, setVerifyingAdmin] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'debt' | 'committed' | 'pending'
  const [activeTab, setActiveTab] = useState('roster'); // 'roster' | 'audit' | 'setup'

  // Confirmation Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [targetNewDebt, setTargetNewDebt] = useState(0);
  const [actionType, setActionType] = useState('REDUCE_DEBT'); // 'REDUCE_DEBT' | 'CLEAR_DEBT'
  const [adjustmentNote, setAdjustmentNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  const todayStr = getKolkataDateString();

  // Verify Admin authorization on mount
  useEffect(() => {
    let isMounted = true;
    const verify = async () => {
      setVerifyingAdmin(true);
      if (!user) {
        if (isMounted) {
          setAuthorized(false);
          setVerifyingAdmin(false);
        }
        return;
      }

      const hasAdminRole = await checkAdminRole(user.id);
      if (isMounted) {
        setAuthorized(hasAdminRole);
        setVerifyingAdmin(false);
        if (hasAdminRole) {
          fetchDashboardData();
        }
      }
    };

    verify();
    return () => { isMounted = false; };
  }, [user]);

  // Fetch members, daily activity, and audit logs
  const fetchDashboardData = async () => {
    setLoading(true);
    setActionError('');

    try {
      // 1. Fetch member profiles
      const { data: profilesData, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .not('github_username', 'is', null)
        .order('coffee_debt', { ascending: false });

      if (profErr) throw profErr;

      // 2. Fetch today's activity
      const { data: activityData, error: actErr } = await supabase
        .from('daily_activity')
        .select('*')
        .eq('activity_date', todayStr);

      if (actErr) throw actErr;

      const actMap = {};
      (activityData || []).forEach(act => {
        actMap[act.user_id] = act;
      });

      const combined = (profilesData || []).map(p => {
        const todayAct = actMap[p.id];
        return {
          ...p,
          todayStatus: todayAct?.status || 'PENDING',
          commitCount: todayAct?.commit_count || 0,
          latestRepo: todayAct?.latest_commit_repo || null,
          latestCommitAt: todayAct?.latest_commit_at || null
        };
      });

      setMembers(combined);

      // 3. Fetch audit logs
      const logs = await fetchAuditLogs(50);
      setAuditLogs(logs);

    } catch (err) {
      console.error('Error fetching admin data:', err);
      setActionError('Could not load administrative data.');
    } finally {
      setLoading(false);
    }
  };

  // Open confirmation modal for debt reduction or clearing
  const promptDebtAdjustment = (member, targetDebt, type) => {
    setSelectedMember(member);
    setTargetNewDebt(targetDebt);
    setActionType(type);
    setAdjustmentNote(type === 'CLEAR_DEBT' ? 'Cleared debt upon settlement' : 'Reduced debt by 1');
    setActionSuccess('');
    setActionError('');
    setModalOpen(true);
  };

  // Execute confirmed adjustment
  const handleConfirmAdjustment = async () => {
    if (!selectedMember) return;
    setSubmitting(true);
    setActionError('');

    try {
      await adjustCoffeeDebt({
        targetUserId: selectedMember.id,
        newDebt: targetNewDebt,
        action: actionType,
        note: adjustmentNote.trim() || undefined
      });

      setActionSuccess(`Successfully updated coffee debt for ${selectedMember.name}.`);
      setModalOpen(false);

      // Refresh data
      await fetchDashboardData();

      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      setActionError(err.message || 'Failed to update member debt.');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (verifyingAdmin) {
    return (
      <div className="page-container flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center animate-pulse">
          <ShieldCheck className="w-6 h-6 text-emerald-400" />
        </div>
        <div className="text-xs font-semibold text-emerald-300 tracking-wider uppercase font-mono">
          Verifying Administrator Privileges...
        </div>
      </div>
    );
  }

  // 403 Forbidden Access State for Non-Admins
  if (!authorized) {
    return (
      <div className="page-container flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-4 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-red-200 font-display-clean mb-2">
          403 — Unauthorized Administrator Access
        </h1>
        <p className="text-sm text-red-300/80 max-w-md mb-6 font-sans-clean leading-relaxed">
          Access to this administrative console is strictly restricted to verified system administrators. Your account does not possess the required administrator role.
        </p>
        <div className="flex items-center gap-3">
          <Link to="/" className="btn-primary">
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Member Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  // Calculate metrics
  const totalDebt = members.reduce((sum, m) => sum + (m.coffee_debt || 0), 0);
  const activeDebtors = members.filter(m => (m.coffee_debt || 0) > 0).length;
  const committedToday = members.filter(m => m.todayStatus === 'COMMITTED').length;

  // Filter members
  const filteredMembers = members.filter(m => {
    const matchesSearch = 
      (m.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.github_username || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterMode === 'debt') return (m.coffee_debt || 0) > 0;
    if (filterMode === 'committed') return m.todayStatus === 'COMMITTED';
    if (filterMode === 'pending') return m.todayStatus === 'PENDING' || m.todayStatus === 'MISSED';

    return true;
  });

  return (
    <div className="page-container space-y-8 font-sans-clean">
      
      {/* 1. Executive Admin Header */}
      <section className="dashboard-header border-b border-emerald-900/40 pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <span className="pixel-badge border-amber-500/40 bg-amber-500/10 text-amber-300">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>SUPER ADMIN CONSOLE</span>
            </span>
            <span className="text-xs text-emerald-600">•</span>
            <span className="text-xs text-emerald-400 font-mono">SIMON • SECURE RLS</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#ecfdf5] tracking-tight font-display-clean flex items-center gap-2">
            Administrator Control Center
          </h1>
          <p className="text-xs sm:text-sm text-emerald-200/80 leading-relaxed max-w-xl">
            Live coffee debt oversight, late commit inspection, and audit-logged manual adjustments.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="btn-secondary text-xs py-2 px-3.5 flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            <span>Refresh</span>
          </button>

          <Link
            to="/"
            className="btn-secondary text-xs py-2 px-3.5 flex items-center gap-2 text-emerald-300 hover:text-white"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Club View</span>
          </Link>
        </div>
      </section>

      {/* Success Notification */}
      {actionSuccess && (
        <div className="alert-box alert-success flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess('')} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Notification */}
      {actionError && (
        <div className="alert-box alert-error flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError('')} className="text-red-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Top Metric Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Coffee Debt */}
        <div className="card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-300 text-xs font-semibold uppercase tracking-wider">
            <span>Outstanding Debt</span>
            <Coffee className="w-4 h-4 text-amber-400" />
          </div>
          <div className="my-2">
            <div className="text-3xl font-extrabold text-amber-300 font-display-clean">
              {totalDebt} <span className="text-sm font-sans font-medium text-emerald-300/80">cups</span>
            </div>
            <p className="text-[11px] text-emerald-400/80 mt-1">Total owed across all members</p>
          </div>
        </div>

        {/* Card 2: Debtors Count */}
        <div className="card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-300 text-xs font-semibold uppercase tracking-wider">
            <span>Members In Debt</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="my-2">
            <div className="text-3xl font-extrabold text-[#ecfdf5] font-display-clean">
              {activeDebtors} <span className="text-sm font-sans font-medium text-emerald-300/80">/ {members.length}</span>
            </div>
            <p className="text-[11px] text-emerald-400/80 mt-1">Active participants with debt &gt; 0</p>
          </div>
        </div>

        {/* Card 3: Today's Commitment Status */}
        <div className="card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-300 text-xs font-semibold uppercase tracking-wider">
            <span>Committed Today</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="my-2">
            <div className="text-3xl font-extrabold text-emerald-400 font-display-clean">
              {committedToday} <span className="text-sm font-sans font-medium text-emerald-300/80">/ {members.length}</span>
            </div>
            <p className="text-[11px] text-emerald-400/80 mt-1">Push verified before 8:00 PM IST</p>
          </div>
        </div>

        {/* Card 4: Audit Trail Count */}
        <div className="card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-300 text-xs font-semibold uppercase tracking-wider">
            <span>Audit Entries</span>
            <History className="w-4 h-4 text-teal-400" />
          </div>
          <div className="my-2">
            <div className="text-3xl font-extrabold text-teal-300 font-display-clean">
              {auditLogs.length}
            </div>
            <p className="text-[11px] text-emerald-400/80 mt-1">Logged admin actions on record</p>
          </div>
        </div>

      </section>

      {/* 3. Navigation Tabs (Roster vs Audit Trail vs Setup Guide) */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-emerald-900/60 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('roster')}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-display-clean transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'roster'
                ? 'bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                : 'text-emerald-300 hover:text-white hover:bg-emerald-950/60'
            }`}
          >
            <Coffee className="w-3.5 h-3.5" />
            <span>Members Debt Management</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-display-clean transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'audit'
                ? 'bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                : 'text-emerald-300 hover:text-white hover:bg-emerald-950/60'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Audit Log ({auditLogs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('setup')}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-display-clean transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'setup'
                ? 'bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                : 'text-emerald-300 hover:text-white hover:bg-emerald-950/60'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Setup Instructions</span>
          </button>
        </div>

        {activeTab === 'roster' && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search member..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 bg-[#03140b] border border-emerald-800/60 rounded-xl text-xs text-emerald-100 placeholder:text-emerald-700 focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>
        )}
      </div>

      {/* 4. TAB CONTENT 1: MEMBERS ROSTER & DEBT ACTIONS */}
      {activeTab === 'roster' && (
        <section className="space-y-4">
          
          {/* Quick Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-lg border font-medium transition-all ${
                filterMode === 'all'
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                  : 'bg-emerald-950/30 border-emerald-900/60 text-emerald-400 hover:text-emerald-200'
              }`}
            >
              All ({members.length})
            </button>
            <button
              onClick={() => setFilterMode('debt')}
              className={`px-3 py-1.5 rounded-lg border font-medium transition-all ${
                filterMode === 'debt'
                  ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                  : 'bg-emerald-950/30 border-emerald-900/60 text-emerald-400 hover:text-emerald-200'
              }`}
            >
              In Debt ({activeDebtors})
            </button>
            <button
              onClick={() => setFilterMode('committed')}
              className={`px-3 py-1.5 rounded-lg border font-medium transition-all ${
                filterMode === 'committed'
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                  : 'bg-emerald-950/30 border-emerald-900/60 text-emerald-400 hover:text-emerald-200'
              }`}
            >
              Committed Today ({committedToday})
            </button>
          </div>

          {/* Members Table */}
          <div className="card overflow-hidden p-0 border border-emerald-800/40">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-emerald-900/70 bg-[#03170e]/80 text-emerald-300 uppercase tracking-wider font-semibold font-display-clean">
                    <th className="py-3.5 px-4">Member</th>
                    <th className="py-3.5 px-4">Today's Status</th>
                    <th className="py-3.5 px-4">Current Streak</th>
                    <th className="py-3.5 px-4">Coffee Debt</th>
                    <th className="py-3.5 px-4 text-right">Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-900/40 font-sans-clean">
                  {filteredMembers.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-12 text-center text-emerald-400/60">
                        No members matching current criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredMembers.map((member) => (
                      <tr 
                        key={member.id} 
                        className="hover:bg-emerald-950/30 transition-colors"
                      >
                        {/* Member Identity */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            {member.github_avatar_url ? (
                              <img 
                                src={member.github_avatar_url} 
                                alt={member.name} 
                                className="w-8 h-8 rounded-full object-cover border border-emerald-500/40 shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-emerald-800/60 flex items-center justify-center font-bold text-white shrink-0">
                                {member.name?.[0] || 'M'}
                              </div>
                            )}
                            <div>
                              <div className="font-semibold text-emerald-100 flex items-center gap-1.5">
                                <span>{member.name}</span>
                              </div>
                              <a 
                                href={member.github_url || `https://github.com/${member.github_username}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] text-emerald-400/80 hover:text-emerald-300 hover:underline flex items-center gap-1 mt-0.5"
                              >
                                <span>@{member.github_username}</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            </div>
                          </div>
                        </td>

                        {/* Today's Commit Status */}
                        <td className="py-3.5 px-4">
                          {member.todayStatus === 'COMMITTED' ? (
                            <div className="inline-flex flex-col">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 font-semibold text-[11px]">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                <span>Committed ({member.commitCount})</span>
                              </span>
                              {member.latestRepo && (
                                <span className="text-[10px] text-emerald-400/70 truncate max-w-[140px] mt-1">
                                  {member.latestRepo}
                                </span>
                              )}
                            </div>
                          ) : member.todayStatus === 'MISSED' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500/15 border border-red-500/40 text-red-300 font-semibold text-[11px]">
                              <AlertTriangle className="w-3 h-3 text-red-400" />
                              <span>Missed Today</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold text-[11px]">
                              <Clock className="w-3 h-3 text-amber-400" />
                              <span>Pending Push</span>
                            </span>
                          )}
                        </td>

                        {/* Streak */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 font-bold text-emerald-200">
                            <Flame className={`w-4 h-4 ${member.current_streak > 0 ? 'text-amber-400 fill-amber-400/20' : 'text-emerald-800'}`} />
                            <span>{member.current_streak} days</span>
                            <span className="text-[10px] text-emerald-500 font-normal">
                              (best {member.longest_streak})
                            </span>
                          </div>
                        </td>

                        {/* Coffee Debt */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-base font-extrabold font-display-clean ${
                              member.coffee_debt > 0 ? 'text-amber-400' : 'text-emerald-400'
                            }`}>
                              {member.coffee_debt}
                            </span>
                            <Coffee className={`w-3.5 h-3.5 ${
                              member.coffee_debt > 0 ? 'text-amber-400' : 'text-emerald-600'
                            }`} />
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            {/* Reduce by 1 */}
                            <button
                              onClick={() => promptDebtAdjustment(member, Math.max(0, member.coffee_debt - 1), 'REDUCE_DEBT')}
                              disabled={member.coffee_debt <= 0}
                              className={`p-1.5 px-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                                member.coffee_debt > 0
                                  ? 'bg-amber-950/40 border-amber-500/40 text-amber-300 hover:bg-amber-900/50 hover:border-amber-400 cursor-pointer'
                                  : 'opacity-40 border-emerald-900/40 text-emerald-700 cursor-not-allowed'
                              }`}
                              title="Reduce debt by 1 cup"
                            >
                              <MinusCircle className="w-3.5 h-3.5" />
                              <span>-1 Cup</span>
                            </button>

                            {/* Clear All to 0 */}
                            <button
                              onClick={() => promptDebtAdjustment(member, 0, 'CLEAR_DEBT')}
                              disabled={member.coffee_debt <= 0}
                              className={`p-1.5 px-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                                member.coffee_debt > 0
                                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/50 hover:border-emerald-400 cursor-pointer'
                                  : 'opacity-40 border-emerald-900/40 text-emerald-700 cursor-not-allowed'
                              }`}
                              title="Clear all outstanding coffee debt"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Clear All</span>
                            </button>
                          </div>
                        </td>

                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* 5. TAB CONTENT 2: LIVE AUDIT LOG TRAIL */}
      {activeTab === 'audit' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-emerald-200 uppercase tracking-wider font-display-clean flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-400" />
              <span>Immutable Administrator Audit Trail</span>
            </h2>
            <span className="text-xs text-emerald-400/80 font-mono">
              Last {auditLogs.length} logged modifications
            </span>
          </div>

          <div className="card overflow-hidden p-0 border border-emerald-800/40">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-emerald-900/70 bg-[#03170e]/80 text-emerald-300 uppercase tracking-wider font-semibold font-display-clean">
                    <th className="py-3.5 px-4">Timestamp (IST)</th>
                    <th className="py-3.5 px-4">Admin</th>
                    <th className="py-3.5 px-4">Target Member</th>
                    <th className="py-3.5 px-4">Action</th>
                    <th className="py-3.5 px-4">Debt Change</th>
                    <th className="py-3.5 px-4">Note / Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-900/40 font-sans-clean">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-emerald-400/60">
                        No administrator adjustments recorded yet.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-emerald-950/30 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-emerald-300/80 whitespace-nowrap">
                          {formatKolkataTime(log.created_at)}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-emerald-200">
                          {log.admin_username || 'Simon'}
                        </td>
                        <td className="py-3.5 px-4 text-emerald-100 font-medium">
                          {log.target_user_name || 'Member'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            log.action === 'CLEAR_DEBT'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-emerald-200">
                          <span className="text-amber-400 line-through mr-1.5">{log.previous_debt}</span>
                          ➔
                          <span className="text-emerald-400 font-bold ml-1.5">{log.new_debt} cups</span>
                        </td>
                        <td className="py-3.5 px-4 text-emerald-300/80 max-w-xs truncate">
                          {log.note || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* 6. TAB CONTENT 3: SETUP INSTRUCTIONS */}
      {activeTab === 'setup' && (
        <section className="card p-6 space-y-5 border-emerald-800/60">
          <div className="flex items-center gap-3 border-b border-emerald-900/60 pb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-emerald-100 font-display-clean">
                Initial Admin Account & Authorization Setup
              </h2>
              <p className="text-xs text-emerald-300/80">
                Instructions for configuring Simon's password securely on the database side.
              </p>
            </div>
          </div>

          <div className="space-y-4 text-xs text-emerald-200/90 leading-relaxed font-sans-clean">
            <p>
              Daily Commit Club does not store plaintext admin passwords in code, frontend variables, or local storage. Admin privileges are verified by protected PostgreSQL functions and Row Level Security (RLS) policies.
            </p>

            <div className="bg-[#020d07] border border-emerald-800/60 rounded-xl p-4 space-y-3 font-mono text-[11px]">
              <div className="text-emerald-400 font-bold uppercase tracking-wider font-display-clean">
                Option 1: Direct SQL Provisioning in Supabase SQL Editor
              </div>
              <p className="text-emerald-300/70 font-sans">
                Run this SQL query in your Supabase Dashboard SQL Editor, replacing with your secret password:
              </p>
              <pre className="p-3 bg-black/60 rounded-lg text-emerald-300 overflow-x-auto border border-emerald-900/40">
{`SELECT public.provision_admin_simon('your_super_secret_password_here');`}
              </pre>
            </div>

            <div className="bg-[#020d07] border border-emerald-800/60 rounded-xl p-4 space-y-3 font-mono text-[11px]">
              <div className="text-emerald-400 font-bold uppercase tracking-wider font-display-clean">
                Option 2: Terminal Interactive Helper Script
              </div>
              <p className="text-emerald-300/70 font-sans">
                Run the dedicated setup script in your project root to be prompted securely for Simon's password:
              </p>
              <pre className="p-3 bg-black/60 rounded-lg text-emerald-300 overflow-x-auto border border-emerald-900/40">
{`node backend/scripts/setup-admin.js`}
              </pre>
            </div>

            <div className="p-3.5 bg-amber-950/20 border border-amber-500/30 rounded-xl text-amber-200 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Security Guarantee:</strong> Users cannot promote themselves to admin merely by submitting the username "Simon". Authentication resolves to the database-configured account, and privileges are verified through database-level RLS.
              </span>
            </div>
          </div>
        </section>
      )}

      {/* 7. CONFIRMATION MODAL FOR DEBT ADJUSTMENT */}
      {modalOpen && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="card w-full max-w-md bg-[#051a10] border-emerald-500/40 p-6 space-y-5 shadow-2xl">
            
            <div className="flex items-center justify-between border-b border-emerald-900/60 pb-3">
              <div className="flex items-center gap-2 text-emerald-300 font-bold font-display-clean text-sm">
                <Coffee className="w-4 h-4 text-amber-400" />
                <span>Confirm Debt Adjustment</span>
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                className="text-emerald-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-emerald-200/90 font-sans-clean">
              <p>
                You are about to modify the coffee debt ledger for{' '}
                <strong className="text-white">{selectedMember.name}</strong> (@{selectedMember.github_username}):
              </p>

              <div className="p-4 bg-[#020b06] border border-emerald-800/60 rounded-xl flex items-center justify-around text-center">
                <div>
                  <div className="text-[10px] text-emerald-400 uppercase font-semibold">Current Debt</div>
                  <div className="text-2xl font-bold text-amber-400 mt-1 font-display-clean">
                    {selectedMember.coffee_debt} cups
                  </div>
                </div>
                <div className="text-emerald-500 text-lg">➔</div>
                <div>
                  <div className="text-[10px] text-emerald-400 uppercase font-semibold">New Debt</div>
                  <div className="text-2xl font-bold text-emerald-300 mt-1 font-display-clean">
                    {targetNewDebt} cups
                  </div>
                </div>
              </div>

              <div className="form-group pt-1">
                <label className="form-label text-[11px]">
                  <span>Adjustment Reason / Audit Note</span>
                  <span className="text-[10px] text-emerald-500 font-normal">Required for audit log</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Paid in club meetup, bought brew"
                  value={adjustmentNote}
                  onChange={(e) => setAdjustmentNote(e.target.value)}
                  className="form-input text-xs h-10"
                />
              </div>

              <div className="text-[11px] text-emerald-400/70 italic">
                * This adjustment will be permanently recorded in the immutable admin audit trail with your admin username (Simon).
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={submitting}
                className="btn-secondary text-xs py-2 px-4 cursor-pointer"
              >
                Cancel
              </button>
              
              <button
                type="button"
                onClick={handleConfirmAdjustment}
                disabled={submitting}
                className="btn-primary text-xs py-2 px-5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{submitting ? 'Applying...' : 'Confirm Adjustment'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
