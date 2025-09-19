
import React from 'react';
import { Participant } from '../types';

interface ParticipantsListProps {
  participants: Participant[];
  creator: string;
}

const ParticipantsList: React.FC<ParticipantsListProps> = ({ participants, creator }) => {
  const responded = participants.filter(p => p.hasVoted);
  const pending = participants.filter(p => !p.hasVoted);

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border border-slate-200 dark:border-slate-700">
      <h3 className="text-xl font-semibold mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">
        Participants ({participants.length})
      </h3>
      
      <div className="space-y-4">
        <div>
          <h4 className="font-semibold text-green-600 dark:text-green-400 mb-2">Responded ({responded.length})</h4>
          <ul className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
            {responded.map(p => (
              <li key={p.name} className="flex items-center">
                <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                {p.name} {p.name === creator && <span className="text-xs text-slate-400 ml-1">(Creator)</span>}
              </li>
            ))}
            {responded.length === 0 && <li className="text-slate-400 italic">No one has responded yet.</li>}
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-amber-600 dark:text-amber-400 mb-2">Pending ({pending.length})</h4>
           <ul className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
            {pending.map(p => (
              <li key={p.name} className="flex items-center">
                 <span className="w-2 h-2 rounded-full bg-amber-500 mr-2"></span>
                {p.name} {p.name === creator && <span className="text-xs text-slate-400 ml-1">(Creator)</span>}
              </li>
            ))}
             {pending.length === 0 && <li className="text-slate-400 italic">Everyone has responded!</li>}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ParticipantsList;
