
import React from 'react';
import CreateEventForm from '../components/CreateEventForm';
import { ClockIcon } from '../components/icons/ClockIcon';

const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg mx-auto text-center">
        <div className="flex justify-center items-center gap-4 mb-6">
           <ClockIcon className="h-12 w-12 text-blue-500" />
          <h1 className="text-4xl md:text-5xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
            Time Coordinator
          </h1>
        </div>
        <p className="text-lg text-slate-600 dark:text-slate-300 mb-8">
          Find the perfect time for your event. Create a plan, share the link, and see when everyone is free.
        </p>
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
          <CreateEventForm />
        </div>
        <footer className="mt-12 text-sm text-slate-500 dark:text-slate-400">
          <p>&copy; {new Date().getFullYear()} Time Coordinator. Making scheduling simple.</p>
        </footer>
      </div>
    </div>
  );
};

export default HomePage;