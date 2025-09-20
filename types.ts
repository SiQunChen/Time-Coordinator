
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
  createdAt: number; 
  timeSlots: EventTimeSlot[];
  finalizedTime: string[] | null; 
  eventType: EventType;
  participants: ParticipantRecord[]; // 新增：用來儲存所有參與者及其權杖
}

export interface Participant {
  name: string;
  // 我們不再直接儲存 hasVoted
}

// 新增一個後端用來儲存參與者完整資訊的類型
export interface ParticipantRecord {
  name: string;
  token: string; // 秘密權杖
}