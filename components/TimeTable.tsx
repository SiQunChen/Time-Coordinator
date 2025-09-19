
import React, { useState, useEffect, useRef } from 'react';
import { EventTimeSlot, EventType } from '../types';
import { UsersIcon } from './icons/UsersIcon';

interface TimeTableProps {
  timeSlots: EventTimeSlot[];
  onSlotToggle: (time: string, select: boolean) => void;
  currentUser: string;
  finalized: boolean;
  maxParticipants: number;
  bestSlots: string[];
  eventType: EventType;
}

interface GroupedSlots {
  [key: string]: EventTimeSlot[];
}

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SHORT_DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];


const TimeSlotComponent: React.FC<{
    slot: EventTimeSlot;
    isCurrentUserAvailable: boolean;
    onMouseDown: () => void;
    onMouseEnter: () => void;
    isDisabled: boolean;
    color: string;
    isBestSlot: boolean;
    eventType: EventType;
}> = ({ slot, isCurrentUserAvailable, onMouseDown, onMouseEnter, isDisabled, color, isBestSlot, eventType }) => {
    const [isHovered, setIsHovered] = useState(false);
    const participantCount = Object.keys(slot.participants).length;

    const getTimeLabel = () => {
        if (eventType === 'date-based') {
            return new Date(slot.time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
        }
        const hour = parseInt(slot.time.split('-')[1]);
        const date = new Date();
        date.setHours(hour, 0);
        return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    return (
        <div className="relative select-none">
            <div
                onMouseDown={onMouseDown}
                onMouseEnter={onMouseEnter}
                onContextMenu={(e) => e.preventDefault()}
                onMouseOver={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className={`w-full h-20 p-1 rounded-lg text-left transition-all duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 ${color} ${
                    isCurrentUserAvailable ? 'ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-slate-900' : ''
                } ${isDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${isBestSlot ? 'border-2 border-green-400' : ''}`}
            >
                <div className="font-semibold text-sm">
                    {getTimeLabel()}
                </div>
                <div className="flex items-center gap-1 mt-1 text-xs">
                    <UsersIcon className="w-4 h-4" />
                    <span>{participantCount}</span>
                </div>
            </div>
            {isHovered && participantCount > 0 && (
                <div className="absolute z-10 bottom-full mb-2 w-max max-w-xs p-3 bg-slate-800 text-white text-sm rounded-lg shadow-lg pointer-events-none">
                    <h4 className="font-bold mb-1">Available:</h4>
                    <ul className="list-disc list-inside">
                        {Object.keys(slot.participants).map(name => (
                            <li key={name}>{name}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};


const TimeTable: React.FC<TimeTableProps> = ({ timeSlots, onSlotToggle, currentUser, finalized, maxParticipants, bestSlots, eventType }) => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectMode, setSelectMode] = useState<boolean>(true); // true for selecting, false for deselecting
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseUp = () => setIsSelecting(false);
    
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const handleMouseDown = (slot: EventTimeSlot) => {
    if (finalized) return;
    setIsSelecting(true);
    const shouldSelect = !slot.participants[currentUser];
    setSelectMode(shouldSelect);
    onSlotToggle(slot.time, shouldSelect);
  };
  
  const handleMouseEnter = (slot: EventTimeSlot) => {
    if (isSelecting && !finalized) {
      if (!!slot.participants[currentUser] !== selectMode) {
        onSlotToggle(slot.time, selectMode);
      }
    }
  };

  const groupedSlots = timeSlots.reduce((acc, slot) => {
    const key = eventType === 'date-based' 
        ? new Date(slot.time).toDateString()
        : slot.time.split('-')[0];
    
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(slot);
    return acc;
  }, {} as GroupedSlots);

  const getSlotColor = (participantCount: number) => {
    if (finalized) return 'bg-slate-200 dark:bg-slate-700 text-slate-500';
    if (participantCount === 0) return 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700';
    
    const percentage = maxParticipants > 0 ? participantCount / maxParticipants : 0;
    if (percentage < 0.33) return 'bg-green-100 hover:bg-green-200 dark:bg-green-900/40 dark:hover:bg-green-900/60 text-green-800 dark:text-green-200';
    if (percentage < 0.66) return 'bg-green-200 hover:bg-green-300 dark:bg-green-800/60 dark:hover:bg-green-800/80 text-green-800 dark:text-green-100';
    return 'bg-green-400 hover:bg-green-500 dark:bg-green-700 dark:hover:bg-green-600 text-green-900 dark:text-white';
  };
  
  const getHeader = (key: string) => {
    if (eventType === 'date-based') {
        const date = new Date(key);
        return (
            <>
                <div>{date.toLocaleDateString([], { weekday: 'short' })}</div>
                <div className="text-lg">{date.toLocaleDateString([], { month: 'short', day: 'numeric' })}</div>
            </>
        )
    }
    const dayIndex = parseInt(key);
    return (
        <>
            <div>{SHORT_DAYS_OF_WEEK[dayIndex]}</div>
            <div className="text-lg">{DAYS_OF_WEEK[dayIndex]}</div>
        </>
    )
  }

  return (
    <div ref={tableRef} className="bg-white dark:bg-slate-800/50 p-4 sm:p-6 rounded-xl shadow-md border border-slate-200 dark:border-slate-700">
        <div className="overflow-x-auto">
            <div className="flex space-x-4" onMouseLeave={() => setIsSelecting(false)}>
                {Object.keys(groupedSlots).sort((a,b) => {
                    if (eventType === 'weekly') return parseInt(a) - parseInt(b);
                    return new Date(a).getTime() - new Date(b).getTime();
                }).map(key => (
                    <div key={key} className="min-w-[150px] flex-shrink-0">
                        <div className="text-center font-bold mb-4 p-2 rounded-lg bg-slate-100 dark:bg-slate-700 select-none">
                            {getHeader(key)}
                        </div>
                        <div className="space-y-2">
                            {groupedSlots[key].map(slot => (
                                <TimeSlotComponent
                                    key={slot.time}
                                    slot={slot}
                                    isCurrentUserAvailable={!!slot.participants[currentUser]}
                                    onMouseDown={() => handleMouseDown(slot)}
                                    onMouseEnter={() => handleMouseEnter(slot)}
                                    isDisabled={finalized}
                                    color={getSlotColor(Object.keys(slot.participants).length)}
                                    isBestSlot={bestSlots.includes(slot.time)}
                                    eventType={eventType}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );
};

export default TimeTable;