import { EventData } from '../types';

export const encodeEventData = (data: EventData): string => {
  try {
    const jsonString = JSON.stringify(data);
    // Use encodeURIComponent to handle Unicode characters before base64 encoding.
    // This prevents the "The string to be encoded contains characters outside of the Latin1 range." error.
    const encodedUriComponent = encodeURIComponent(jsonString);
    return btoa(encodedUriComponent);
  } catch (error) {
    console.error("Failed to encode event data:", error);
    throw new Error("Could not encode event data.");
  }
};

export const decodeEventData = (encodedData: string): EventData => {
  try {
    const decodedUriComponent = atob(encodedData);
    // Use decodeURIComponent to correctly process the URI-encoded string.
    const jsonString = decodeURIComponent(decodedUriComponent);
    const data = JSON.parse(jsonString);
    // Basic validation
    if (!data.id || !data.eventName || !data.timeSlots) {
        throw new Error("Invalid event data structure.");
    }
    return data as EventData;
  } catch (error) {
    console.error("Failed to decode event data:", error);
    throw new Error("Could not decode event data.");
  }
};
