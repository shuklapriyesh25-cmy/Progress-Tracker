import React, { useState, useEffect } from 'react';

const userId = 'default_user';
const API_BASE = 'http://localhost:5000/api/progress';

function DailyTaskPage() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/${userId}`)
      .then(res => res.json())
      .then(data => {
        setTasks(data.tasks || []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch tasks:", err);
        setLoading(false);
      });
  }, []);

  const saveTasksToMongo = async (newTasks) => {
    try {
      await fetch(`${API_BASE}/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: newTasks })
      });
    } catch (e) {
      console.error("Failed to save tasks:", e);
    }
  };

  const toggleTask = (id) => {
    const newTasks = tasks.map((task) => {
      if (task.id === id) {
        const newDoneStatus = !task.done;

        return {
          ...task,
          done: newDoneStatus,
          completedAt: newDoneStatus ? Date.now() : null
        }
      };
      return task;
    })
    setTasks(newTasks);
    saveTasksToMongo(newTasks);
  };

  const addTask = (e) => {
    e.preventDefault();
    if (newTask.trim()) {
      const newTasks = [...tasks, {
        id: Date.now(), text: newTask, done: false, timestamp: Date.now(),
        completedAt: null
      }];
      setTasks(newTasks);
      setNewTask("");
      saveTasksToMongo(newTasks);
    }
  };

  const deleteTask = (id) => {
    const newTasks = tasks.filter(t => t.id !== id);
    setTasks(newTasks);
    saveTasksToMongo(newTasks);
  };

  if (loading) return null;

  return (
    <div className="wrap" style={{ marginTop: '2rem' }}>
      <header className="top" style={{ borderRadius: '1rem' }}>
        <div className="top-in">
          <h1>Daily Tasks</h1>
          <p className="sub">Focus on today's goals. Tasks auto-clear after 2 days.</p>
        </div>
      </header>

      <main className="wrap" style={{ padding: 0 }}>
        <form onSubmit={addTask} style={{ display: 'flex', gap: '1rem', margin: '2rem 0' }}>
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="Add a new task..."
            style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--fg)' }}
          />
          <button className="btn" type="submit">Add Task</button>
        </form>

        <div className="day" open data-done={tasks.length > 0 && tasks.every(t => t.done) ? 1 : 0} style={{ display: 'block' }}>
          <div className="body">
            {tasks.length === 0 ? <p className="empty">No tasks right now.</p> : null}
            <ul>
              {tasks.map(t => (
                <li key={t.id} className={t.done ? "on" : ""} style={{ display: 'flex', alignItems: 'center', padding: '0.75rem 0' }}>
                  <input type="checkbox" checked={t.done} onChange={() => toggleTask(t.id)} />
                  <span style={{ marginLeft: '1rem', flex: 1, textDecoration: t.done ? 'line-through' : 'none', color: t.done ? 'var(--muted)' : 'inherit' }}>
                    {t.text}
                  </span>
                  <button
                    onClick={() => deleteTask(t.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--muted)',
                      cursor: 'pointer',
                      padding: '0.5rem',
                      fontSize: '1.2rem',
                      lineHeight: '1'
                    }}
                    title="Delete Task"
                  >
                    &times;
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}

export default DailyTaskPage;
