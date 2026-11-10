import React, { useState } from 'react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  addDays,
  parseISO,
  differenceInDays
} from 'date-fns';
import './TaskCalender.css';

const TaskCalendar = ({ completions = [], onDateClick, selectedDate }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Helper to calculate streaks
  const calculateStreaks = () => {
    if (!completions || completions.length === 0) return { current: 0, best: 0 };

    // Get unique dates sorted descending
    const uniqueDates = [...new Set(completions.map(c => c.date).filter(Boolean))].sort().reverse();
    if (uniqueDates.length === 0) return { current: 0, best: 0 };

    let currentStreak = 0;
    let bestStreak = 1;

    // Calculate Best Streak
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

    // Calculate Current Streak
    const tempDate = new Date();
    const todayStr = format(tempDate, 'yyyy-MM-dd');
    const yesterdayStr = format(addDays(tempDate, -1), 'yyyy-MM-dd');

    if (uniqueDates.includes(todayStr) || uniqueDates.includes(yesterdayStr)) {
      let checkDate = uniqueDates.includes(todayStr) ? tempDate : addDays(tempDate, -1);
      while (uniqueDates.includes(format(checkDate, 'yyyy-MM-dd'))) {
        currentStreak++;
        checkDate = addDays(checkDate, -1);
      }
    }

    if (currentStreak > bestStreak) bestStreak = currentStreak;

    return { current: currentStreak, best: bestStreak };
  };

  const { current: currentStreak, best: bestStreak } = calculateStreaks();

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  const isCurrentMonthView = isSameMonth(currentDate, new Date());

  const handleDayClick = (day) => {
    if (onDateClick) {
      onDateClick(day);
    }
  };

  const renderHeader = () => {
    return (
      <div className="calendar-header flex justify-between items-center mb-4">
        <button
          onClick={prevMonth}
          className="calendar-nav-btn p-1 hover:bg-gray-100 rounded-full transition-colors"
          title="Previous Month"
          aria-label="Previous Month"
        >
          <svg className="w-5 h-5 text-gray-600" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="calendar-header-title-box">
          <h2 className="calendar-month-title text-sm font-bold text-gray-800 uppercase tracking-wider">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          {!isCurrentMonthView && (
            <button
              onClick={goToToday}
              className="calendar-today-btn"
              title="Jump to current month"
            >
              Today
            </button>
          )}
        </div>

        <button
          onClick={nextMonth}
          className="calendar-nav-btn p-1 hover:bg-gray-100 rounded-full transition-colors"
          title="Next Month"
          aria-label="Next Month"
        >
          <svg className="w-5 h-5 text-gray-600" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    );
  };

  const renderDays = () => {
    const days = [];
    const startDate = startOfWeek(currentDate);

    for (let i = 0; i < 7; i++) {
      days.push(
        <div key={i} className="calendar-weekday-cell text-center font-semibold text-xs text-gray-400 py-2">
          {format(addDays(startDate, i), 'EEEEE')}
        </div>
      );
    }
    return <div className="calendar-weekdays grid grid-cols-7 mb-2">{days}</div>;
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const formattedDate = format(day, 'd');
        const cloneDay = day;
        const dayStr = format(day, 'yyyy-MM-dd');

        // Find completions on this day
        const dayCompletions = completions.filter(c => c.date === dayStr);
        const completionCount = dayCompletions.length;

        const isCurrentMonth = isSameMonth(day, monthStart);
        const isToday = isSameDay(day, new Date());
        const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;

        let intensityClass = '';
        if (completionCount > 0 && isCurrentMonth) {
          if (completionCount === 1) intensityClass = 'intensity-1 bg-green-100';
          else if (completionCount === 2) intensityClass = 'intensity-2 bg-green-300';
          else if (completionCount >= 3) intensityClass = 'intensity-3 bg-green-500';
        }

        const cellClasses = [
          'calendar-day-btn',
          'h-8 w-8 mx-auto flex items-center justify-center rounded-full text-xs cursor-pointer transition-all',
          !isCurrentMonth ? 'is-other-month text-gray-300' : 'text-gray-900',
          isToday ? 'is-today font-bold' : '',
          isSelected ? 'is-selected font-bold' : '',
          intensityClass
        ].filter(Boolean).join(' ');

        // Descriptive tooltip
        const dateReadable = format(day, 'EEE, MMM d, yyyy');
        let tooltipText = `${dateReadable}`;
        if (completionCount > 0) {
          const taskSummary = dayCompletions.map(c => `• ${c.text || 'Completed task'}`).join('\n');
          tooltipText += `\n${completionCount} completed:\n${taskSummary}`;
        } else {
          tooltipText += `\nNo tasks completed`;
        }

        days.push(
          <button
            key={dayStr}
            type="button"
            onClick={() => handleDayClick(cloneDay)}
            className={cellClasses}
            title={tooltipText}
            aria-label={`${dateReadable}: ${completionCount} completions`}
          >
            {formattedDate}
          </button>
        );

        day = addDays(day, 1);
      }

      const rowKey = `week-${format(days[0].key, 'yyyy-MM-dd')}`;
      rows.push(
        <div className="calendar-week-row grid grid-cols-7 gap-y-2 mb-2" key={rowKey}>
          {days}
        </div>
      );
      days = [];
    }

    return <div className="calendar-days-grid">{rows}</div>;
  };

  return (
    <div className="task-calendar-card bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      {renderHeader()}
      {renderDays()}
      {renderCells()}

      <div className="calendar-footer mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
        <div className="calendar-streaks-box flex flex-col">
          <span className="calendar-current-streak text-sm font-bold text-gray-800">
            🔥 Current streak: {currentStreak} {currentStreak === 1 ? 'day' : 'days'}
          </span>
          <span className="calendar-best-streak text-xs font-medium text-gray-500">
            🏆 Best streak: {bestStreak} {bestStreak === 1 ? 'day' : 'days'}
          </span>
        </div>

        <div className="calendar-legend flex items-center gap-2 text-xs text-gray-400">
          <span>Less</span>
          <div className="calendar-legend-swatches flex gap-1">
            <div className="calendar-swatch swatch-empty w-3 h-3 rounded-sm bg-gray-100" title="0 tasks"></div>
            <div className="calendar-swatch swatch-lvl-1 w-3 h-3 rounded-sm bg-green-100" title="1 task"></div>
            <div className="calendar-swatch swatch-lvl-2 w-3 h-3 rounded-sm bg-green-300" title="2 tasks"></div>
            <div className="calendar-swatch swatch-lvl-3 w-3 h-3 rounded-sm bg-green-500" title="3+ tasks"></div>
          </div>
          <span>More</span>
        </div>
      </div>
    </div>
  );
};

export const HabitCalendar = TaskCalendar;
export default TaskCalendar;
