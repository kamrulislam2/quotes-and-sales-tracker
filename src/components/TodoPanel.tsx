'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/utils/supabase';
import { Profile, TodoItem } from '@/types';
import { 
  Check, 
  Copy, 
  Plus, 
  Trash2, 
  RefreshCw, 
  CalendarDays, 
  ListTodo, 
  AlertCircle,
  Clock,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { ConfirmModal } from '@/components/modals/ConfirmModal';

interface TodoPanelProps {
  profile: Profile | null;
}

// All-time tasks are dynamically managed by the user using the "All-Time" checkbox when adding a task.

export const TodoPanel: React.FC<TodoPanelProps> = ({ profile }) => {
  const [subTab, setSubTab] = useState<'daily' | 'all'>('daily');
  const [loading, setLoading] = useState(false);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTask, setNewTask] = useState('');
  const [isAllTime, setIsAllTime] = useState(false);
  const [todoToDelete, setTodoToDelete] = useState<string | null>(null);

  // Daily State
  const [todayStr] = useState(() => new Date().toLocaleDateString('en-CA')); // Local YYYY-MM-DD

  // Archive / All State
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState(() => String(new Date().getMonth() + 1).padStart(2, '0'));
  const [archiveTodos, setArchiveTodos] = useState<TodoItem[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(false);

  const yearsList = React.useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => String(currentYear - i));
  }, []);

  const monthsList = [
    { val: '01', name: 'January' },
    { val: '02', name: 'February' },
    { val: '03', name: 'March' },
    { val: '04', name: 'April' },
    { val: '05', name: 'May' },
    { val: '06', name: 'June' },
    { val: '07', name: 'July' },
    { val: '08', name: 'August' },
    { val: '09', name: 'September' },
    { val: '10', name: 'October' },
    { val: '11', name: 'November' },
    { val: '12', name: 'December' }
  ];

  // Fetch Daily Todos and Handle Carry-Over / All-Time auto-population
  const fetchDailyTodos = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      // 1. Fetch today's existing todos
      const { data: todayData, error: todayErr } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', profile.id)
        .eq('todo_date', todayStr)
        .order('created_at', { ascending: true });

      if (todayErr) throw todayErr;

      let currentTodayTodos = todayData || [];

      // 2. If today has zero todos, perform the carry-over & all-time auto-population
      if (currentTodayTodos.length === 0) {
        const tempInserted: Partial<TodoItem>[] = [];

        // A. Carry over "Working" tasks from the most recent active day
        const { data: lastTodos, error: lastErr } = await supabase
          .from('todos')
          .select('*')
          .eq('user_id', profile.id)
          .lt('todo_date', todayStr)
          .order('todo_date', { ascending: false })
          .order('created_at', { ascending: true });

        if (lastErr) throw lastErr;

        if (lastTodos && lastTodos.length > 0) {
          const lastActiveDate = lastTodos[0].todo_date;
          // Filter tasks from that active date
          const lastActiveTodos = lastTodos.filter(
            (t) => t.todo_date === lastActiveDate
          );

          lastActiveTodos.forEach((task) => {
            // Carry over if it was 'Working' OR if it is an 'All-Time' task (recreated daily)
            const shouldCarryOver = task.status === 'Working' || task.is_all_time;
            
            if (shouldCarryOver) {
              tempInserted.push({
                user_id: profile.id,
                codename: profile.username.toUpperCase(),
                task: task.task,
                status: 'Working',
                comment: task.status === 'Working' ? (task.comment || '') : '', // reset comment if it was completed all-time task
                todo_date: todayStr,
                is_all_time: task.is_all_time
              });
            }
          });
        }

        // Insert carried-over and all-time tasks into database
        if (tempInserted.length > 0) {
          const { data: insertedData, error: insertErr } = await supabase
            .from('todos')
            .insert(tempInserted)
            .select();

          if (insertErr) throw insertErr;
          if (insertedData) {
            currentTodayTodos = insertedData;
          }
        }
      }

      setTodos(currentTodayTodos);
    } catch (err: any) {
      console.error('Failed to fetch daily todos:', err?.message || err);
      toast.error('Failed to load today\'s Todo list.');
    } finally {
      setLoading(false);
    }
  }, [profile, todayStr]);

  // Fetch Archive (All) Todos based on selected Month/Year
  const fetchArchiveTodos = useCallback(async () => {
    if (!profile) return;
    setArchiveLoading(true);
    try {
      const yearNum = parseInt(selectedYear, 10);
      const monthNum = parseInt(selectedMonth, 10);
      const lastDay = new Date(yearNum, monthNum, 0).getDate();

      const startDate = `${selectedYear}-${selectedMonth}-01`;
      const endDate = `${selectedYear}-${selectedMonth}-${String(lastDay).padStart(2, '0')}`;

      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', profile.id)
        .gte('todo_date', startDate)
        .lte('todo_date', endDate)
        .order('todo_date', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;
      setArchiveTodos(data || []);
    } catch (err: any) {
      console.error('Failed to fetch archive todos:', err?.message || err);
      toast.error('Failed to load historical Todo list.');
    } finally {
      setArchiveLoading(false);
    }
  }, [profile, selectedYear, selectedMonth]);

  // Handle Initial Load and Sub-tab toggle updates
  useEffect(() => {
    if (subTab === 'daily') {
      fetchDailyTodos();
    } else {
      fetchArchiveTodos();
    }
  }, [subTab, fetchDailyTodos, fetchArchiveTodos]);

  // Trigger archive fetch on Month or Year dropdown changes
  useEffect(() => {
    if (subTab === 'all') {
      fetchArchiveTodos();
    }
  }, [selectedYear, selectedMonth, subTab, fetchArchiveTodos]);

  // Add a new Daily Todo Item
  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !newTask.trim()) return;

    try {
      const { data, error } = await supabase
        .from('todos')
        .insert({
          user_id: profile.id,
          codename: profile.username.toUpperCase(),
          task: newTask.trim(),
          status: 'Working',
          comment: '',
          todo_date: todayStr,
          is_all_time: isAllTime
        })
        .select();

      if (error) throw error;
      if (data) {
        setTodos((prev) => [...prev, ...data]);
        setNewTask('');
        setIsAllTime(false);
        toast.success('Task added successfully!');
      }
    } catch (err: any) {
      console.error('Failed to add todo:', err?.message || err);
      toast.error('Failed to add task.');
    }
  };

  // Toggle Todo Status (Working <-> Completed)
  const handleToggleStatus = async (todo: TodoItem) => {
    const nextStatus = todo.status === 'Completed' ? 'Working' : 'Completed';
    try {
      const { error } = await supabase
        .from('todos')
        .update({ status: nextStatus })
        .eq('id', todo.id);

      if (error) throw error;
      setTodos((prev) =>
        prev.map((t) => (t.id === todo.id ? { ...t, status: nextStatus } : t))
      );
      toast.success(`Task marked as ${nextStatus}!`);
    } catch (err: any) {
      console.error('Failed to toggle status:', err?.message || err);
      toast.error('Failed to update status.');
    }
  };

  // Toggle All-Time Status for a task
  const handleToggleAllTime = async (todo: TodoItem) => {
    const nextAllTime = !todo.is_all_time;
    try {
      const { error } = await supabase
        .from('todos')
        .update({ is_all_time: nextAllTime })
        .eq('id', todo.id);

      if (error) throw error;
      setTodos((prev) =>
        prev.map((t) => (t.id === todo.id ? { ...t, is_all_time: nextAllTime } : t))
      );
      toast.success(nextAllTime ? 'Task marked as All-Time!' : 'Removed from All-Time routine.');
    } catch (err: any) {
      console.error('Failed to toggle all-time status:', err?.message || err);
      toast.error('Failed to update task type.');
    }
  };

  // Update Task Comment Inline
  const handleUpdateComment = async (id: string, commentVal: string) => {
    try {
      const { error } = await supabase
        .from('todos')
        .update({ comment: commentVal })
        .eq('id', id);

      if (error) throw error;
      setTodos((prev) =>
        prev.map((t) => (t.id === id ? { ...t, comment: commentVal } : t))
      );
    } catch (err: any) {
      console.error('Failed to update comment:', err?.message || err);
    }
  };

  // Delete a Todo Item
  const handleDeleteTodo = async (id: string) => {
    try {
      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setTodos((prev) => prev.filter((t) => t.id !== id));
      toast.success('Task deleted successfully.');
    } catch (err: any) {
      console.error('Failed to delete todo:', err?.message || err);
      toast.error('Failed to delete task.');
    }
  };

  // Copy Todo Checklist formatted text to Clipboard
  const handleCopyTodos = () => {
    if (todos.length === 0) {
      toast.error('No tasks available to copy.');
      return;
    }

    const [yyyy, mm, dd] = todayStr.split('-');
    const formattedDate = `${dd}/${mm}/${yyyy}`;
    const header = `✅ *Tasks Summery — ${formattedDate}*\n`;

    const body = todos
      .map((t) => {
        if (t.status === 'Completed') {
          if (t.comment && t.comment.trim() !== '') {
            return `- ${t.task} — Completed — ${t.comment.trim()}`;
          }
          return `- ${t.task} — Completed`;
        }
        if (t.comment && t.comment.trim() !== '') {
          return `- ${t.task} — Working — ${t.comment.trim()}`;
        }
        return `- ${t.task} — Working`;
      })
      .join('\n');

    navigator.clipboard.writeText(header + body);
    toast.success('Todo list copied to clipboard!');
  };

  // Group historical todos by Date
  const groupedArchiveTodos = React.useMemo(() => {
    const groups: Record<string, TodoItem[]> = {};
    archiveTodos.forEach((item) => {
      const date = item.todo_date;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(item);
    });
    return groups;
  }, [archiveTodos]);

  // Format YYYY-MM-DD into DD-MM-YYYY for display
  const formatDateDisplay = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 border-b border-slate-800 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-indigo-500" />
            Superadmin Tasks Registry
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Manage daily assignments, carry-overs, and archive tracking.</p>
        </div>

        {/* Sub-tabs Selector */}
        <div className="flex bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setSubTab('daily')}
            className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all cursor-pointer ${
              subTab === 'daily'
                ? 'bg-blue-600/15 border border-blue-500/20 text-blue-400'
                : 'text-slate-450 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            Daily List
          </button>
          <button
            onClick={() => setSubTab('all')}
            className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all cursor-pointer ${
              subTab === 'all'
                ? 'bg-blue-600/15 border border-blue-500/20 text-blue-400'
                : 'text-slate-450 hover:text-white'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            All Logs
          </button>
        </div>
      </div>

      {/* SUBTAB 1: DAILY VIEW */}
      {subTab === 'daily' && (
        <div className="space-y-6">
          {/* Add task form and copy options */}
          <div className="flex flex-col md:flex-row items-center gap-4 bg-slate-950/40 p-4 border border-slate-800/60 rounded-xl">
            <form onSubmit={handleAddTodo} className="flex-1 w-full flex items-center gap-2.5">
              <input
                type="text"
                required
                placeholder="What task are you working on today? e.g. Fix NS720-pc Outlook issue"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                disabled={loading}
                className="flex-1 min-w-0 px-4 py-2.5 bg-slate-900/60 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all disabled:opacity-60"
              />
              <label className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-900/40 border border-slate-800/80 rounded-xl cursor-pointer select-none hover:bg-slate-900 transition-colors shrink-0">
                <input
                  type="checkbox"
                  checked={isAllTime}
                  onChange={(e) => setIsAllTime(e.target.checked)}
                  disabled={loading}
                  className="sr-only"
                />
                <div
                  className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all ${
                    isAllTime
                      ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400'
                      : 'border-slate-700 hover:border-slate-500 bg-slate-950/40'
                  }`}
                >
                  {isAllTime && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </div>
                <span className="text-[11px] text-slate-350 hover:text-white font-bold tracking-wide transition-colors">All-Time</span>
              </label>
              <button
                type="submit"
                disabled={loading || !newTask.trim()}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 text-center shadow-lg shadow-indigo-650/10"
              >
                <Plus className="w-4 h-4" /> Add Task
              </button>
            </form>

            <div className="shrink-0 flex gap-2 w-full md:w-auto justify-end">
              <button
                type="button"
                onClick={handleCopyTodos}
                disabled={loading || todos.length === 0}
                className="px-4 py-2.5 bg-slate-900 border border-slate-800 hover:border-slate-750 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-md"
                title="Copy formatted checklist to clipboard"
              >
                <Copy className="w-3.5 h-3.5" /> Copy Checklist
              </button>

              <button
                type="button"
                onClick={fetchDailyTodos}
                disabled={loading}
                className="p-2.5 bg-slate-900 border border-slate-800 hover:border-slate-750 text-slate-400 hover:text-white rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50"
                title="Refresh today's list"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* List display */}
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="p-4 bg-slate-950/20 border border-slate-800/60 rounded-xl animate-pulse flex items-center justify-between gap-4 h-[72px]">
                  <div className="flex-1 flex gap-3">
                    <div className="w-5 h-5 bg-slate-800 rounded-md shrink-0" />
                    <div className="space-y-2 flex-1">
                      <div className="h-3.5 bg-slate-800/80 rounded w-1/3" />
                      <div className="h-3 bg-slate-800/40 rounded w-2/3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : todos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3 bg-slate-950/15 border border-slate-850 rounded-2xl">
              <ListTodo className="w-12 h-12 text-slate-600 animate-pulse" />
              <div>
                <p className="text-slate-300 font-bold text-sm">No tasks listed for today</p>
                <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
                  Start your day by adding tasks above, or check back later to sync database lists.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1 custom-scrollbar">
              {todos.map((todo) => {
                const isCompleted = todo.status === 'Completed';
                return (
                  <div
                    key={todo.id}
                    className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200 ${
                      isCompleted
                        ? 'bg-emerald-950/5 border-emerald-500/10 hover:border-emerald-500/20'
                        : 'bg-slate-950/25 border-slate-800/70 hover:border-slate-800'
                    }`}
                  >
                    {/* Task and Comment Layout */}
                    <div className="flex-1 min-w-0 flex items-start gap-3">
                      {/* Interactive checkmark toggle */}
                      <button
                        onClick={() => handleToggleStatus(todo)}
                        className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                          isCompleted
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                            : 'border-slate-700 text-transparent hover:border-slate-500 hover:bg-slate-800/40'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </button>

                      <div className="flex-1 space-y-1.5 min-w-0">
                        <p
                          onClick={() => handleToggleStatus(todo)}
                          className={`text-xs font-semibold leading-relaxed cursor-pointer select-none truncate ${
                            isCompleted ? 'text-slate-550 line-through' : 'text-slate-200'
                          }`}
                          title={todo.task}
                        >
                          {todo.task}
                        </p>

                        {/* Comment Input Box */}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium shrink-0">Notes:</span>
                          <input
                            type="text"
                            placeholder="Need time, will finish tomorrow..."
                            value={todo.comment || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setTodos((prev) =>
                                prev.map((t) => (t.id === todo.id ? { ...t, comment: val } : t))
                              );
                            }}
                            onBlur={(e) => handleUpdateComment(todo.id, e.target.value)}
                            className="w-full max-w-md px-2.5 py-1 bg-slate-900/45 hover:bg-slate-900/80 focus:bg-slate-950 border border-slate-850 hover:border-slate-800 focus:border-indigo-500/50 rounded-lg text-[11px] text-slate-350 focus:outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Meta Indicators and Actions */}
                    <div className="flex items-center gap-3 shrink-0 justify-end border-t sm:border-0 border-slate-900/50 pt-3 sm:pt-0">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleAllTime(todo)}
                          className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider transition-all cursor-pointer ${
                            todo.is_all_time
                              ? 'bg-indigo-600/15 text-indigo-400 border-indigo-500/20 hover:bg-rose-950/20 hover:text-rose-450 hover:border-rose-950/40'
                              : 'bg-slate-900 text-slate-500 border-slate-850 hover:text-slate-350 hover:border-slate-800'
                          }`}
                          title={todo.is_all_time ? "Remove from All-Time routine" : "Make All-Time routine"}
                        >
                          {todo.is_all_time ? 'All-Time' : 'Regular'}
                        </button>
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${
                            isCompleted
                              ? 'bg-emerald-600/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-amber-600/10 text-amber-400 border-amber-500/20'
                          }`}
                        >
                          {todo.status}
                        </span>
                      </div>

                      <button
                        onClick={() => setTodoToDelete(todo.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-450 hover:bg-rose-950/20 rounded-lg transition-colors cursor-pointer"
                        title="Delete task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: ARCHIVE VIEW */}
      {subTab === 'all' && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-4 bg-slate-950/40 p-4 border border-slate-800/60 rounded-xl">
            {/* Year Selector */}
            <div className="flex flex-col gap-1.5 min-w-[120px]">
              <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">Select Year</span>
              <div className="relative">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-white px-3 py-2 rounded-xl focus:outline-none appearance-none cursor-pointer pr-8"
                >
                  {yearsList.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-slate-500 pointer-events-none" />
              </div>
            </div>

            {/* Month Selector */}
            <div className="flex flex-col gap-1.5 min-w-[160px]">
              <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">Select Month</span>
              <div className="relative">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-white px-3 py-2 rounded-xl focus:outline-none appearance-none cursor-pointer pr-8"
                >
                  {monthsList.map((m) => (
                    <option key={m.val} value={m.val}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-slate-500 pointer-events-none" />
              </div>
            </div>

            <div className="ml-auto mt-4 sm:mt-0 shrink-0">
              <button
                type="button"
                onClick={fetchArchiveTodos}
                disabled={archiveLoading}
                className="px-4 py-2.5 bg-slate-900 border border-slate-800 hover:border-slate-750 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${archiveLoading ? 'animate-spin' : ''}`} />
                Reload Archives
              </button>
            </div>
          </div>

          {/* Grouped Logs Display */}
          {archiveLoading ? (
            <div className="space-y-6">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <div className="w-24 h-4 bg-slate-800 rounded animate-pulse" />
                  <div className="p-4 bg-slate-950/20 border border-slate-800/60 rounded-xl animate-pulse h-16" />
                </div>
              ))}
            </div>
          ) : Object.keys(groupedArchiveTodos).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3 bg-slate-950/15 border border-slate-850 rounded-2xl">
              <CalendarDays className="w-12 h-12 text-slate-600 animate-pulse" />
              <div>
                <p className="text-slate-300 font-bold text-sm">No historical logs found</p>
                <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
                  There are no saved todos for the selected timeframe: {monthsList.find(m => m.val === selectedMonth)?.name} {selectedYear}.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6 max-h-[55vh] overflow-y-auto pr-1 custom-scrollbar">
              {Object.entries(groupedArchiveTodos).map(([date, list]) => (
                <div key={date} className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-slate-800/80 border border-slate-750 text-slate-300 font-mono text-[10px] font-bold rounded-lg tracking-wider">
                      {formatDateDisplay(date)}
                    </span>
                    <span className="text-[10px] text-slate-550 font-medium">({list.length} {list.length === 1 ? 'task' : 'tasks'})</span>
                  </div>

                  <div className="bg-slate-955 border border-slate-850/60 rounded-xl overflow-hidden shadow-inner">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="bg-slate-950 border-b border-slate-850/80 text-[10px] text-slate-550 uppercase tracking-wider font-bold">
                          <th className="px-4 py-3 w-[60%]">Task Name</th>
                          <th className="px-4 py-3 w-[15%] text-center">Status</th>
                          <th className="px-4 py-3 w-[25%]">Notes / Comments</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850/40 text-slate-350">
                        {list.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-900/35 transition-colors">
                            <td className="px-4 py-2.5 font-medium text-slate-200">
                              <div className="flex items-center gap-2">
                                {item.status === 'Completed' ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                ) : (
                                  <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0 animate-pulse" />
                                )}
                                <span className="truncate max-w-[400px]" title={item.task}>
                                  {item.task}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider border ${
                                  item.status === 'Completed'
                                    ? 'bg-emerald-600/10 text-emerald-400 border-emerald-500/10'
                                    : 'bg-amber-600/10 text-amber-400 border-amber-500/10'
                                }`}
                              >
                                {item.status}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-xs text-slate-450 italic truncate max-w-[200px]" title={item.comment || ''}>
                              {item.comment || <span className="text-slate-650 select-none">-</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={todoToDelete !== null}
        onClose={() => setTodoToDelete(null)}
        onConfirm={async () => {
          if (todoToDelete) {
            await handleDeleteTodo(todoToDelete);
            setTodoToDelete(null);
          }
        }}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isDanger={true}
      />
    </div>
  );
};
