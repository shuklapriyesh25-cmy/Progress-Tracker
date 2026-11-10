import React, { useState, useEffect } from 'react';
import { format, isSameDay, addDays, parseISO, differenceInDays } from 'date-fns';
import TaskCalendar from '../components/TaskCalender';

const userId = 'default_user';
const API_BASE = 'http://localhost:5000/api/progress';

function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [newTaskText, setNewTaskText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/${userId}`)
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch dashboard data:", err);
        setLoading(false);
      });
  }, []);

  const saveTasksToBackend = async (newTasks) => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: newTasks })
      });
      const result = await res.json();
      if (result.progress) {
        setData(result.progress);
      }
    } catch (e) {
      console.error("Failed to save tasks:", e);
    } finally {
      setSaving(false);
    }
  };

  const toggleTask = (id) => {
    if (!data || !data.tasks) return;
    const newTasks = data.tasks.map((task) => {
      if (task.id === id) {
        const newDoneStatus = !task.done;
        return {
          ...task,
          done: newDoneStatus,
          completedAt: newDoneStatus ? Date.now() : null
        };
      }
      return task;
    });

    // Optimistic UI update
    setData(prev => ({
      ...prev,
      tasks: newTasks
    }));

    saveTasksToBackend(newTasks);
  };

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;

    const newTask = {
      id: Date.now(),
      text: newTaskText.trim(),
      done: false,
      timestamp: Date.now(),
      completedAt: null
    };

    const newTasks = [...(data?.tasks || []), newTask];
    setData(prev => ({
      ...prev,
      tasks: newTasks
    }));
    setNewTaskText('');

    saveTasksToBackend(newTasks);
  };

  const deleteTask = (id) => {
    if (!data || !data.tasks) return;
    const newTasks = data.tasks.filter(t => t.id !== id);
    setData(prev => ({
      ...prev,
      tasks: newTasks
    }));
    saveTasksToBackend(newTasks);
  };

  if (loading || !data) {
    return (
      <div className="wrap" style={{ marginTop: '3rem', textAlign: 'center', color: 'var(--muted)' }}>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  // Reference dates
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const yesterday = addDays(today, -1);
  const yesterdayStr = format(yesterday, 'yyyy-MM-dd');
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const isSelectedToday = isSameDay(selectedDate, today);
  const isSelectedYesterday = isSameDay(selectedDate, yesterday);

  // Completions list
  const completions = data.completions && data.completions.length > 0
    ? data.completions
    : (data.activityHistory || []).map(d => ({ date: d, text: 'Active tracker activity' }));

  // Streaks calculation
  const calculateStreaks = () => {
    if (!completions || completions.length === 0) return { current: 0, best: 0 };
    const uniqueDates = [...new Set(completions.map(c => c.date).filter(Boolean))].sort().reverse();
    if (uniqueDates.length === 0) return { current: 0, best: 0 };

    let currentStreak = 0;
    let bestStreak = 1;

    const sortedAsc = [...uniqueDates].reverse();
    let tempBest = 1;
    for (let i = 1; i < sortedAsc.length; i++) {
      const prevDate = parseISO(sortedAsc[i - 1]);
      const currDate = parseISO(sortedAsc[i]);
      if (differenceInDays(currDate, prevDate) === 1) {
        tempBest++;
      } else {
        tempBest = 1;
      }
      if (tempBest > bestStreak) bestStreak = tempBest;
    }

    if (uniqueDates.includes(todayStr) || uniqueDates.includes(yesterdayStr)) {
      let checkDate = uniqueDates.includes(todayStr) ? today : addDays(today, -1);
      while (uniqueDates.includes(format(checkDate, 'yyyy-MM-dd'))) {
        currentStreak++;
        checkDate = addDays(checkDate, -1);
      }
    }

    if (currentStreak > bestStreak) bestStreak = currentStreak;

    return { current: currentStreak, best: bestStreak };
  };

  const { current: streak, best: bestStreak } = calculateStreaks();
  const totalCompleted = completions.length;
  const activeDaysCount = new Set(completions.map(c => c.date)).size;

  // Filter tasks from active tasks
  const allTasks = data.tasks || [];
  const todayTasks = allTasks.filter(t => {
    const d = format(new Date(t.timestamp), 'yyyy-MM-dd');
    return d === todayStr;
  });
  const yesterdayTasks = allTasks.filter(t => {
    const d = format(new Date(t.timestamp), 'yyyy-MM-dd');
    return d === yesterdayStr;
  });

  // Selected date tasks/completions
  const selectedDateTasks = allTasks.filter(t => {
    const d = format(new Date(t.timestamp), 'yyyy-MM-dd');
    return d === selectedDateStr;
  });
  const selectedDateCompletions = completions.filter(c => c.date === selectedDateStr);

  return (
    <div className="wrap" style={{ marginTop: '2rem' }}>
      <header className="top" style={{ borderRadius: '1rem', marginBottom: '2rem' }}>
        <div className="top-in">
          <h1>Dashboard</h1>
          <p className="sub">Your progress at a glance.</p>
          <div className="tiles" style={{ marginTop: '1rem' }}>
            <div className="tile">
              <b style={{ color: '#60a5fa' }}>{streak} 🔥</b>
              <span>Day Streak</span>
            </div>
            <div className="tile">
              <b style={{ color: '#f59e0b' }}>{bestStreak} 🏆</b>
              <span>Best Streak</span>
            </div>
            <div className="tile">
              <b style={{ color: '#10b981' }}>{totalCompleted} ✅</b>
              <span>Tasks Done</span>
            </div>
            <div className="tile">
              <b style={{ color: '#a855f7' }}>{activeDaysCount} 📅</b>
              <span>Active Days</span>
            </div>
          </div>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', alignItems: 'start' }}>
        {/* Left Column: Monthly Habit & Task Calendar Component */}
        <div className="day" style={{ display: 'block', overflow: 'hidden' }} data-done={1}>
          <div className="body" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.15rem', margin: 0, color: 'var(--fg)' }}>
                Calendar & Streaks
              </h2>
              {!isSelectedToday && (
                <button
                  className="btn"
                  style={{ fontSize: '11px', padding: '3px 10px' }}
                  onClick={() => setSelectedDate(new Date())}
                >
                  Jump to Today
                </button>
              )}
            </div>

            <TaskCalendar
              completions={completions}
              selectedDate={selectedDate}
              onDateClick={(day) => setSelectedDate(day)}
            />
          </div>
        </div>

        {/* Right Column: Interactive Tasks Overview */}
        <div className="day" style={{ display: 'block' }} data-done={1}>
          <div className="body" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.15rem', margin: 0, color: 'var(--fg)' }}>
                Tasks Overview
              </h2>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                {format(selectedDate, 'MMMM d, yyyy')}
                {isSelectedToday ? ' (Today)' : isSelectedYesterday ? ' (Yesterday)' : ''}
              </span>
            </div>

            {/* Quick add task for today */}
            {isSelectedToday && (
              <form onSubmit={handleAddTask} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <input
                  type="text"
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  placeholder="Add quick task for today..."
                  style={{
                    flex: 1,
                    padding: '0.6rem 0.8rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface-2)',
                    color: 'var(--ink)',
                    fontSize: '13px'
                  }}
                />
                <button
                  className="btn"
                  type="submit"
                  disabled={saving || !newTaskText.trim()}
                  style={{ padding: '0.6rem 1rem', fontSize: '13px' }}
                >
                  Add
                </button>
              </form>
            )}

            {/* Selected Date View (When not today) */}
            {!isSelectedToday ? (
              <div>
                <div className="secttl" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Tasks for {format(selectedDate, 'MMM d, yyyy')}</span>
                  <button
                    className="btn"
                    style={{ fontSize: '11px', padding: '2px 8px' }}
                    onClick={() => setSelectedDate(new Date())}
                  >
                    Back to Today
                  </button>
                </div>

                {selectedDateTasks.length === 0 && selectedDateCompletions.length === 0 ? (
                  <p className="empty" style={{ margin: '1rem 0' }}>No tasks recorded for this date.</p>
                ) : (
                  <ul>
                    {/* Show active tasks recorded for this date */}
                    {selectedDateTasks.map((t) => (
                      <li key={t.id} className={t.done ? "on" : ""} style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 0' }}>
                        <input
                          type="checkbox"
                          checked={t.done}
                          onChange={() => toggleTask(t.id)}
                          style={{ cursor: 'pointer' }}
                        />
                        <span style={{ marginLeft: '0.75rem', flex: 1, textDecoration: t.done ? 'line-through' : 'none', color: t.done ? 'var(--muted)' : 'inherit' }}>
                          {t.text}
                        </span>
                        <button
                          onClick={() => deleteTask(t.id)}
                          style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1.2rem', padding: '0 4px' }}
                          title="Delete"
                        >
                          &times;
                        </button>
                      </li>
                    ))}

                    {/* Show completions history for this date if tasks expired or from roadmap/activity */}
                    {selectedDateCompletions
                      .filter(c => !selectedDateTasks.some(t => t.id === c.taskId || `task_${t.id}` === c.id))
                      .map((c, i) => (
                        <li key={`comp-${c.id || i}`} className="on" style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 0' }}>
                          <input type="checkbox" checked={true} readOnly disabled style={{ opacity: 0.8 }} />
                          <span style={{ marginLeft: '0.75rem', flex: 1, textDecoration: 'line-through', color: 'var(--muted)' }}>
                            {c.text || 'Completed task'}
                          </span>
                          <span style={{ fontSize: '10px', color: 'var(--muted)', background: 'var(--surface-2)', padding: '2px 6px', borderRadius: '4px' }}>
                            {c.type || 'completed'}
                          </span>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            ) : (
              /* Today's View */
              <div>
                <div className="secttl">Today's Tasks</div>
                {todayTasks.length === 0 ? (
                  <p className="empty" style={{ margin: '0.75rem 0' }}>No tasks for today. Add one above!</p>
                ) : null}
                <ul>
                  {todayTasks.map((t) => (
                    <li key={t.id} className={t.done ? "on" : ""} style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 0' }}>
                      <input
                        type="checkbox"
                        checked={t.done}
                        onChange={() => toggleTask(t.id)}
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{ marginLeft: '0.75rem', flex: 1, textDecoration: t.done ? 'line-through' : 'none', color: t.done ? 'var(--muted)' : 'inherit' }}>
                        {t.text}
                      </span>
                      <button
                        onClick={() => deleteTask(t.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1.2rem', padding: '0 4px' }}
                        title="Delete Task"
                      >
                        &times;
                      </button>
                    </li>
                  ))}
                </ul>

                <div className="secttl" style={{ marginTop: '1.75rem' }}>Yesterday</div>
                {yesterdayTasks.length === 0 ? (
                  <p className="empty" style={{ margin: '0.75rem 0' }}>No tasks from yesterday.</p>
                ) : null}
                <ul>
                  {yesterdayTasks.map((t) => (
                    <li key={t.id} className={t.done ? "on" : ""} style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 0' }}>
                      <input
                        type="checkbox"
                        checked={t.done}
                        onChange={() => toggleTask(t.id)}
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{ marginLeft: '0.75rem', flex: 1, textDecoration: t.done ? 'line-through' : 'none', color: t.done ? 'var(--muted)' : 'inherit' }}>
                        {t.text}
                      </span>
                      <button
                        onClick={() => deleteTask(t.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1.2rem', padding: '0 4px' }}
                        title="Delete Task"
                      >
                        &times;
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
