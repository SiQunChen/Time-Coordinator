
import React, { useState } from 'react';

interface UsernameModalProps {
  onSubmit: (name: string) => void;
  error: string | null;
  onClearError: () => void;
}

const UsernameModal: React.FC<UsernameModalProps> = ({ onSubmit, error, onClearError }) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim());
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    if(error) {
        onClearError();
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-8 w-full max-w-sm">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4">Welcome!</h2>
        <p className="text-slate-600 dark:text-slate-300 mb-6">Please enter your name to join the event.</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            onChange={handleChange}
            placeholder="Your name"
            className={`w-full px-4 py-2 border rounded-lg bg-slate-50 dark:bg-slate-700 mb-2 ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-slate-300 dark:border-slate-600 focus:ring-blue-500 focus:border-blue-500'}`}
            autoFocus
            required
          />
          {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
          <button
            type="submit"
            className="w-full bg-blue-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors mt-2"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
};

export default UsernameModal;