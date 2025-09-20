import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { EventData, Participant, EventTimeSlot } from '../types';
import UsernameModal from '../components/UsernameModal';
import TimeTable from '../components/TimeTable';
import ParticipantsList from '../components/ParticipantsList';
import { CheckCircleIcon } from '../components/icons/CheckCircleIcon';

const SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000;

const EventPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(() => sessionStorage.getItem('username'));
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  const API_BASE_URL = 'https://time-coordinator-api.jerry92033119.workers.dev';

  // 主要的資料獲取和輪詢邏輯
  useEffect(() => {
      if (!id) {
        setError("No event ID provided.");
        return;
      }

      let isActive = true; // 防止在元件卸載後還在更新狀態

      const fetchEvent = async () => {
          try {
              const response = await fetch(`${API_BASE_URL}/events/${id}`);
              if (!response.ok) {
                  if(response.status === 404) throw new Error("Event not found. The link might be incorrect or the event has expired.");
                  throw new Error("Failed to load event data.");
              }
              const data = await response.json();
              
              if (isActive) {
                  // 這裡可以保留或移除過期邏輯,或者由後端處理
                  if (Date.now() - data.createdAt > SEVEN_DAYS_IN_MS) {
                      setIsExpired(true);
                  } else {
                      setEventData(data);
                  }
              }
          } catch (e: any) {
              if (isActive) {
                  setError(e.message);
                  console.error(e);
              }
          }
      };
      
      fetchEvent(); // 立即獲取一次

      // 設定每 3 秒輪詢一次
      const intervalId = setInterval(fetchEvent, 3000);

      // 清理函數
      return () => {
          isActive = false;
          clearInterval(intervalId);
      };
  }, [id]);

  const participants = useMemo<Participant[]>(() => {
    if (!eventData) return [];
    const allNames = new Set<string>([eventData.creator]);
    eventData.timeSlots.forEach(slot => {
      Object.keys(slot.participants).forEach(name => allNames.add(name));
    });

    const votedNames = new Set<string>();
    eventData.timeSlots.forEach(slot => {
        Object.keys(slot.participants).forEach(name => votedNames.add(name));
    });

    return Array.from(allNames).map(name => ({
      name,
      hasVoted: votedNames.has(name)
    })).sort((a,b) => a.name.localeCompare(b.name));
  }, [eventData]);

  const updateEventData = async (newEventData: EventData) => {
    // 樂觀更新 UI,讓體驗更流暢
    setEventData(newEventData);

    try {
        const response = await fetch(`${API_BASE_URL}/events/${newEventData.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newEventData),
        });

        if (!response.ok) {
            // 如果更新失敗,可以考慮將 UI 回滾到之前的狀態
            console.error("Failed to save event data.");
            // 可以在這裡觸發一個錯誤提示
        }
    } catch (error) {
        console.error("Error updating event:", error);
    }
  };

  const handleUsernameSubmit = (name: string) => {
    const isNameTaken = participants.some(p => p.name.toLowerCase() === name.toLowerCase());
    if(isNameTaken) {
        setUsernameError("This name is already taken. Please choose another one.");
        return;
    }
    setUsername(name);
    sessionStorage.setItem('username', name);
    setUsernameError(null);
  };

  const handleSlotToggle = (time: string, select: boolean) => {
    if (!eventData || !username || eventData.finalizedTime) return;

    const newTimeSlots = eventData.timeSlots.map(slot => {
      if (slot.time === time) {
        const newParticipants = { ...slot.participants };
        if (select) {
          newParticipants[username] = true;
        } else {
          delete newParticipants[username];
        }
        return { ...slot, participants: newParticipants };
      }
      return slot;
    });

    updateEventData({ ...eventData, timeSlots: newTimeSlots });
  };
  
  const getBestTimeSlots = (): EventTimeSlot[] => {
      if (!eventData || eventData.timeSlots.length === 0) return [];
      
      let maxParticipants = 0;
      eventData.timeSlots.forEach(slot => {
          const count = Object.keys(slot.participants).length;
          if (count > maxParticipants) {
              maxParticipants = count;
          }
      });

      if (maxParticipants === 0) return [];

      return eventData.timeSlots.filter(slot => Object.keys(slot.participants).length === maxParticipants);
  }

  const handleFinalizeEvent = () => {
    if (!eventData || eventData.creator !== username) return;
    const bestTimes = getBestTimeSlots();
    if(bestTimes.length > 0) {
        // **修改這裡：傳遞所有最高票時間的字串陣列**
        const bestTimeStrings = bestTimes.map(slot => slot.time);
        updateEventData({ ...eventData, finalizedTime: bestTimeStrings });
    } else {
        alert("無法確認：沒有人標示任何可用的時間。");
    }
  };

  const formatDisplayTime = (time: string, eventType: 'date-based' | 'weekly'): string => {
    if (eventType === 'date-based') {
      return new Date(time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
    }
    const [dayIndex, hour] = time.split('-').map(Number);
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const timeString = new Date(`1970-01-01T${String(hour).padStart(2, '0')}:00:00`).toLocaleTimeString([], { timeStyle: 'short' });
    return `Every ${days[dayIndex]} at ${timeString}`;
  }
  
    const formatFinalizedTime = (time: string, eventType: 'date-based' | 'weekly'): string => {
    if (eventType === 'date-based') {
      return new Date(time).toLocaleString([], { dateStyle: 'full', timeStyle: 'short' });
    }
    const [dayIndex, hour] = time.split('-').map(Number);
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const timeString = new Date(`1970-01-01T${String(hour).padStart(2, '0')}:00:00`).toLocaleTimeString([], { timeStyle: 'short' });
    return `Every ${days[dayIndex]} at ${timeString}`;
  }


  if (isExpired) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-4">
        <h1 className="text-4xl font-bold text-red-500 mb-4">Event Expired</h1>
        <p className="text-lg text-slate-600 dark:text-slate-300">This event was created over 7 days ago with no activity and has been automatically removed.</p>
        <Link to="/" className="mt-6 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Create a new event</Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-4">
        <h1 className="text-4xl font-bold text-red-500 mb-4">Error</h1>
        <p className="text-lg text-slate-600 dark:text-slate-300">{error}</p>
        <Link to="/" className="mt-6 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Go to Homepage</Link>
      </div>
    );
  }

  if (!eventData) {
    return <div className="min-h-screen flex items-center justify-center"><p>Loading event...</p></div>;
  }

  if (!username) {
    return <UsernameModal onSubmit={handleUsernameSubmit} error={usernameError} onClearError={() => setUsernameError(null)} />;
  }

  if (eventData.finalizedTime && eventData.finalizedTime.length > 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-2xl mx-auto text-center bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
           <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">活動時間已確認！</h1>
          <p className="text-lg text-slate-600 dark:text-slate-300 mb-4">
            活動 <span className="font-semibold text-blue-500">{eventData.eventName}</span> 的最佳時間選項如下：
          </p>
          {/* **修改這裡：使用 ul 和 map 來顯示所有時間** */}
          <div className="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 text-xl font-semibold p-4 rounded-lg">
            <ul className="space-y-2">
              {eventData.finalizedTime.map(time => (
                <li key={time}>
                  {formatFinalizedTime(time, eventData.eventType)}
                </li>
              ))}
            </ul>
          </div>
          <Link to="/" className="mt-8 inline-block px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">建立另一個活動</Link>
        </div>
      </div>
    );
  }
  
  const bestSlots = getBestTimeSlots();

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight">{eventData.eventName}</h1>
        <p className="text-slate-500 dark:text-slate-400">Created by: {eventData.creator}</p>
        <p className="text-slate-500 dark:text-slate-400">You are signed in as: <span className="font-bold text-blue-500">{username}</span></p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
            <TimeTable
                timeSlots={eventData.timeSlots}
                onSlotToggle={handleSlotToggle}
                currentUser={username}
                finalized={!!eventData.finalizedTime}
                maxParticipants={participants.length}
                bestSlots={bestSlots.map(s => s.time)}
                eventType={eventData.eventType}
            />
        </div>
        <div className="lg:col-span-1 space-y-6">
            {bestSlots.length > 0 && (
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border border-slate-200 dark:border-slate-700">
                <h3 className="text-xl font-semibold mb-3 text-slate-800 dark:text-slate-100">🔥 Top Times</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  The most popular slots with {Object.keys(bestSlots[0].participants).length} of {participants.length} participants available.
                </p>
                <ul className="space-y-2">
                  {bestSlots.slice(0, 5).map(slot => ( // Show up to 5 best slots
                    <li key={slot.time} className="p-2 bg-green-100 dark:bg-green-900/50 rounded-md text-sm font-medium text-green-800 dark:text-green-200">
                      {formatDisplayTime(slot.time, eventData.eventType)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <ParticipantsList participants={participants} creator={eventData.creator} />

            {username === eventData.creator && (
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border border-slate-200 dark:border-slate-700">
                <h3 className="text-xl font-semibold mb-3">Admin Actions</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Once a suitable time is found, you can finalize the event.</p>
                <button
                    onClick={handleFinalizeEvent}
                    disabled={bestSlots.length === 0}
                    className="w-full bg-green-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-600 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
                >
                    Finalize Event
                </button>
                 {bestSlots.length > 0 && eventData.eventType === 'date-based' && <p className="text-xs text-center mt-2 text-slate-500">Will confirm for {new Date(bestSlots[0].time).toLocaleString([], {weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'})}</p>}
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default EventPage;