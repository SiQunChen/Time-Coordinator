import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EventData, EventTimeSlot, EventType } from '../types';
import { encodeEventData } from '../services/urlService';

const CreateEventForm: React.FC = () => {
  const [eventName, setEventName] = useState('');
  const [creator, setCreator] = useState('');
  const [scheduleType, setScheduleType] = useState<EventType>('date-based');
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [viewDate, setViewDate] = useState(new Date());
  
  const navigate = useNavigate();

  const handleDateToggle = (dateStr: string) => {
    const newSelectedDates = selectedDates.includes(dateStr)
      ? selectedDates.filter(d => d !== dateStr)
      : [...selectedDates, dateStr];

    if (newSelectedDates.length > 10) {
      alert("You can select a maximum of 10 dates.");
      return;
    }
    setSelectedDates(newSelectedDates.sort());
  };

  const changeMonth = (offset: number) => {
    setViewDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + offset);
      return newDate;
    });
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName.trim() || !creator.trim()) {
      alert('Please fill in both the event name and your name.');
      return;
    }

    if (scheduleType === 'date-based' && selectedDates.length === 0) {
      alert('Please select at least one date for the event.');
      return;
    }

    sessionStorage.setItem('username', creator.trim());

    const timeSlots: EventTimeSlot[] = [];
    if (scheduleType === 'date-based') {
        selectedDates.forEach(dateStr => {
            const localDate = new Date(dateStr + 'T00:00:00');
            for (let h = 8; h <= 22; h++) { // 8 AM to 10 PM
                const slotDate = new Date(localDate);
                slotDate.setHours(h, 0, 0, 0);
                timeSlots.push({
                    time: slotDate.toISOString(),
                    participants: {},
                });
            }
        });
    } else { // weekly
        for (let d = 1; d <= 7; d++) { // 1: Monday, 7: Sunday
            for (let h = 8; h <= 22; h++) {
                timeSlots.push({
                    time: `${d % 7}-${h}`, // 0: Sunday, 1: Monday ... 6: Saturday
                    participants: {},
                });
            }
        }
    }

    const newEvent: Omit<EventData, 'id'> = { // 我們不再在客戶端生成 ID
      eventName: eventName.trim(),
      creator: creator.trim(),
      createdAt: Date.now(),
      timeSlots,
      finalizedTime: null,
      eventType: scheduleType,
    };

    try {
      const response = await fetch('https://time-coordinator-api.jerry92033119.workers.dev/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newEvent),
      });

      if (!response.ok) {
        throw new Error('Failed to create event');
      }

      const { id } = await response.json(); // 從後端取得新的短 ID
      navigate(`/event/${id}`); // 導覽到 /event/abcdef
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Could not create the event. Please try again.');
    }
  };
  
  const renderCalendar = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const today = new Date();
    today.setHours(0,0,0,0);

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const dayElements = [];

    for (let i = 0; i < firstDayOfMonth; i++) {
        dayElements.push(<div key={`empty-${i}`} className="p-2"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = date.toISOString().split('T')[0];
        const isSelected = selectedDates.includes(dateStr);
        const isPast = date < today;

        let className = "text-center p-2 rounded-full cursor-pointer transition-colors duration-150 ";
        if (isPast) {
            className += "text-slate-400 dark:text-slate-600 cursor-not-allowed";
        } else {
             if (isSelected) {
                className += "bg-blue-500 text-white font-bold";
            } else {
                className += "hover:bg-blue-100 dark:hover:bg-slate-600";
            }
        }

        dayElements.push(
            <div key={day} onClick={() => !isPast && handleDateToggle(dateStr)} className={className}>
                {day}
            </div>
        );
    }

    return (
      <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <button type="button" onClick={() => changeMonth(-1)} className="font-bold px-3 py-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600">&lt;</button>
          <div className="font-semibold text-lg">{viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</div>
          <button type="button" onClick={() => changeMonth(1)} className="font-bold px-3 py-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600">&gt;</button>
        </div>
        <div className="grid grid-cols-7 gap-y-2 text-sm text-center text-slate-500 dark:text-slate-400">
            <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
        </div>
        <div className="grid grid-cols-7 gap-y-2 mt-2">
            {dayElements}
        </div>
      </div>
    );
  };


  return (
    <form onSubmit={handleSubmit} className="space-y-6">
       <h2 className="text-2xl font-semibold text-center text-slate-700 dark:text-slate-200">Create a New Event</h2>
      <div>
        <label htmlFor="eventName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Event Name
        </label>
        <input
          type="text"
          id="eventName"
          value={eventName}
          onChange={(e) => setEventName(e.target.value)}
          placeholder="e.g., Team Lunch"
          className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-slate-50 dark:bg-slate-700"
          required
        />
      </div>
      <div>
        <label htmlFor="creator" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Your Name
        </label>
        <input
          type="text"
          id="creator"
          value={creator}
          onChange={(e) => setCreator(e.target.value)}
          placeholder="e.g., Alex"
          className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-slate-50 dark:bg-slate-700"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Schedule Type</label>
        <div className="flex justify-center gap-4">
          <label className="flex items-center">
            <input type="radio" name="scheduleType" value="date-based" checked={scheduleType === 'date-based'} onChange={() => setScheduleType('date-based')} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300" />
            <span className="ml-2 text-slate-700 dark:text-slate-300">Custom Dates</span>
          </label>
          <label className="flex items-center">
            <input type="radio" name="scheduleType" value="weekly" checked={scheduleType === 'weekly'} onChange={() => setScheduleType('weekly')} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300" />
            <span className="ml-2 text-slate-700 dark:text-slate-300">Week</span>
          </label>
        </div>
      </div>
      
      {scheduleType === 'date-based' && (
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Select Dates (up to 10)
          </label>
          {renderCalendar()}
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedDates.map(date => (
              <div key={date} className="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 text-sm px-2 py-1 rounded-md flex items-center gap-2">
                <span>{new Date(date + 'T00:00:00').toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                <button type="button" onClick={() => handleDateToggle(date)} className="text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100 font-bold">&times;</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        type="submit"
        className="w-full bg-blue-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 mt-4"
      >
        Create & Share
      </button>
    </form>
  );
};

export default CreateEventForm;