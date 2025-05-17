import React from 'react';
import './App.css';

function App() {
  return (
    <div className="bg-primary min-h-screen flex flex-col items-center justify-center text-white">
      <h1 className="text-4xl font-bold mb-4">ForexSignals</h1>
      <p className="text-xl mb-8">Premium trading signals for forex traders</p>
      <div className="bg-secondary hover:bg-secondary-dark px-6 py-3 rounded-lg font-bold transition duration-200">
        Get Started
      </div>
    </div>
  );
}

export default App;
