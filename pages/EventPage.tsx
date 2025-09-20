import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [eventData, setEventData] = useState<EventData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(() => localStorage.getItem('username'));
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  // 【程式碼修改 1/5】: 新增 state 來控制是否只顯示自己的選擇
  const [showMySelectionOnly, setShowMySelectionOnly] = useState(false);


  const API_BASE_URL = 'https://time-coordinator-api.jerry92033119.workers.dev';

  // ... (fetchEvent, stopPolling, startPolling 函式維持不變)
  const fetchEvent = async () => {
    if (!id) return;
    try {
        const response = await fetch(`${API_BASE_URL}/events/${id}`);
        if (!response.ok) {
            if(response.status === 404) throw new Error("Event not found. The link might be incorrect or the event has expired.");
            throw new Error("Failed to load event data.");
        }
        const data = await response.json();
        
        if (!debounceTimeoutRef.current) {
             setEventData(data);
        }
       
        if (Date.now() - data.createdAt > SEVEN_DAYS_IN_MS) {
            setIsExpired(true);
        }
    } catch (e: any) {
        if (e instanceof Error) setError(e.message);
        console.error(e);
    }
  };

  const stopPolling = () => {
      if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
      }
  };
  
  const startPolling = () => {
      stopPolling(); 
      fetchEvent(); 
      pollingIntervalRef.current = setInterval(fetchEvent, 3000);
  };


  useEffect(() => {
    if (!id) {
      setError("No event ID provided.");
      return;
    }
    startPolling();
    return () => {
        stopPolling();
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
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

  const pushUpdatesToServer = async (localEventData: EventData) => {
    if (!id || !username) return;

    try {
      const response = await fetch(`${API_BASE_URL}/events/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch latest data before updating.");
      }
      const serverData: EventData = await response.json();

      const mergedTimeSlots = serverData.timeSlots.map(serverSlot => {
        const localSlot = localEventData.timeSlots.find(s => s.time === serverSlot.time);
        const isCurrentUserSelectedInLocal = localSlot ? !!localSlot.participants[username] : false;

        const mergedParticipants = { ...serverSlot.participants };

        if (isCurrentUserSelectedInLocal) {
          mergedParticipants[username] = true;
        } else {
          delete mergedParticipants[username];
        }
        
        return { ...serverSlot, participants: mergedParticipants };
      });
      
      const dataToSend = { ...serverData, timeSlots: mergedTimeSlots };

      await fetch(`${API_BASE_URL}/events/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });

    } catch (error) {
      console.error("更新事件時發生錯誤:", error);
    } finally {
      debounceTimeoutRef.current = null;
      startPolling();
    }
  };

  const handleUsernameSubmit = (name: string) => {
    const isNameTaken = participants.some(p => p.name.toLowerCase() === name.toLowerCase());
    if(isNameTaken) {
        setUsernameError("This name is already taken. Please choose another one.");
        return;
    }
    setUsername(name);
    localStorage.setItem('username', name);
    setUsernameError(null);
  };

  const handleSlotToggle = (time: string, select: boolean) => {
    if (!eventData || !username || eventData.finalizedTime) return;

    if (!debounceTimeoutRef.current) {
        stopPolling();
    }
    
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

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

    const updatedEventData = { ...eventData, timeSlots: newTimeSlots };
    setEventData(updatedEventData); 

    debounceTimeoutRef.current = setTimeout(() => {
      pushUpdatesToServer(updatedEventData);
    }, 500);
  };

  // 【程式碼修改 2/5】: 新增一個函式來處理清空使用者所有選擇的邏輯
  const handleClearMySelections = () => {
    if (!eventData || !username || eventData.finalizedTime) return;

    // 如果正在 debounce，就取消它
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    // 停止輪詢以進行更新
    stopPolling();

    // 建立一個新的 timeSlots 陣列，其中目前使用者的選擇都已被移除
    const newTimeSlots = eventData.timeSlots.map(slot => {
      if (slot.participants[username]) {
        const newParticipants = { ...slot.participants };
        delete newParticipants[username];
        return { ...slot, participants: newParticipants };
      }
      return slot;
    });

    const updatedEventData = { ...eventData, timeSlots: newTimeSlots };
    // 立即更新 UI
    setEventData(updatedEventData); 

    // 透過 debounce 將更新推送到伺服器
    debounceTimeoutRef.current = setTimeout(() => {
      pushUpdatesToServer(updatedEventData);
    }, 500);
  };
  
  // ... (getBestTimeSlots, handleFinalizeEvent, formatDisplayTime, formatFinalizedTime 函式維持不變)
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

  const handleFinalizeEvent = async () => {
    if (!eventData || eventData.creator !== username || !id) return;

    const bestTimes = getBestTimeSlots();
    if (bestTimes.length === 0) {
      alert("Cannot finalize: no one has marked their availability for any slot.");
      return;
    }
    const bestTimeStrings = bestTimes.map(slot => slot.time);

    stopPolling(); 

    try {
      const response = await fetch(`${API_BASE_URL}/events/${id}`);
      if (!response.ok) throw new Error("Could not fetch latest data to finalize.");
      const serverData = await response.json();

      const dataToSend = { ...serverData, finalizedTime: bestTimeStrings };

      setEventData(dataToSend);
      await fetch(`${API_BASE_URL}/events/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });

    } catch(error) {
      console.error("Finalize event error:", error);
      startPolling(); 
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


  // ... (UI 渲染邏輯，除了 Main Event View)

  if (isExpired) { // ... (維持不變)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-4">
        <h1 className="text-4xl font-bold text-red-500 mb-4">Event Expired</h1>
        <p className="text-lg text-slate-600 dark:text-slate-300">This event was created over 7 days ago with no activity and has been automatically removed.</p>
        <Link to="/" className="mt-6 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Create a new event</Link>
      </div>
    );
  }
  if (error) { // ... (維持不變)
     return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-4">
        <h1 className="text-4xl font-bold text-red-500 mb-4">Error</h1>
        <p className="text-lg text-slate-600 dark:text-slate-300">{error}</p>
        <Link to="/" className="mt-6 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Go to Homepage</Link>
      </div>
    );
  }
  if (!eventData) { // ... (維持不變)
    return <div className="min-h-screen flex items-center justify-center"><p>Loading event...</p></div>;
  }
  if (!username) { // ... (維持不變)
    return <UsernameModal onSubmit={handleUsernameSubmit} error={usernameError} onClearError={() => setUsernameError(null)} />;
  }
  if (eventData.finalizedTime && eventData.finalizedTime.length > 0) { // ... (維持不變)
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-2xl mx-auto text-center bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
           <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">活動時間已確認！</h1>
          <p className="text-lg text-slate-600 dark:text-slate-300 mb-4">
            活動 <span className="font-semibold text-blue-500">{eventData.eventName}</span> 的最佳時間選項如下：
          </p>
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
            {/* 【程式碼修改 3/5】: 在時間表上方新增一個控制區塊 */}
            <div className="bg-white dark:bg-slate-800/50 p-4 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 mb-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center">
                    <input
                        type="checkbox"
                        id="showMySelectionOnly"
                        checked={showMySelectionOnly}
                        onChange={(e) => setShowMySelectionOnly(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="showMySelectionOnly" className="ml-2 block text-sm text-slate-900 dark:text-slate-200">
                        Hide others' selections
                    </label>
                </div>
                <button
                    onClick={handleClearMySelections}
                    disabled={!!eventData.finalizedTime}
                    className="px-4 py-2 text-sm font-medium text-red-600 bg-red-100 border border-transparent rounded-md hover:bg-red-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Clear my selections
                </button>
            </div>
            <TimeTable
                timeSlots={eventData.timeSlots}
                onSlotToggle={handleSlotToggle}
                currentUser={username}
                finalized={!!eventData.finalizedTime}
                maxParticipants={participants.length}
                bestSlots={bestSlots.map(s => s.time)}
                eventType={eventData.eventType}
                // 【程式碼修改 4/5】: 將新的 state 傳遞給 TimeTable 元件
                showMySelectionOnly={showMySelectionOnly}
            />
        </div>
        <div className="lg:col-span-1 space-y-6">
            {/* 【程式碼修改 5/5】: 當只顯示自己選擇時，隱藏「最佳時段」區塊 */}
            {!showMySelectionOnly && bestSlots.length > 0 && (
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border border-slate-200 dark:border-slate-700">
                <h3 className="text-xl font-semibold mb-3 text-slate-800 dark:text-slate-100">🔥 Top Times</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  The most popular slots with {Object.keys(bestSlots[0].participants).length} of {participants.length} participants available.
                </p>
                <ul className="space-y-2">
                  {bestSlots.slice(0, 5).map(slot => (
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