
export interface TimeSlotSelection {
  [username: string]: boolean;
}

export interface EventTimeSlot {
  time: string; // ISO string for 'date-based', 'day-hour' (e.g., '1-8') for 'weekly'
  participants: TimeSlotSelection;
}

export type EventType = 'date-based' | 'weekly';

export interface EventData {
  id: string;
  eventName: string;
  creator: string;
  createdAt: number; // Unix timestamp
  timeSlots: EventTimeSlot[];
  finalizedTime: string[] | null; 
  eventType: EventType;
}

export interface Participant {
  name: string;
  hasVoted: boolean;
}