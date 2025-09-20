import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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

  // **修改**: 將原本的 inactivityTimerRef 改為 pollingTimerRef，語意更清晰
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const debounceSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const API_BASE_URL = 'https://time-coordinator-api.jerry92033119.workers.dev';

  // 從伺服器獲取最新事件資料的函數 (此函數本身不變)
  const fetchEventData = useCallback(async () => {
    if (!id) return;
    try {
      const response = await fetch(`${API_BASE_URL}/events/${id}`);
      if (!response.ok) {
        throw new Error("無法獲取事件資料");
      }
      const data = await response.json();
      setEventData(data);
    } catch (e) {
      console.error("獲取資料失敗:", e);
    }
  }, [id]);

  // **主要修改**: 元件載入時的副作用處理
  useEffect(() => {
    if (!id) {
      setError("沒有提供事件 ID。");
      return;
    }
    
    // 1. 立即獲取一次初始資料，確保使用者能馬上看到內容
    fetchEventData();

    // 2. **核心修正**: 將 setTimeout 改為 setInterval
    //    這會建立一個輪詢機制，每 3 秒鐘自動呼叫 fetchEventData，
    //    無論使用者是否有操作，都能確保所有客戶端資料同步。
    if (pollingTimerRef.current) clearInterval(pollingTimerRef.current); // 防禦性清除
    pollingTimerRef.current = setInterval(fetchEventData, 3000);

    // 3. 元件卸載時務必清除所有計時器，避免記憶體洩漏
    return () => {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
      if (debounceSaveTimerRef.current) clearTimeout(debounceSaveTimerRef.current);
    };
  }, [id, fetchEventData]); // 依賴項不變


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

  // **修改**: 使用者操作的核心函數
  const handleSlotToggle = (time: string, select: boolean) => {
    if (!eventData || !username || (eventData.finalizedTime && eventData.finalizedTime.length > 0)) return;

    // 1. **移除 resetInactivityTimer()**: 因為現在由固定的 setInterval 負責更新，
    //    不再需要根據使用者操作來重置計時器。

    // 2. **樂觀更新 UI** (不變): 讓使用者感覺操作立即生效
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

    // 3. **設定儲存防抖** (不變)
    if (debounceSaveTimerRef.current) {
      clearTimeout(debounceSaveTimerRef.current);
    }

    debounceSaveTimerRef.current = setTimeout(async () => {
      try {
        await fetch(`${API_BASE_URL}/events/${updatedEventData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedEventData),
        });
      } catch (error) {
        console.error("儲存事件資料失敗:", error);
        // 如果儲存失敗，最好立即重新獲取一次伺服器狀態，以還原 UI
        fetchEventData(); 
      }
    }, 1000);
  };
  
  // **修改**: 確認事件時，停止輪詢
  const updateEventDataOnFinalize = async (newEventData: EventData) => {
    // 停止所有計時器，因為事件已經結束，不再需要同步
    if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
    if (debounceSaveTimerRef.current) clearTimeout(debounceSaveTimerRef.current);

    setEventData(newEventData);
    await fetch(`${API_BASE_URL}/events/${newEventData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEventData),
    });
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
        const bestTimeStrings = bestTimes.map(slot => slot.time);
        updateEventDataOnFinalize({ ...eventData, finalizedTime: bestTimeStrings });
    } else {
        alert("無法確認：沒有人標示任何可用的時間。");
    }
  };

  const handleUsernameSubmit = (name: string) => {
    const isNameTaken = participants.some(p => p.name.toLowerCase() === name.toLowerCase());
    if(isNameTaken) {
        setUsernameError("這個名稱已經被使用，請選擇其他名稱。");
        return;
    }
    setUsername(name);
    sessionStorage.setItem('username', name);
    setUsernameError(null);
  };

  const formatDisplayTime = (time: string, eventType: 'date-based' | 'weekly'): string => {
    if (eventType === 'date-based') {
      return new Date(time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
    }
    const [dayIndex, hour] = time.split('-').map(Number);
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const timeString = new Date(`1970-01-01T${String(hour).padStart(2, '0')}:00:00`).toLocaleTimeString([], { timeStyle: 'short' });
    return `每週 ${days[dayIndex]} ${timeString}`;
  }
  
  const formatFinalizedTime = (time: string, eventType: 'date-based' | 'weekly'): string => {
    if (eventType === 'date-based') {
      return new Date(time).toLocaleString([], { dateStyle: 'full', timeStyle: 'short' });
    }
    const [dayIndex, hour] = time.split('-').map(Number);
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const timeString = new Date(`1970-01-01T${String(hour).padStart(2, '0')}:00:00`).toLocaleTimeString([], { timeStyle: 'short' });
    return `每週 ${days[dayIndex]} ${timeString}`;
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
          <p className="text-lg text-slate-600 dark:text-slate-300 mb-4">活動 <span className="font-semibold text-blue-500">{eventData.eventName}</span> 的最佳時間選項如下：</p>
          <div className="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 text-xl font-semibold p-4 rounded-lg">
            <ul className="space-y-2 text-left">
              {eventData.finalizedTime.map(time => (
                <li key={time} className="pl-2">
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
        <p className="text-slate-500 dark:text-slate-400">建立者: {eventData.creator}</p>
        <p className="text-slate-500 dark:text-slate-400">您目前登入的身分是: <span className="font-bold text-blue-500">{username}</span></p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
            <TimeTable
                timeSlots={eventData.timeSlots}
                onSlotToggle={handleSlotToggle}
                currentUser={username}
                finalized={!!(eventData.finalizedTime && eventData.finalizedTime.length > 0)}
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