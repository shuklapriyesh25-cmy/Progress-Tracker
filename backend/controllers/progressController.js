import Progress from '../models/progressModel.js';

// Helper to ensure completions array is initialized and synced
const syncCompletions = (progress, today) => {
  if (!progress.completions) {
    progress.completions = [];
  }

  let updated = false;

  // 1. Sync completed tasks from progress.tasks
  if (Array.isArray(progress.tasks)) {
    for (const t of progress.tasks) {
      const compIndex = progress.completions.findIndex(c => c.taskId === t.id || c.id === `task_${t.id}`);
      if (t.done) {
        const taskDate = t.completedAt
          ? new Date(t.completedAt).toISOString().split('T')[0]
          : (t.timestamp ? new Date(t.timestamp).toISOString().split('T')[0] : today);

        if (compIndex === -1) {
          progress.completions.push({
            id: `task_${t.id}`,
            taskId: t.id,
            text: t.text || 'Daily Task',
            date: taskDate,
            timestamp: t.completedAt || t.timestamp || Date.now(),
            type: 'task'
          });
          updated = true;
        } else {
          // Update text/date if changed
          if (progress.completions[compIndex].text !== t.text) {
            progress.completions[compIndex].text = t.text;
            updated = true;
          }
        }
      } else if (compIndex !== -1) {
        // Task was unchecked, remove its completion record
        progress.completions.splice(compIndex, 1);
        updated = true;
      }
    }
  }

  // 2. Ensure each date in activityHistory is represented in completions
  if (Array.isArray(progress.activityHistory)) {
    const existingDates = new Set(progress.completions.map(c => c.date));
    for (const dateStr of progress.activityHistory) {
      if (!existingDates.has(dateStr)) {
        progress.completions.push({
          id: `act_${dateStr}`,
          text: 'Daily tracker progress',
          date: dateStr,
          timestamp: new Date(dateStr).getTime() || Date.now(),
          type: 'activity'
        });
        existingDates.add(dateStr);
        updated = true;
      }
    }
  }

  return updated;
};

// Get progress for a user
export const getProgress = async (req, res) => {
  try {
    const { userId } = req.params;
    const today = new Date().toISOString().split('T')[0];
    let progress = await Progress.findOne({ userId });

    if (!progress) {
      progress = new Progress({
        userId,
        done: {},
        tasks: [],
        activityHistory: [],
        lastActiveDate: '',
        completions: []
      });
      await progress.save();
      return res.json(progress);
    }

    let needsSave = false;

    // First ensure completed tasks are saved to completions before any auto-cleanup
    if (syncCompletions(progress, today)) {
      needsSave = true;
    }

    // Automatically clean up old daily tasks from active list after 2 days (history remains in completions)
    if (progress.tasks && progress.tasks.length > 0) {
      const now = Date.now();
      const twoDaysInMs = 2 * 24 * 60 * 60 * 1000;
      const initialTaskCount = progress.tasks.length;
      progress.tasks = progress.tasks.filter(t => (now - t.timestamp) < twoDaysInMs);

      if (progress.tasks.length !== initialTaskCount) {
        needsSave = true;
      }
    }

    if (needsSave) {
      await progress.save();
    }

    res.json(progress);
  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update progress for a user
export const updateProgress = async (req, res) => {
  try {
    const { userId } = req.params;
    const { done, tasks, completions } = req.body;
    const today = new Date().toISOString().split('T')[0];

    let progress = await Progress.findOne({ userId });
    if (!progress) {
      progress = new Progress({
        userId,
        done: done || {},
        tasks: tasks || [],
        activityHistory: [today],
        lastActiveDate: today,
        completions: completions || []
      });
    } else {
      if (done !== undefined) progress.done = done;
      if (tasks !== undefined) progress.tasks = tasks;
      if (completions !== undefined) progress.completions = completions;

      // Update activity history
      if (!progress.activityHistory) progress.activityHistory = [];
      if (!progress.activityHistory.includes(today)) {
        progress.activityHistory.push(today);
        progress.lastActiveDate = today;
      }
    }

    // Sync completions with current tasks and activity history
    syncCompletions(progress, today);

    await progress.save();
    res.json({ message: 'Progress saved successfully', progress });
  } catch (error) {
    console.error('Error saving progress:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Clear all progress for a user
export const clearProgress = async (req, res) => {
  try {
    const { userId } = req.params;
    const resetData = {
      done: {},
      tasks: [],
      activityHistory: [],
      lastActiveDate: '',
      completions: []
    };
    await Progress.findOneAndUpdate({ userId }, resetData);
    res.json({ message: 'Progress cleared successfully', progress: resetData });
  } catch (error) {
    console.error('Error clearing progress:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
