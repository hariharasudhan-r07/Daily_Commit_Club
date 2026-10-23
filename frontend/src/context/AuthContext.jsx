import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if authenticated user has admin privileges
  const checkAdminRole = async (userId) => {
    if (!userId) {
      setIsAdmin(false);
      return false;
    }
    try {
      // 1. Check via check_is_admin RPC function
      const { data: rpcData, error: rpcError } = await supabase.rpc('check_is_admin');
      if (!rpcError && rpcData === true) {
        setIsAdmin(true);
        return true;
      }

      // 2. Fallback direct table query on admin_roles with user id
      const { data: roleData, error: roleError } = await supabase
        .from('admin_roles')
        .select('username, role')
        .eq('user_id', userId)
        .maybeSingle();

      if (!roleError && roleData && roleData.role) {
        setIsAdmin(true);
        return true;
      }

      setIsAdmin(false);
      return false;
    } catch (err) {
      console.warn('Admin check warning:', err);
      setIsAdmin(false);
      return false;
    }
  };

  // Load profile for authenticated user
  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error.message);
        return null;
      }
      setProfile(data);
      return data;
    } catch (err) {
      console.error('Exception fetching profile:', err);
      return null;
    }
  };

  useEffect(() => {
    // Check initial active session
    const initSession = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          await Promise.all([
            fetchProfile(session.user.id),
            checkAdminRole(session.user.id)
          ]);
        } else {
          setUser(null);
          setProfile(null);
          setIsAdmin(false);
        }
      } catch (err) {
        console.error('Error checking session:', err);
      } finally {
        setLoading(false);
      }
    };

    initSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        await Promise.all([
          fetchProfile(session.user.id),
          checkAdminRole(session.user.id)
        ]);
      } else {
        setUser(null);
        setProfile(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Helper to extract clean GitHub username from URL or handle raw username
  const extractGithubUsername = (input) => {
    if (!input) return '';
    let clean = input.trim().replace(/\/$/, '');
    if (clean.includes('github.com/')) {
      const parts = clean.split('github.com/');
      clean = parts[parts.length - 1];
    }
    // Remove query params or trailing slashes
    clean = clean.split('?')[0].split('/')[0];
    return clean.trim().replace(/^@/, '');
  };

  // Helper to generate deterministic, RFC-valid internal email
  const generateInternalEmail = (githubUsername) => {
    if (!githubUsername) return '';
    const cleanUser = githubUsername.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '');
    return `dcc_${cleanUser}@gmail.com`;
  };

  // Registration flow with real email
  const register = async ({ name, email, githubUrl, password }) => {
    const rawName = name.trim();
    const rawEmail = (email || '').trim().toLowerCase();
    const rawGithubUrl = githubUrl.trim();
    const username = extractGithubUsername(rawGithubUrl);

    if (!rawEmail || !rawEmail.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }

    if (!username) {
      throw new Error('Please enter a valid GitHub profile URL (e.g. https://github.com/yourusername)');
    }

    const formattedGithubUrl = rawGithubUrl.startsWith('http') ? rawGithubUrl : `https://github.com/${username}`;

    // Try fetching GitHub avatar
    let avatarUrl = `https://github.com/${username}.png`;
    try {
      const ghRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`);
      if (ghRes.ok) {
        const ghData = await ghRes.json();
        if (ghData.avatar_url) avatarUrl = ghData.avatar_url;
      }
    } catch (e) {
      console.warn('Could not fetch GitHub avatar directly:', e);
    }

    // Supabase Auth SignUp with real user email
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: rawEmail,
      password: password,
      options: {
        data: {
          full_name: rawName,
          email: rawEmail,
          github_username: username,
          github_url: formattedGithubUrl,
          github_avatar_url: avatarUrl
        }
      }
    });

    if (authError) {
      if (authError.message?.toLowerCase().includes('already registered') || authError.status === 422) {
        throw new Error('An account with this email or GitHub profile already exists. Please sign in.');
      }
      if (authError.status === 429 || authError.message?.toLowerCase().includes('rate limit')) {
        throw new Error('Too many attempts. If your account was already created, please try signing in.');
      }
      throw new Error(authError.message || 'Unable to create your account. Please check your details and try again.');
    }

    if (!authData.user) {
      throw new Error('Registration failed to return user data. Please try again.');
    }

    let activeSession = authData.session;

    // If session was not returned directly by signUp, log in immediately
    if (!activeSession) {
      const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
        email: rawEmail,
        password: password
      });
      if (loginErr) {
        console.warn('Auto sign-in after registration warning:', loginErr);
      } else {
        activeSession = loginData?.session;
      }
    }

    // Upsert profile into public.profiles as fallback/enhancement
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: authData.user.id,
      name: rawName,
      email: rawEmail,
      internal_email: rawEmail,
      github_url: formattedGithubUrl,
      github_username: username,
      github_avatar_url: avatarUrl,
      current_streak: 0,
      longest_streak: 0,
      coffee_debt: 0
    });

    if (profileError) {
      console.error('Profile upsert error:', profileError);
    }

    setUser(authData.user);
    const updatedProfile = await fetchProfile(authData.user.id);
    return { user: authData.user, session: activeSession, profile: updatedProfile };
  };

  // Login flow by Email, Name, or Username
  const login = async ({ name, password }) => {
    const inputClean = name.trim();
    
    let targetEmail = null;
    if (inputClean.includes('@')) {
      targetEmail = inputClean.toLowerCase();
    } else {
      // Resolve email via get_login_email RPC
      const { data: emailData } = await supabase.rpc('get_login_email', {
        user_identifier: inputClean
      });

      if (emailData && emailData.length > 0 && emailData[0].email) {
        targetEmail = emailData[0].email;
      } else {
        targetEmail = inputClean;
      }
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: targetEmail,
      password: password
    });

    if (authError) {
      throw new Error('Invalid email/username or password. Please check your credentials.');
    }

    setUser(authData.user);
    await fetchProfile(authData.user.id);
    return authData.user;
  };

  // Forgot password flow
  const resetPassword = async (userIdentifier) => {
    const inputClean = userIdentifier.trim();
    if (!inputClean) {
      throw new Error('Please enter your Email, Name, or GitHub username.');
    }

    let targetEmail = null;
    if (inputClean.includes('@')) {
      targetEmail = inputClean.toLowerCase();
    } else {
      const { data: emailData } = await supabase.rpc('get_login_email', {
        user_identifier: inputClean
      });

      if (emailData && emailData.length > 0 && emailData[0].email) {
        targetEmail = emailData[0].email;
      } else {
        targetEmail = inputClean;
      }
    }

    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(targetEmail, {
      redirectTo: `${window.location.origin}/`
    });

    if (resetErr) {
      if (resetErr.status === 429 || resetErr.message?.toLowerCase().includes('rate limit')) {
        throw new Error('Email rate limit reached for password resets. Please wait a few minutes before trying again.');
      }
      throw new Error(resetErr.message || 'Password reset request failed.');
    }

    return true;
  };

  // Dedicated Admin Login flow (strictly verified against database admin roles)
  const adminLogin = async ({ username, password }) => {
    const inputClean = (username || '').trim();
    if (!inputClean || !password) {
      throw new Error('Please enter both admin username and password.');
    }

    let targetEmail = null;
    if (inputClean.includes('@')) {
      targetEmail = inputClean.toLowerCase();
    } else {
      // 1. Resolve email via get_login_email RPC (which checks admin_roles first)
      const { data: emailData, error: rpcErr } = await supabase.rpc('get_login_email', {
        user_identifier: inputClean
      });

      if (!rpcErr && emailData && emailData.length > 0 && emailData[0].email) {
        targetEmail = emailData[0].email;
      } else {
        // Fallback internal admin email pattern if Simon
        targetEmail = inputClean.toLowerCase() === 'simon'
          ? 'simon.admin@dailycommitclub.internal'
          : inputClean;
      }
    }

    // 2. Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: targetEmail,
      password: password
    });

    if (authError) {
      throw new Error('Invalid admin credentials. Please verify username and password.');
    }

    if (!authData?.user) {
      throw new Error('Authentication failed. No user returned.');
    }

    // 3. Strictly verify admin role in backend
    const isVerifiedAdmin = await checkAdminRole(authData.user.id);
    if (!isVerifiedAdmin) {
      // If user authenticated but lacks admin privileges, reject immediately
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setIsAdmin(false);
      throw new Error('Access denied: This account does not possess administrator privileges.');
    }

    setUser(authData.user);
    await fetchProfile(authData.user.id);
    setIsAdmin(true);
    return authData.user;
  };

  // Admin: Adjust coffee debt with audit logging
  const adjustCoffeeDebt = async ({ targetUserId, newDebt, action = 'ADJUST', note = '' }) => {
    const { data, error } = await supabase.rpc('admin_adjust_coffee_debt', {
      p_target_user_id: targetUserId,
      p_new_debt: Math.max(0, parseInt(newDebt, 10)),
      p_action: action,
      p_note: note
    });

    if (error) {
      throw new Error(error.message || 'Failed to adjust member coffee debt.');
    }

    return data;
  };

  // Admin: Fetch audit logs
  const fetchAuditLogs = async (limit = 50) => {
    try {
      const { data, error } = await supabase.rpc('get_admin_audit_logs', { p_limit: limit });
      if (error) {
        // Direct table fallback
        const { data: tableLogs, error: tableErr } = await supabase
          .from('admin_audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);
        if (tableErr) throw tableErr;
        return tableLogs || [];
      }
      return data || [];
    } catch (err) {
      console.warn('Error retrieving audit logs:', err.message);
      return [];
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      isAdmin,
      loading, 
      register, 
      login, 
      adminLogin,
      checkAdminRole,
      adjustCoffeeDebt,
      fetchAuditLogs,
      resetPassword,
      logout, 
      refreshProfile: () => fetchProfile(user?.id) 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

