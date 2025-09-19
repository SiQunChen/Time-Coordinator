
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'; 
import HomePage from './pages/HomePage';
import EventPage from './pages/EventPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/event/:id" element={<EventPage />} /> 
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter> 
  );
}

export default App;
