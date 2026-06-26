'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import { Profile, RecordItem, FileType, AuditLogItem } from '@/types';
import { toast } from 'react-hot-toast';
import {
  saveOfflineRecord,
  saveOfflineUpdate,
  saveOfflineDelete,
  getOfflineRecords,
  deleteOfflineRecord,
  syncOfflineData,
  setCacheData,
  getCacheData,
  mergeCacheData,
  getSyncTimestamp,
  setSyncTimestamp,
  purgeStaleCacheData,
  updateOfflineRecordAction,
  deleteCacheItem,
  clearAllCache
} from '@/utils/offlineSync';

export const useDashboardData = () => {
  const router = useRouter();
  const [sessionUser, setSessionUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [initialFetchDone, setInitialFetchDone] = useState(false);
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

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditLogsLoading, setAuditLogsLoading] = useState(false);

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
  const fetchRecords = useCallback(async (isSilent: boolean = false) => {
    if (!sessionUser || !profile) return;
    if (!isSilent) setRecordsLoading(true);

    try {
      if (navigator.onLine) {
        try {
          // 0. Self-healing check: if the user switched accounts or local cache was wiped, clear database cache for full fresh sync
          const cachedUserId = await getSyncTimestamp('active_user_id');
          const localCachedItems = await getCacheData<RecordItem>('records_cache');
          
          if (cachedUserId !== sessionUser.id || localCachedItems.length === 0) {
            console.log('User session changed or cache empty. Clearing client cache for a fresh full sync...');
            await clearAllCache();
            await setSyncTimestamp('active_user_id', sessionUser.id);
          }

          // 1. Sync pending offline mutations first
          try {
            const syncRes = await syncOfflineData();
            if (syncRes.success && syncRes.syncedCount > 0) {
              console.log(`Synced ${syncRes.syncedCount} offline record actions.`);
              showToast('success', `Synced ${syncRes.syncedCount} offline actions to the server.`);
            }
            if (syncRes.conflicts && syncRes.conflicts.length > 0) {
              syncRes.conflicts.forEach(c => {
                showToast('error', c.reason);
              });
            }
          } catch (syncErr) {
            console.error('Failed to sync offline data before fetch:', syncErr);
          }

          // 2. Fetch data (Delta Pull vs Full Fetch)
          const lastSynced = await getSyncTimestamp('records');

          if (lastSynced) {
            // Subtract 30 seconds to account for clock skew/latency between server and client
            const syncDate = new Date(lastSynced);
            syncDate.setSeconds(syncDate.getSeconds() - 30);
            const bufferedSyncTimestamp = syncDate.toISOString();

            // Fetch changes since last sync paginated to bypass the 1000 PostgREST row limit
            let deltaData: RecordItem[] = [];
            let deltaPage = 0;
            const deltaPageSize = 1000;
            let deltaHasMore = true;

            while (deltaHasMore) {
              const from = deltaPage * deltaPageSize;
              const to = from + deltaPageSize - 1;

              let query = supabase
                .from('records')
                .select(`
                  *,
                  profiles (username, full_name)
                `)
                .gte('updated_at', bufferedSyncTimestamp)
                .range(from, to);

              if (profile.role !== 'admin') {
                query = query.eq('user_id', sessionUser.id);
              }

              const { data: pageData, error: pageError } = await query;
              if (pageError) throw pageError;

              if (pageData && pageData.length > 0) {
                deltaData = [...deltaData, ...pageData];
                if (pageData.length < deltaPageSize) {
                  deltaHasMore = false;
                } else {
                  deltaPage++;
                }
              } else {
                deltaHasMore = false;
              }
            }

            if (deltaData && deltaData.length > 0) {
              // Merge delta changes into local IndexedDB cache
              await mergeCacheData('records_cache', deltaData);
            }
            // Set new sync timestamp
            await setSyncTimestamp('records', new Date().toISOString());
          } else {
            // First Sync: Pull all records from database to populate cache
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

            // Set cache data with full load
            await setCacheData('records_cache', allData);
            await setSyncTimestamp('records', new Date().toISOString());
          }

          // Clean up cache older than 2 years
          try {
            await purgeStaleCacheData('records_cache', 'submitted_at', 730);
          } catch (purgeErr) {
            console.error('Failed to purge stale cache:', purgeErr);
          }

          // If Admin, also fetch and cache the profiles list
          if (profile.role === 'admin') {
            const { data: profiles, error: profError } = await supabase
              .from('profiles')
              .select('*')
              .order('username', { ascending: true });
            
            if (profError) throw profError;
            await setCacheData('profiles_cache', profiles || []);
            setProfilesList(profiles || []);
          }

          // Active cache pruning (Re-enabled after database recovery)
          try {
            const yearNum = parseInt(selectedYear, 10);
            const monthNum = parseInt(selectedMonth, 10);
            const startDate = new Date(Date.UTC(yearNum, monthNum - 1, 1, 0, 0, 0, 0)).toISOString();
            const endDate = new Date(Date.UTC(yearNum, monthNum, 0, 23, 59, 59, 999)).toISOString();
          
            // Fetch valid server IDs for the current month and user role paginated to bypass PostgREST limit
            let serverIds: { id: string }[] = [];
            let idPage = 0;
            const idPageSize = 1000;
            let idHasMore = true;
          
            while (idHasMore) {
              const from = idPage * idPageSize;
              const to = from + idPageSize - 1;
          
              let pageQuery = supabase
                .from('records')
                .select('id')
                .gte('submitted_at', startDate)
                .lte('submitted_at', endDate)
                .range(from, to);
          
              if (profile.role !== 'admin') {
                pageQuery = pageQuery.eq('user_id', sessionUser.id);
              }
          
              const { data: pageData, error: pageError } = await pageQuery;
              if (pageError) throw pageError;
          
              if (pageData && pageData.length > 0) {
                serverIds = [...serverIds, ...pageData];
                if (pageData.length < idPageSize) {
                  idHasMore = false;
                } else {
                  idPage++;
                }
              } else {
                idHasMore = false;
              }
            }
          
            const serverIdSet = new Set(serverIds.map(row => row.id));
            
            // Get cached records for the current user/admin matching selectedMonth & selectedYear
            const localCached = await getCacheData<RecordItem>('records_cache');
            const localMonthRecords = localCached.filter(r => {
              if (profile.role !== 'admin' && r.user_id !== sessionUser.id) return false;
              if (!r.submitted_at) return false;
              const date = new Date(r.submitted_at);
              const y = date.getFullYear().toString();
              const m = String(date.getMonth() + 1).padStart(2, '0');
              return y === selectedYear && m === selectedMonth;
            });
          
            // Get pending unsynced insertions to make sure we don't prune them
            const pending = await getOfflineRecords();
            const pendingInsertIds = new Set(
              pending.filter(p => p.action === 'insert').map(p => p.localId)
            );
          
            // Delete cached records that are not on the server and not in pending outbox
            for (const r of localMonthRecords) {
              if (!serverIdSet.has(r.id) && !pendingInsertIds.has(r.id)) {
                await deleteCacheItem('records_cache', r.id);
              }
            }
          } catch (pruneErr) {
            console.error('Active cache pruning failed:', pruneErr);
          }
        } catch (netError) {
          console.error('Network sync/fetch failed, falling back to cache:', netError);
          showToast('error', 'Network error. Loading offline cache...');
        }
      }

      // 3. Load aggregated records from local IndexedDB cache (works both Online and Offline)
      const cachedRecords = await getCacheData<RecordItem>('records_cache');

      // DANGER RECOVERY AUTO-RESTORE TRIGGER
      if (profile && profile.role === 'admin' && cachedRecords.length > 100) {
        try {
          const { count, error: countErr } = await supabase
            .from('records')
            .select('id', { count: 'exact', head: true });
          
          if (!countErr && count === 0) {
            console.log(`RECOVERY: Server records count is 0. Starting automated restoration of ${cachedRecords.length} records...`);
            showToast('success', `Restoring ${cachedRecords.length} records from local cache. Please do not close the app...`);
            
            // Upload in batches of 100
            const batchSize = 100;
            let successCount = 0;
            for (let i = 0; i < cachedRecords.length; i += batchSize) {
              const batch = cachedRecords.slice(i, i + batchSize).map(r => ({
                user_id: r.user_id,
                file_name: r.file_name,
                branch_name: r.branch_name,
                codename: r.codename,
                file_type: r.file_type,
                submitted_at: r.submitted_at,
                created_at: r.created_at
              }));
              
              const { error: insertError } = await supabase.from('records').insert(batch);
              if (insertError) {
                console.error(`RECOVERY: Error restoring batch ${i}:`, insertError);
              } else {
                successCount += batch.length;
                console.log(`RECOVERY: Restored batch ${i} to ${i + batch.length}`);
              }
            }
            showToast('success', `Database successfully restored! ${successCount} records uploaded.`);
          }
        } catch (restoreErr) {
          console.error('RECOVERY: Automatic database restore failed:', restoreErr);
        }
      }
      
      // Filter the cached records in-memory based on selectedMonth/selectedYear and user permissions
      const filtered = cachedRecords.filter(r => {
        if (!r.submitted_at) return false;
        
        // Check role permission
        if (profile.role !== 'admin' && r.user_id !== sessionUser.id) return false;
        
        // Check year-month matching
        const date = new Date(r.submitted_at);
        if (isNaN(date.getTime())) return false;
        
        const y = date.getFullYear().toString();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        return y === selectedYear && m === selectedMonth;
      });

      // Sort by submitted_at descending
      filtered.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());
      
      setRecords(filtered);

      // If Offline or Net Error & Admin, load profiles list from cache
      if (profile.role === 'admin') {
        const cachedProfiles = await getCacheData<Profile>('profiles_cache');
        setProfilesList(prev => {
          if (prev.length === 0 || !navigator.onLine) {
            return cachedProfiles;
          }
          return prev;
        });
      }

    } catch (err) {
      console.error('Error fetching records:', err);
      showToast('error', 'Error loading data: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setRecordsLoading(false);
      setInitialFetchDone(true);
    }
  }, [sessionUser, profile, selectedYear, selectedMonth, showToast]);

  // Fetch unique month/year dates that contain submitted records for the logged-in user (or anyone if admin)
  const fetchAvailableDates = useCallback(async () => {
    if (!sessionUser || !profile) return;
    try {
      let earliestDate: Date | null = null;
      let latestDate: Date | null = null;

      if (navigator.onLine) {
        try {
          // Optimized: fetch only the earliest and latest submitted_at to determine
          // the range of year-month pairs, instead of paginating through ALL records.
          let earliestQuery = supabase
            .from('records')
            .select('submitted_at')
            .order('submitted_at', { ascending: true })
            .limit(1);

          let latestQuery = supabase
            .from('records')
            .select('submitted_at')
            .order('submitted_at', { ascending: false })
            .limit(1);

          if (profile.role !== 'admin') {
            earliestQuery = earliestQuery.eq('user_id', sessionUser.id);
            latestQuery = latestQuery.eq('user_id', sessionUser.id);
          }

          const [earliestResult, latestResult] = await Promise.all([earliestQuery, latestQuery]);

          if (earliestResult.error) throw earliestResult.error;
          if (latestResult.error) throw latestResult.error;

          earliestDate = earliestResult.data?.[0]?.submitted_at ? new Date(earliestResult.data[0].submitted_at) : null;
          latestDate = latestResult.data?.[0]?.submitted_at ? new Date(latestResult.data[0].submitted_at) : null;
        } catch (netError) {
          console.error('Failed to fetch available dates online, falling back to cache:', netError);
          // Offline: read min/max from IndexedDB cache
          const cached = await getCacheData<RecordItem>('records_cache');
          const userRecords = cached.filter(r => profile.role === 'admin' || r.user_id === sessionUser.id);
          if (userRecords.length > 0) {
            const dates = userRecords
              .map(r => r.submitted_at ? new Date(r.submitted_at).getTime() : 0)
              .filter(t => t > 0);
            if (dates.length > 0) {
              earliestDate = new Date(Math.min(...dates));
              latestDate = new Date(Math.max(...dates));
            }
          }
        }
      } else {
        // Offline: read min/max from IndexedDB cache
        const cached = await getCacheData<RecordItem>('records_cache');
        const userRecords = cached.filter(r => profile.role === 'admin' || r.user_id === sessionUser.id);
        if (userRecords.length > 0) {
          const dates = userRecords
            .map(r => r.submitted_at ? new Date(r.submitted_at).getTime() : 0)
            .filter(t => t > 0);
          if (dates.length > 0) {
            earliestDate = new Date(Math.min(...dates));
            latestDate = new Date(Math.max(...dates));
          }
        }
      }

      const datesSet = new Set<string>();

      // Always include current year-month
      const now = new Date();
      const currentYearStr = now.getFullYear().toString();
      const currentMonthStr = String(now.getMonth() + 1).padStart(2, '0');
      datesSet.add(`${currentYearStr}-${currentMonthStr}`);

      if (earliestDate && !isNaN(earliestDate.getTime()) && latestDate && !isNaN(latestDate.getTime())) {
        // Generate all year-month pairs in the range [earliest, latest]
        const cursor = new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1);
        const end = new Date(latestDate.getFullYear(), latestDate.getMonth(), 1);

        while (cursor <= end) {
          const y = cursor.getFullYear().toString();
          const m = String(cursor.getMonth() + 1).padStart(2, '0');
          datesSet.add(`${y}-${m}`);
          cursor.setMonth(cursor.getMonth() + 1);
        }
      }

      const parsedDates = Array.from(datesSet).map(s => {
        const [year, month] = s.split('-');
        return { year, month };
      });

      setAvailableDates(parsedDates);
    } catch (err) {
      console.error('Error fetching available dates:', err);
    }
  }, [sessionUser, profile]);

  // Fetch System Audit Logs (Admins only)
  const fetchAuditLogs = useCallback(async () => {
    if (!sessionUser || !profile || profile.role !== 'admin') return;
    setAuditLogsLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setAuditLogs(data || []);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setAuditLogsLoading(false);
    }
  }, [sessionUser, profile]);

  // Insert a new activity log
  const logActivity = useCallback(async (actionType: string, targetId: string | null, details: string) => {
    if (!sessionUser || !profile) return;
    try {
      await supabase.from('audit_logs').insert({
        actor_id: sessionUser.id,
        actor_codename: profile.username,
        action_type: actionType,
        target_id: targetId,
        details: details
      });
      // Automatically refresh logs if active
      if (navigator.onLine && profile.role === 'admin') {
        fetchAuditLogs();
      }
    } catch (err) {
      console.error('Failed to log audit activity:', err);
    }
  }, [sessionUser, profile, fetchAuditLogs]);

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

      if (!navigator.onLine) {
        // Save to offline outbox queue
        const newOfflineRecord = {
          user_id: targetUserId,
          file_name: fileName,
          branch_name: branchName.toUpperCase().trim(),
          codename: codename.toUpperCase().trim(),
          file_type: fileType,
          submitted_at: targetSubmittedAt
        };

        const localId = await saveOfflineRecord(newOfflineRecord);

        // Optimistically add to local cache records_cache
        const cachedRecordItem: RecordItem = {
          id: localId,
          ...newOfflineRecord,
          created_at: new Date().toISOString(),
          profiles: {
            username: codename.toUpperCase().trim(),
            full_name: profile?.full_name || null
          }
        };
        await mergeCacheData('records_cache', [cachedRecordItem]);

        await fetchRecords(true);
        await fetchAvailableDates();
        showToast('success', 'Saved offline! Data will sync when online.');
        setSubmitting(false);
        return true;
      }

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

      await fetchRecords(true);
      await fetchAvailableDates();
      showToast('success', 'Data entry saved successfully!');
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
    if (!sessionUser) return false;
    updateLastActivity();

    let recordDetails = `ID ${id}`;
    try {
      const cached = await getCacheData<RecordItem>('records_cache');
      const targetRecord = cached.find(r => r.id === id);
      if (targetRecord) {
        recordDetails = `'${targetRecord.file_name}' (${targetRecord.file_type} for ${targetRecord.branch_name}) by ${targetRecord.codename}`;
      }
    } catch (cacheErr) {
      console.error('Failed to read cache for audit log info:', cacheErr);
    }
    try {
      if (!navigator.onLine) {
        // Check if the record is a pending offline insert
        const pending = await getOfflineRecords();
        const pendingInsert = pending.find(r => r.localId === id || r.id === id);

        if (pendingInsert && pendingInsert.action === 'insert') {
          if (pendingInsert.localId) {
            await deleteOfflineRecord(pendingInsert.localId);
          }
        } else {
          // Server record, queue a deletion action
          await saveOfflineDelete(id, sessionUser.id);
        }

        // Remove from local cache optimistically
        const cached = await getCacheData<RecordItem>('records_cache');
        const updatedCache = cached.filter(r => r.id !== id);
        await setCacheData('records_cache', updatedCache);

        await fetchRecords(true);
        await fetchAvailableDates();
        showToast('success', 'Deleted offline! Data will sync when online.');
        return true;
      }

      const { error } = await supabase
        .from('records')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Audit Log
      await logActivity(
        'DELETE_RECORD',
        id,
        `Deleted record: ${recordDetails}`
      );

      // Optimistically remove from local cache immediately
      const cached = await getCacheData<RecordItem>('records_cache');
      const updatedCache = cached.filter(r => r.id !== id);
      await setCacheData('records_cache', updatedCache);

      await fetchRecords(true);
      await fetchAvailableDates();
      showToast('success', 'Record deleted successfully!');
      return true;
    } catch (err) {
      console.error('Error deleting record:', err);
      showToast('error', 'Failed to delete record: ' + (err instanceof Error ? err.message : String(err)));
      return false;
    }
  };

  // Delete multiple records (Bulk Delete)
  const deleteRecords = async (ids: string[]) => {
    if (!sessionUser) return false;
    updateLastActivity();

    // Cache info resolution for audit logging
    let deletedDetails = `${ids.length} records`;
    try {
      const cached = await getCacheData<RecordItem>('records_cache');
      const targetRecords = cached.filter(r => ids.includes(r.id));
      if (targetRecords.length > 0) {
        deletedDetails = targetRecords
          .map(r => `'${r.file_name}' (${r.file_type} for ${r.branch_name})`)
          .join(', ');
      }
    } catch (cacheErr) {
      console.error('Failed to read cache for audit log info:', cacheErr);
    }

    try {
      if (!navigator.onLine) {
        showToast('error', 'This action requires an active internet connection.');
        return false;
      }

      const { error } = await supabase
        .from('records')
        .delete()
        .in('id', ids);

      if (error) throw error;

      // Audit Log
      await logActivity(
        'DELETE_RECORD',
        null,
        `Deleted ${ids.length} records in bulk: ${deletedDetails}`
      );

      // Optimistically remove from local cache immediately
      const cached = await getCacheData<RecordItem>('records_cache');
      const updatedCache = cached.filter(r => !ids.includes(r.id));
      await setCacheData('records_cache', updatedCache);
      setRecords(updatedCache);

      await fetchRecords(true);
      await fetchAvailableDates();
      showToast('success', `${ids.length} records deleted successfully!`);
      return true;
    } catch (err) {
      console.error('Error deleting records in bulk:', err);
      showToast('error', 'Failed to delete records: ' + (err instanceof Error ? err.message : String(err)));
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
    if (!sessionUser) return false;
    updateLastActivity();

    let oldDetails = `ID ${id}`;
    try {
      const cached = await getCacheData<RecordItem>('records_cache');
      const targetRecord = cached.find(r => r.id === id);
      if (targetRecord) {
        oldDetails = `'${targetRecord.file_name}' (${targetRecord.file_type} for ${targetRecord.branch_name})`;
      }
    } catch (cacheErr) {
      console.error('Failed to read cache for audit log info:', cacheErr);
    }
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

      if (!navigator.onLine) {
        const pending = await getOfflineRecords();
        const pendingInsert = pending.find(r => r.localId === id || r.id === id);

        if (pendingInsert && pendingInsert.action === 'insert') {
          // Edit the pending insert record in-place in outbox
          if (pendingInsert.localId) {
            await updateOfflineRecordAction(pendingInsert.localId, {
              file_name: fileName,
              branch_name: branchName.toUpperCase().trim(),
              codename: codename.toUpperCase().trim(),
              file_type: fileType,
              submitted_at: submittedAt || pendingInsert.submitted_at
            });
          }
        } else {
          // Server record, queue an update action
          await saveOfflineUpdate(id, sessionUser.id, updates);
        }

        // Update local cache optimistically
        const cached = await getCacheData<RecordItem>('records_cache');
        const updatedCache = cached.map(r => {
          if (r.id === id) {
            return {
              ...r,
              ...updates,
              profiles: {
                username: codename.toUpperCase().trim(),
                full_name: r.profiles?.full_name || null
              }
            };
          }
          return r;
        });
        await setCacheData('records_cache', updatedCache);

        await fetchRecords(true);
        await fetchAvailableDates();
        showToast('success', 'Updated offline! Data will sync when online.');
        return true;
      }

      const { error } = await supabase
        .from('records')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      // Audit Log
      await logActivity(
        'UPDATE_RECORD',
        id,
        `Updated record ${oldDetails} -> '${fileName}' (${fileType} for ${branchName.toUpperCase().trim()})`
      );

      await fetchRecords(true);
      await fetchAvailableDates();
      showToast('success', 'Record updated successfully!');
      return true;
    } catch (err) {
      console.error('Error updating record:', err);
      showToast('error', 'Failed to update record: ' + (err instanceof Error ? err.message : String(err)));
      return false;
    }
  };
  const createUser = async (username: string, role: 'admin' | 'user', fullName: string, allowedTypes: string[], canManageRules: boolean, password?: string) => {
    if (!navigator.onLine) {
      showToast('error', 'This action requires an active internet connection.');
      return null;
    }
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

      // Update the newly created user profile with can_manage_rules
      const { data: newProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username.toUpperCase().trim())
        .single();
      
      if (newProfile && canManageRules) {
        await supabase
          .from('profiles')
          .update({ can_manage_rules: true })
          .eq('id', newProfile.id);
      }

      // Audit Log
      await logActivity(
        'CREATE_USER',
        null,
        `Created new user account '${username.toUpperCase().trim()}' (${fullName}) with role '${role}'${canManageRules ? ' [Quote Rules Permission Granted]' : ''}`
      );

      // Refresh the profiles list
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .order('username', { ascending: true });
      if (profiles) setProfilesList(profiles);

      showToast('success', `User created successfully! Password: ${activePassword}`);

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
    if (!navigator.onLine) {
      showToast('error', 'This action requires an active internet connection.');
      return false;
    }
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

      // Audit Log
      const targetProfile = profilesList.find(p => p.id === userId);
      const targetName = targetProfile ? `${targetProfile.username} (${targetProfile.full_name || 'N/A'})` : `ID ${userId}`;
      await logActivity(
        'RESET_PASSWORD',
        userId,
        `Reset password for user: ${targetName}`
      );

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
    if (!navigator.onLine) {
      showToast('error', 'This action requires an active internet connection.');
      return false;
    }
    updateLastActivity();
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

      // Audit Log
      const targetProfile = profilesList.find(p => p.id === userId);
      const targetName = targetProfile ? `${targetProfile.username} (${targetProfile.full_name || 'N/A'})` : `ID ${userId}`;
      await logActivity(
        'DELETE_USER',
        userId,
        `Deleted user account: ${targetName}`
      );

      setProfilesList(prev => prev.filter(p => p.id !== userId));
      showToast('success', 'User deleted successfully!');
      return true;
    } catch (err) {
      console.error('Error deleting user:', err);
      showToast('error', 'Error deleting user: ' + (err instanceof Error ? err.message : String(err)));
      return false;
    }
  };

  // Admin: Update user profile details
  const adminUpdateUserProfile = async (userId: string, fullName: string, role: 'admin' | 'user', allowedTypes: string[], canManageRules: boolean) => {
    if (!navigator.onLine) {
      showToast('error', 'This action requires an active internet connection.');
      return false;
    }
    updateLastActivity();
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim() || null,
          role,
          allowed_types: allowedTypes,
          can_manage_rules: canManageRules
        })
        .eq('id', userId);

      if (error) throw error;

      // Try to resolve target user info and track specific changes
      const targetProfile = profilesList.find(p => p.id === userId);
      const targetName = targetProfile ? `${targetProfile.username}` : `ID ${userId}`;

      const changes: string[] = [];
      if (targetProfile) {
        const oldName = (targetProfile.full_name || '').trim();
        const newName = fullName.trim();
        if (oldName !== newName) {
          changes.push(`Name: '${oldName}' → '${newName}'`);
        }

        const oldRole = targetProfile.role;
        const newRole = role;
        if (oldRole !== newRole) {
          changes.push(`Role: '${oldRole}' → '${newRole}'`);
        }

        const oldAllowed = [...(targetProfile.allowed_types || [])].sort();
        const newAllowed = [...allowedTypes].sort();
        const oldAllowedStr = oldAllowed.join(', ');
        const newAllowedStr = newAllowed.sort().join(', ');

        if (oldAllowedStr !== newAllowedStr) {
          const added = allowedTypes.filter(x => !(targetProfile.allowed_types || []).includes(x));
          const removed = (targetProfile.allowed_types || []).filter(x => !allowedTypes.includes(x));

          const permChanges: string[] = [];
          if (added.length > 0) {
            permChanges.push(`Granted: [${added.join(', ')}]`);
          }
          if (removed.length > 0) {
            permChanges.push(`Revoked: [${removed.join(', ')}]`);
          }
          changes.push(`Permissions: ${permChanges.join(' & ')}`);
        }

        const oldCanManage = !!targetProfile.can_manage_rules;
        const newCanManage = canManageRules;
        if (oldCanManage !== newCanManage) {
          changes.push(`Quote Rules Permission: '${oldCanManage}' → '${newCanManage}'`);
        }
      } else {
        changes.push(`Name: '${fullName.trim()}', Role: '${role}', Allowed Types: [${allowedTypes.join(', ')}], Quote Rules Permission: ${canManageRules}`);
      }

      const logDetails = changes.length > 0 
        ? `Updated user '${targetName}' properties (${changes.join(' | ')})`
        : `Updated user '${targetName}' (no changes made)`;

      // Audit Log
      await logActivity(
        'UPDATE_USER',
        userId,
        logDetails
      );

      // Refresh profiles list
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .order('username', { ascending: true });
      if (profiles) setProfilesList(profiles);

      showToast('success', 'User profile updated successfully!');

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
    if (!navigator.onLine) {
      showToast('error', 'This action requires an active internet connection.');
      return false;
    }
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

      // Reload profile
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sessionUser.id)
        .maybeSingle();

      if (userProfile) {
        setProfile(userProfile as Profile);
        if (typeof window !== 'undefined') {
          localStorage.setItem('quotes_sales_profile', JSON.stringify(userProfile));
        }
      }

      // Audit Log
      await logActivity(
        'ONBOARD_USER',
        null,
        `Completed onboarding & customized profile (Codename: ${username.toUpperCase().trim()}, Name: ${fullName})`
      );

      showToast('success', 'Profile and password saved successfully!');

      setSubmitting(false);
      return true;
    } catch (err) {
      console.error('Error completing first-time setup:', err);
      showToast('error', 'Error during setup: ' + (err instanceof Error ? err.message : String(err)));
      setSubmitting(false);
      return false;
    }
  };


  // Theme configuration
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      let initialTheme: 'dark' | 'light' = 'dark';
      
      if (savedTheme === 'dark' || savedTheme === 'light') {
        initialTheme = savedTheme;
      } else {
        // System preference detection (Method 1)
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        initialTheme = prefersDark ? 'dark' : 'light';
      }

      setTheme(initialTheme);
      if (initialTheme === 'light') {
        document.documentElement.classList.remove('dark');
      } else {
        document.documentElement.classList.add('dark');
      }

      // Live listener for system theme preference changes
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleSystemThemeChange = (e: MediaQueryListEvent) => {
        // Only change theme if user hasn't explicitly set a preference in localStorage
        if (!localStorage.getItem('theme')) {
          const newTheme = e.matches ? 'dark' : 'light';
          setTheme(newTheme);
          if (newTheme === 'light') {
            document.documentElement.classList.remove('dark');
          } else {
            document.documentElement.classList.add('dark');
          }
        }
      };

      // Use the modern API and fallback for older environments if needed
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleSystemThemeChange);
      } else {
        // Fallback for older browsers
        (mediaQuery as any).addListener(handleSystemThemeChange);
      }

      return () => {
        if (mediaQuery.removeEventListener) {
          mediaQuery.removeEventListener('change', handleSystemThemeChange);
        } else {
          (mediaQuery as any).removeListener(handleSystemThemeChange);
        }
      };
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
        // Create a 4-second timeout promise to prevent hanging on initial boot database locks
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Database session retrieval timed out')), 4000)
        );

        const sessionResult = await Promise.race([
          supabase.auth.getSession(),
          timeoutPromise
        ]) as { data: { session: { user: SupabaseUser } | null } | null; error: unknown };

        const session = sessionResult?.data?.session;
        const sessionError = sessionResult?.error;
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

        // Fetch user profile with its own independent timeout safety net
        let userProfile: Profile | null = null;
        let fetchSuccess = false;

        try {
          const profileTimeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Profile fetch timed out')), 4000)
          );

          const profileResult = await Promise.race([
            supabase
              .from('profiles')
              .select('*')
              .eq('id', userId)
              .maybeSingle(),
            profileTimeoutPromise
          ]) as { data: Profile | null; error: unknown };

          const profileError = profileResult?.error;
          if (profileError) throw profileError;

          if (profileResult?.data) {
            userProfile = profileResult.data;
            fetchSuccess = true;
            // Cache profile in localStorage
            if (typeof window !== 'undefined') {
              localStorage.setItem('quotes_sales_profile', JSON.stringify(userProfile));
            }
          }
        } catch (profileFetchErr) {
          console.warn('Failed to fetch profile from database, checking cache:', profileFetchErr);
        }

        // If fetch failed, try getting it from localStorage cache
        if (!fetchSuccess && typeof window !== 'undefined') {
          const cachedProfileStr = localStorage.getItem('quotes_sales_profile');
          if (cachedProfileStr) {
            try {
              userProfile = JSON.parse(cachedProfileStr);
              console.log('Successfully loaded profile from local cache (offline mode)');
            } catch (jsonErr) {
              console.error('Failed to parse cached profile:', jsonErr);
            }
          }
        }

        // If we still don't have a profile, check if we are truly offline or if it's a DB error
        if (!userProfile) {
          if (typeof navigator !== 'undefined' && navigator.onLine) {
            console.error('User profile not found. Logging out.');
            await supabase.auth.signOut();
            if (typeof window !== 'undefined') {
              localStorage.removeItem('quotes_sales_profile');
            }
            router.push('/login');
            return;
          } else {
            throw new Error('No profile cache available and connection is offline.');
          }
        }

        setProfile(userProfile);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching session/profile on load:', err);

        // Try to recover using cached profile if session is available in local storage
        if (typeof window !== 'undefined') {
          const cachedProfileStr = localStorage.getItem('quotes_sales_profile');
          if (cachedProfileStr) {
            try {
              const cachedProfile = JSON.parse(cachedProfileStr);
              setProfile(cachedProfile);
              setLoading(false);
              return;
            } catch {}
          }
        }

        // Self-healing: if the startup check timed out or failed, try reloading once to resolve locks/initialization bugs
        if (typeof window !== 'undefined') {
          const reloadCount = sessionStorage.getItem('quotes_sales_startup_reload_count') || '0';
          if (parseInt(reloadCount, 10) < 1) {
            sessionStorage.setItem('quotes_sales_startup_reload_count', '1');
            console.warn('Startup check failed or timed out. Attempting self-healing reload...');
            window.location.reload();
            return;
          }
        }

        setLoading(false);
        router.push('/login');
      }
    };

    // Delay the initial session retrieval by 200ms on startup to allow 
    // the Tauri Webview network stack and disk handles to fully initialize.
    const timer = setTimeout(() => {
      getSession();
    }, 200);

    return () => clearTimeout(timer);
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
        fetchRecords(true);
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

  // Debounce ref for real-time record change events to prevent double-fetching
  // when user's own mutations already trigger explicit fetchRecords() calls.
  const realtimeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Real-time Database Subscriptions
  useEffect(() => {
    if (!sessionUser) return;

    const recordsChannel = supabase
      .channel('realtime-records-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'records' },
        () => {
          // Debounce: coalesce rapid realtime events (e.g. own mutation + realtime echo)
          if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current);
          realtimeDebounceRef.current = setTimeout(() => {
            fetchRecords(true);
            fetchAvailableDates();
          }, 500);
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
            if (typeof window !== 'undefined') {
              localStorage.removeItem('quotes_sales_profile');
            }
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
            if (typeof window !== 'undefined') {
              localStorage.setItem('quotes_sales_profile', JSON.stringify(payload.new));
            }
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

    let auditLogsChannel: any = null;
    if (profile?.role === 'admin') {
      auditLogsChannel = supabase
        .channel('realtime-audit-logs-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'audit_logs' },
          () => {
            fetchAuditLogs();
          }
        )
        .subscribe();
    }

    return () => {
      if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current);
      supabase.removeChannel(recordsChannel);
      supabase.removeChannel(profilesChannel);
      if (auditLogsChannel) {
        supabase.removeChannel(auditLogsChannel);
      }
    };
  }, [sessionUser, profile, fetchRecords, fetchAvailableDates, fetchAuditLogs, router]);

  const handleLogout = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('quotes_sales_profile');
    }
    try {
      await clearAllCache();
    } catch (err) {
      console.error('Failed to clear cache on logout:', err);
    }
    await supabase.auth.signOut();
    router.push('/login');
  };

  return {
    sessionUser,
    profile,
    loading,
    recordsLoading,
    initialFetchDone,
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
    deleteRecords,
    updateRecord,
    createUser,
    resetUserPassword,
    deleteUser,
    adminUpdateUserProfile,
    auditLogs,
    auditLogsLoading,
    fetchAuditLogs,

    completeFirstTimeSetup,
    handleLogout,
    logActivity
  };
};
