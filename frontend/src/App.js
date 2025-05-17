import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';

// Home page component
function Home() {
  return (
    <div className="bg-primary min-h-screen flex flex-col items-center justify-center text-white px-4">
      <h1 className="text-4xl font-bold mb-4 text-center">ForexSignals</h1>
      <p className="text-xl mb-8 text-center">Premium trading signals for forex traders</p>
      <Link to="/about" className="bg-secondary hover:bg-secondary-dark px-6 py-3 rounded-lg font-bold transition duration-200">
        Learn More
      </Link>
    </div>
  );
}

// About page component
function About() {
  return (
    <div className="bg-neutral min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold mb-4 text-primary">About ForexSignals</h1>
        <p className="mb-4">ForexSignals provides premium trading signals for forex traders of all experience levels.</p>
        <p className="mb-6">Our signals include currency pair, entry price, take profit and stop loss levels.</p>
        <Link to="/" className="bg-primary text-white hover:bg-primary-dark px-6 py-2 rounded-lg font-medium transition duration-200 inline-block">
          Back to Home
        </Link>
      </div>
    </div>
  );
}

// Main app component
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </Router>
  );
}

export default App;
