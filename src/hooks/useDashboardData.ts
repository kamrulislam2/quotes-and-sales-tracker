'use client';

import { useState, useEffect, useCallback } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import { Profile, RecordItem, FileType } from '@/types';
import { toast } from 'react-hot-toast';

export const useDashboardData = () => {
  const router = useRouter();
  const [sessionUser, setSessionUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Helper to update last activity timestamp in localStorage
  const updateLastActivity = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('quotes_sales_last_activity', String(Date.now()));
    }
  }, []);

  // Records and Profiles lists
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [profilesList, setProfilesList] = useState<Profile[]>([]);
  const [availableDates, setAvailableDates] = useState<{ year: string; month: string }[]>([]);

  // Theme Toggle state
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Filter States
  const [selectedYear, setSelectedYear] = useState<string>(() => new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>(() => String(new Date().getMonth() + 1).padStart(2, '0'));

  // Show a message using react-hot-toast
  const showToast = useCallback((type: 'success' | 'error', text: string) => {
    if (type === 'success') {
      toast.success(text);
    } else {
      toast.error(text);
    }
  }, []);

  // Fetch all records for the selected Month & Year
  const fetchRecords = useCallback(async () => {
    if (!sessionUser || !profile) return;

    try {
      // Start and end of the selected month
      const startOfMonth = `${selectedYear}-${selectedMonth}-01T00:00:00.000Z`;
      // Get last day of month
      const daysInMonth = new Date(parseInt(selectedYear, 10), parseInt(selectedMonth, 10), 0).getDate();
      const endOfMonth = `${selectedYear}-${selectedMonth}-${daysInMonth}T23:59:59.999Z`;

      let allData: RecordItem[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const from = page * pageSize;
        const to = from + pageSize - 1;

        let query = supabase
          .from('records')
          .select(`
            *,
            profiles (username, full_name)
          `)
          .gte('submitted_at', startOfMonth)
          .lte('submitted_at', endOfMonth)
          .order('submitted_at', { ascending: false })
          .range(from, to);

        // If user is a normal user, only fetch their own records
        if (profile.role !== 'admin') {
          query = query.eq('user_id', sessionUser.id);
        }

        const { data, error } = await query;
        if (error) throw error;

        if (data && data.length > 0) {
          allData = [...allData, ...data];
          if (data.length < pageSize) {
            hasMore = false;
          } else {
            page++;
          }
        } else {
          hasMore = false;
        }
      }

      setRecords(allData);

      // If Admin, also fetch the list of profiles
      if (profile.role === 'admin') {
        const { data: profiles, error: profError } = await supabase
          .from('profiles')
          .select('*')
          .order('username', { ascending: true });
        if (profError) throw profError;
        setProfilesList(profiles || []);
      }
    } catch (err) {
      console.error('Error fetching records:', err);
      showToast('error', 'Error loading data: ' + (err instanceof Error ? err.message : String(err)));
    }
  }, [sessionUser, profile, selectedYear, selectedMonth, showToast]);

  // Fetch unique month/year dates that contain submitted records for the logged-in user (or anyone if admin)
  const fetchAvailableDates = useCallback(async () => {
    if (!sessionUser || !profile) return;
    try {
      let allData: { submitted_at: string | null }[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const from = page * pageSize;
        const to = from + pageSize - 1;

        let query = supabase
          .from('records')
          .select('submitted_at')
          .range(from, to);

        if (profile.role !== 'admin') {
          query = query.eq('user_id', sessionUser.id);
        }

        const { data, error } = await query;
        if (error) throw error;

        if (data && data.length > 0) {
          allData = [...allData, ...data];
          if (data.length < pageSize) {
            hasMore = false;
          } else {
            page++;
          }
        } else {
          hasMore = false;
        }
      }

      const datesSet = new Set<string>();
      
      // Always include current year-month
      const now = new Date();
      const currentYearStr = now.getFullYear().toString();
      const currentMonthStr = String(now.getMonth() + 1).padStart(2, '0');
      datesSet.add(`${currentYearStr}-${currentMonthStr}`);

      allData.forEach(r => {
        if (r.submitted_at) {
          const date = new Date(r.submitted_at);
          if (!isNaN(date.getTime())) {
            const y = date.getFullYear().toString();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            datesSet.add(`${y}-${m}`);
          }
        }
      });

      const parsedDates = Array.from(datesSet).map(s => {
        const [year, month] = s.split('-');
        return { year, month };
      });

      setAvailableDates(parsedDates);
    } catch (err) {
      console.error('Error fetching available dates:', err);
    }
  }, [sessionUser, profile]);

  // Add a new Quote or Sales Entry
  const addRecord = async (
    fileName: string,
    branchName: string,
    codename: string,
    fileType: FileType,
    customUserId?: string,
    customSubmittedAt?: string
  ) => {
    if (!sessionUser) return false;
    setSubmitting(true);
    updateLastActivity();

    try {
      const targetUserId = customUserId || sessionUser.id;
      const targetSubmittedAt = customSubmittedAt || new Date().toISOString();

      const { error } = await supabase
        .from('records')
        .insert({
          user_id: targetUserId,
          file_name: fileName,
          branch_name: branchName.toUpperCase().trim(),
          codename: codename.toUpperCase().trim(),
          file_type: fileType,
          submitted_at: targetSubmittedAt
        });

      if (error) throw error;

      showToast('success', 'Data entry saved successfully!');
      await fetchRecords();
      await fetchAvailableDates();
      setSubmitting(false);
      return true;
    } catch (err) {
      console.error('Error adding record:', err);
      showToast('error', 'Failed to save data: ' + (err instanceof Error ? err.message : String(err)));
      setSubmitting(false);
      return false;
    }
  };

  // Delete a Record
  const deleteRecord = async (id: string) => {
    updateLastActivity();
    try {
      const { error } = await supabase
        .from('records')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showToast('success', 'Record deleted successfully!');
      await fetchRecords();
      await fetchAvailableDates();
      return true;
    } catch (err) {
      console.error('Error deleting record:', err);
      showToast('error', 'Failed to delete record: ' + (err instanceof Error ? err.message : String(err)));
      return false;
    }
  };

  // Update/Edit a Record
  const updateRecord = async (
    id: string,
    fileName: string,
    branchName: string,
    codename: string,
    fileType: FileType,
    submittedAt?: string
  ) => {
    updateLastActivity();
    try {
      const updates: {
        file_name: string;
        branch_name: string;
        codename: string;
        file_type: FileType;
        submitted_at?: string;
      } = {
        file_name: fileName,
        branch_name: branchName.toUpperCase().trim(),
        codename: codename.toUpperCase().trim(),
        file_type: fileType
      };

      if (submittedAt) {
        updates.submitted_at = submittedAt;
      }

      const { error } = await supabase
        .from('records')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      showToast('success', 'Record updated successfully!');
      await fetchRecords();
      await fetchAvailableDates();
      return true;
    } catch (err) {
      console.error('Error updating record:', err);
      showToast('error', 'Failed to update record: ' + (err instanceof Error ? err.message : String(err)));
      return false;
    }
  };
  const createUser = async (username: string, role: 'admin' | 'user', fullName: string, allowedTypes: string[], password?: string) => {
    const activePassword = password || '1234';
    setSubmitting(true);

    try {
      const { data, error } = await supabase.rpc('create_new_user', {
        p_username: username.toUpperCase().trim(),
        p_password: activePassword,
        p_role: role,
        p_full_name: fullName,
        p_allowed_types: allowedTypes
      });

      if (error) throw error;

      // Handle the return format from the function (array of { success, message })
      const result = Array.isArray(data) ? data[0] : data;

      if (result && result.success === false) {
        showToast('error', result.message || 'Failed to create user.');
        setSubmitting(false);
        return null;
      }

      showToast('success', `User created successfully! Password: ${activePassword}`);
      
      // Refresh the profiles list
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .order('username', { ascending: true });
      if (profiles) setProfilesList(profiles);

      setSubmitting(false);
      return activePassword; // return the password so admin can copy it
    } catch (err) {
      console.error('Error creating user:', err);
      showToast('error', 'Error creating user: ' + (err instanceof Error ? err.message : String(err)));
      setSubmitting(false);
      return null;
    }
  };

  // Admin: Reset password of another user
  const resetUserPassword = async (userId: string, newPassword: string) => {
    try {
      const { data, error } = await supabase.rpc('admin_update_user_credentials', {
        p_user_id: userId,
        p_new_password: newPassword
      });

      if (error) throw error;
      const result = Array.isArray(data) ? data[0] : data;

      if (result && result.success === false) {
        showToast('error', result.message || 'Failed to reset password.');
        return false;
      }

      showToast('success', 'Password changed successfully!');
      return true;
    } catch (err) {
      console.error('Error resetting password:', err);
      showToast('error', 'Error changing password: ' + (err instanceof Error ? err.message : String(err)));
      return false;
    }
  };

  // Admin: Delete user
  const deleteUser = async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc('delete_user_by_id', {
        p_user_id: userId
      });

      if (error) throw error;
      const result = Array.isArray(data) ? data[0] : data;

      if (result && result.success === false) {
        showToast('error', result.message || 'Failed to delete user.');
        return false;
      }

      showToast('success', 'User deleted successfully!');
      setProfilesList(prev => prev.filter(p => p.id !== userId));
      return true;
    } catch (err) {
      console.error('Error deleting user:', err);
      showToast('error', 'Error deleting user: ' + (err instanceof Error ? err.message : String(err)));
      return false;
    }
  };

  // Admin: Update user profile details
  const adminUpdateUserProfile = async (userId: string, fullName: string, role: 'admin' | 'user', allowedTypes: string[]) => {
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim() || null,
          role,
          allowed_types: allowedTypes
        })
        .eq('id', userId);

      if (error) throw error;

      showToast('success', 'User profile updated successfully!');
      
      // Refresh profiles list
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .order('username', { ascending: true });
      if (profiles) setProfilesList(profiles);

      setSubmitting(false);
      return true;
    } catch (err) {
      console.error('Error updating user profile:', err);
      showToast('error', 'Error updating profile: ' + (err instanceof Error ? err.message : String(err)));
      setSubmitting(false);
      return false;
    }
  };

  // Logged-in user complete first-time setup (Customizes username, full name and password)
  const completeFirstTimeSetup = async (username: string, fullName: string, password: string) => {
    if (!sessionUser) return false;
    setSubmitting(true);

    try {
      // 1. Call complete_profile_setup RPC first to update username, full_name, and mark has_changed_password = true
      const { data, error: rpcError } = await supabase.rpc('complete_profile_setup', {
        p_username: username.toUpperCase().trim(),
        p_full_name: fullName.trim()
      });

      if (rpcError) throw rpcError;
      const result = Array.isArray(data) ? data[0] : data;

      if (result && result.success === false) {
        showToast('error', result.message || 'Failed to complete setup.');
        setSubmitting(false);
        return false;
      }

      // 2. Update password using official client SDK second
      const { error: authError } = await supabase.auth.updateUser({
        password: password
      });

      if (authError) {
        // If the password is the same as the current password (e.g. they already set it but has_changed_password was reset to false),
        // we treat this as success because the password has already been successfully changed.
        const isSamePassword = authError.message?.toLowerCase().includes('different from') ||
                               authError.message?.toLowerCase().includes('same password');
        if (!isSamePassword) {
          throw authError;
        }
      }

      showToast('success', 'Profile and password saved successfully!');
      
      // Reload profile
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sessionUser.id)
        .maybeSingle();

      if (userProfile) {
        setProfile(userProfile as Profile);
      }

      setSubmitting(false);
      return true;
    } catch (err) {
      console.error('Error completing first-time setup:', err);
      showToast('error', 'Error during setup: ' + (err instanceof Error ? err.message : String(err)));
      setSubmitting(false);
      return false;
    }
  };

  // Change Own Password (called when force changed via profile settings if desired)
  const changeOwnPassword = async (newPassword: string) => {
    if (!sessionUser) return false;
    setSubmitting(true);

    try {
      const { error: authError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (authError) throw authError;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ has_changed_password: true })
        .eq('id', sessionUser.id);

      if (profileError) throw profileError;

      setProfile(prev => prev ? { ...prev, has_changed_password: true } : null);
      showToast('success', 'Password updated successfully!');
      setSubmitting(false);
      return true;
    } catch (err) {
      console.error('Error changing password:', err);
      showToast('error', 'Error updating password: ' + (err instanceof Error ? err.message : String(err)));
      setSubmitting(false);
      return false;
    }
  };

  // Theme configuration
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') || 'dark';
      setTheme(savedTheme as 'dark' | 'light');
      if (savedTheme === 'light') {
        document.documentElement.classList.remove('dark');
      } else {
        document.documentElement.classList.add('dark');
      }
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', nextTheme);
    }
    if (nextTheme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  };

  // Fetch session on load
  useEffect(() => {
    const getSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (!session) {
          router.push('/login');
          return;
        }

        // Check last activity timestamp for 21 days inactivity logout
        if (typeof window !== 'undefined') {
          const lastActivity = localStorage.getItem('quotes_sales_last_activity');
          const limitMs = 21 * 24 * 60 * 60 * 1000; // 21 days
          const currentTime = Date.now();

          if (lastActivity) {
            const lastTime = parseInt(lastActivity, 10);
            if (!isNaN(lastTime) && currentTime - lastTime > limitMs) {
              console.warn('Session expired due to 21 days of inactivity.');
              localStorage.removeItem('quotes_sales_last_activity');
              await supabase.auth.signOut();
              showToast('error', 'Logged out due to 21 days of inactivity.');
              router.push('/login');
              return;
            }
          }
          localStorage.setItem('quotes_sales_last_activity', String(currentTime));
        }

        const userId = session.user.id;
        setSessionUser(session.user);

        // Fetch user profile
        const { data: userProfile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (profileError || !userProfile) {
          console.error('User profile not found. Logging out.', profileError);
          await supabase.auth.signOut();
          router.push('/login');
          return;
        }

        setProfile(userProfile as Profile);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching session/profile on load:', err);
        setLoading(false);
        router.push('/login');
      }
    };

    getSession();
  }, [router, showToast]);

  // Fetch records once authenticated & loaded
  useEffect(() => {
    if (!loading && sessionUser && profile) {
      fetchRecords();
      fetchAvailableDates();
    }
  }, [loading, sessionUser, profile, selectedYear, selectedMonth, fetchRecords, fetchAvailableDates]);

  // Network Status Monitor
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      const handleOnline = () => {
        setIsOnline(true);
        showToast('success', 'You are back online.');
        fetchRecords();
      };
      const handleOffline = () => {
        setIsOnline(false);
        showToast('error', 'Your internet connection is offline.');
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, [fetchRecords, showToast]);

  // Real-time Database Subscriptions
  useEffect(() => {
    if (!sessionUser) return;

    const recordsChannel = supabase
      .channel('realtime-records-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'records' },
        () => {
          fetchRecords();
          fetchAvailableDates();
        }
      )
      .subscribe();

    const profilesChannel = supabase
      .channel('realtime-profiles-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        (payload) => {
          if (payload.eventType === 'DELETE' && payload.old && payload.old.id === sessionUser.id) {
            console.log('User profile deleted. Force logging out...');
            supabase.auth.signOut().then(() => {
              setSessionUser(null);
              setProfile(null);
              router.push('/login');
              router.refresh();
            });
            return;
          }
          if (payload.eventType === 'UPDATE' && payload.new && payload.new.id === sessionUser.id) {
            setProfile(payload.new as Profile);
          }
          // Refresh profiles list for admin
          if (profile?.role === 'admin') {
            supabase
              .from('profiles')
              .select('*')
              .order('username', { ascending: true })
              .then(({ data }) => {
                if (data) setProfilesList(data || []);
              });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(recordsChannel);
      supabase.removeChannel(profilesChannel);
    };
  }, [sessionUser, profile, fetchRecords, fetchAvailableDates, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return {
    sessionUser,
    profile,
    loading,
    submitting,
    isOnline,
    showToast,
    records,
    profilesList,
    theme,
    toggleTheme,
    selectedYear,
    setSelectedYear,
    selectedMonth,
    setSelectedMonth,
    availableDates,
    fetchAvailableDates,
    fetchRecords,
    addRecord,
    deleteRecord,
    updateRecord,
    createUser,
    resetUserPassword,
    deleteUser,
    adminUpdateUserProfile,
    changeOwnPassword,
    completeFirstTimeSetup,
    handleLogout
  };
};
