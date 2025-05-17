import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import "./App.css";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Authentication Context
const AuthContext = React.createContext(null);

const useAuth = () => {
  return React.useContext(AuthContext);
};

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (token) {
      const fetchUserProfile = async () => {
        try {
          const response = await axios.get(`${API}/users/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUser(response.data);
        } catch (error) {
          console.error("Error fetching user profile:", error);
          localStorage.removeItem('token');
        } finally {
          setLoading(false);
        }
      };
      
      fetchUserProfile();
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API}/token`, 
        new URLSearchParams({
          'username': email,
          'password': password
        }), 
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      localStorage.setItem('token', response.data.access_token);
      
      // Fetch user profile
      const userResponse = await axios.get(`${API}/users/me`, {
        headers: { Authorization: `Bearer ${response.data.access_token}` }
      });
      
      setUser(userResponse.data);
      return true;
    } catch (error) {
      console.error("Login error:", error);
      return false;
    }
  };

  const register = async (userData) => {
    try {
      await axios.post(`${API}/register`, userData);
      return true;
    } catch (error) {
      console.error("Registration error:", error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Protected Route Component
function RequireAuth({ children }) {
  const auth = useAuth();
  const location = useLocation();

  if (auth.loading) {
    return <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>;
  }

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

// Navigation Component
function Header() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  
  const handleLogout = () => {
    auth.logout();
    navigate('/');
  };
  
  return (
    <header className="bg-primary text-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <Link to="/" className="text-2xl font-bold">ForexSignals</Link>
          
          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button onClick={() => setShowMenu(!showMenu)} className="text-white focus:outline-none">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {showMenu ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link to="/" className="hover:text-neutral-dark transition duration-200">Home</Link>
            <Link to="/signals" className="hover:text-neutral-dark transition duration-200">Signals</Link>
            
            {auth.isAuthenticated ? (
              <>
                <div className="relative group">
                  <button className="flex items-center space-x-1 hover:text-neutral-dark transition duration-200">
                    <span>{auth.user?.username}</span>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 hidden group-hover:block">
                    <Link to="/profile" className="block px-4 py-2 text-gray-800 hover:bg-primary hover:text-white">Profile</Link>
                    <Link to="/notifications" className="block px-4 py-2 text-gray-800 hover:bg-primary hover:text-white">Notifications</Link>
                    <button onClick={handleLogout} className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-primary hover:text-white">Logout</button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="hover:text-neutral-dark transition duration-200">Login</Link>
                <Link to="/register" className="bg-secondary hover:bg-secondary-dark text-white px-4 py-2 rounded transition duration-200">Register</Link>
              </>
            )}
          </nav>
        </div>
        
        {/* Mobile Navigation */}
        {showMenu && (
          <div className="md:hidden bg-primary-dark py-2">
            <div className="flex flex-col space-y-2">
              <Link to="/" className="py-2 hover:bg-primary-light px-4 rounded">Home</Link>
              <Link to="/signals" className="py-2 hover:bg-primary-light px-4 rounded">Signals</Link>
              
              {auth.isAuthenticated ? (
                <>
                  <Link to="/profile" className="py-2 hover:bg-primary-light px-4 rounded">Profile</Link>
                  <Link to="/notifications" className="py-2 hover:bg-primary-light px-4 rounded">Notifications</Link>
                  <button onClick={handleLogout} className="text-left py-2 hover:bg-primary-light px-4 rounded">Logout</button>
                </>
              ) : (
                <>
                  <Link to="/login" className="py-2 hover:bg-primary-light px-4 rounded">Login</Link>
                  <Link to="/register" className="py-2 bg-secondary hover:bg-secondary-dark px-4 rounded">Register</Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

// Footer Component
function Footer() {
  return (
    <footer className="bg-primary-dark text-white mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <h3 className="text-xl font-bold">ForexSignals</h3>
            <p className="text-sm mt-1">Premium trading signals for forex traders</p>
          </div>
          
          <div className="flex space-x-4">
            <a href="#" className="hover:text-secondary transition duration-200">
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
              </svg>
            </a>
            <a href="#" className="hover:text-secondary transition duration-200">
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/>
              </svg>
            </a>
            <a href="#" className="hover:text-secondary transition duration-200">
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>
          </div>
        </div>
        
        <div className="mt-4 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} ForexSignals. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

// Home Page
function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="bg-primary text-white py-16">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center">
              <div className="md:w-1/2 mb-8 md:mb-0">
                <h1 className="text-4xl md:text-5xl font-bold mb-4">Expert Forex Signals at Your Fingertips</h1>
                <p className="text-xl mb-6">Get accurate, timely trading signals to maximize your forex trading profits</p>
                <div className="flex space-x-4">
                  <Link to="/register" className="bg-secondary hover:bg-secondary-dark text-white px-6 py-3 rounded-lg font-bold transition duration-200">Get Started</Link>
                  <Link to="/signals" className="bg-transparent border-2 border-white hover:bg-white hover:text-primary px-6 py-3 rounded-lg font-bold transition duration-200">View Signals</Link>
                </div>
              </div>
              <div className="md:w-1/2 flex justify-center">
                <img src="https://i.imgur.com/RVmGiY0.png" alt="Forex Trading Charts" className="max-w-full rounded-lg shadow-lg" />
              </div>
            </div>
          </div>
        </section>
        
        {/* Features Section */}
        <section className="py-16 bg-neutral">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Why Choose Our Forex Signals</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition duration-300">
                <div className="bg-primary-light rounded-full w-16 h-16 flex items-center justify-center mb-4 mx-auto">
                  <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-center mb-2">High Accuracy</h3>
                <p className="text-gray-600 text-center">Our signals have a proven track record of accuracy and profitability in the forex market.</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition duration-300">
                <div className="bg-primary-light rounded-full w-16 h-16 flex items-center justify-center mb-4 mx-auto">
                  <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-center mb-2">Real-Time Alerts</h3>
                <p className="text-gray-600 text-center">Get instant notifications when new trading opportunities arise so you never miss a profitable trade.</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition duration-300">
                <div className="bg-primary-light rounded-full w-16 h-16 flex items-center justify-center mb-4 mx-auto">
                  <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-center mb-2">Complete Details</h3>
                <p className="text-gray-600 text-center">Every signal includes entry price, take profit, and stop loss levels for complete trade management.</p>
              </div>
            </div>
          </div>
        </section>
        
        {/* Pricing Section */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Choose Your Subscription Plan</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="border rounded-lg overflow-hidden hover:shadow-xl transition duration-300">
                <div className="bg-neutral p-6">
                  <h3 className="text-2xl font-bold text-center">Free</h3>
                  <p className="text-4xl font-bold text-center my-4">$0<span className="text-lg font-normal">/month</span></p>
                </div>
                <div className="p-6">
                  <ul className="space-y-3">
                    <li className="flex items-center">
                      <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Basic forex signals</span>
                    </li>
                    <li className="flex items-center">
                      <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>1 major currency pair</span>
                    </li>
                    <li className="flex items-center text-gray-400">
                      <svg className="h-5 w-5 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span>No real-time alerts</span>
                    </li>
                  </ul>
                  <Link to="/register" className="block text-center bg-primary hover:bg-primary-dark text-white mt-6 py-2 rounded transition duration-200">Sign Up</Link>
                </div>
              </div>
              
              <div className="border rounded-lg overflow-hidden shadow-xl border-primary">
                <div className="bg-primary text-white p-6 relative">
                  <div className="absolute top-0 right-0 bg-secondary text-white text-xs font-bold px-3 py-1 transform translate-x-2 -translate-y-2">POPULAR</div>
                  <h3 className="text-2xl font-bold text-center">Basic</h3>
                  <p className="text-4xl font-bold text-center my-4">$29<span className="text-lg font-normal">/month</span></p>
                </div>
                <div className="p-6">
                  <ul className="space-y-3">
                    <li className="flex items-center">
                      <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Premium forex signals</span>
                    </li>
                    <li className="flex items-center">
                      <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>5 currency pairs</span>
                    </li>
                    <li className="flex items-center">
                      <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Real-time alerts</span>
                    </li>
                  </ul>
                  <Link to="/register" className="block text-center bg-secondary hover:bg-secondary-dark text-white mt-6 py-2 rounded transition duration-200">Sign Up</Link>
                </div>
              </div>
              
              <div className="border rounded-lg overflow-hidden hover:shadow-xl transition duration-300">
                <div className="bg-neutral p-6">
                  <h3 className="text-2xl font-bold text-center">Premium</h3>
                  <p className="text-4xl font-bold text-center my-4">$79<span className="text-lg font-normal">/month</span></p>
                </div>
                <div className="p-6">
                  <ul className="space-y-3">
                    <li className="flex items-center">
                      <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>All forex signals</span>
                    </li>
                    <li className="flex items-center">
                      <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>All currency pairs</span>
                    </li>
                    <li className="flex items-center">
                      <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Priority alerts</span>
                    </li>
                  </ul>
                  <Link to="/register" className="block text-center bg-primary hover:bg-primary-dark text-white mt-6 py-2 rounded transition duration-200">Sign Up</Link>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Testimonials */}
        <section className="py-16 bg-neutral">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">What Our Traders Say</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center mb-4">
                  <div className="bg-primary-light rounded-full w-12 h-12 flex items-center justify-center mr-4">
                    <span className="text-white font-bold">JD</span>
                  </div>
                  <div>
                    <h4 className="font-bold">John Doe</h4>
                    <p className="text-sm text-gray-600">Forex Trader</p>
                  </div>
                </div>
                <p className="text-gray-600">"These signals have completely transformed my trading. I've seen consistent profits since I subscribed to the premium plan."</p>
                <div className="flex mt-4">
                  <svg className="h-5 w-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                  </svg>
                  <svg className="h-5 w-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                  </svg>
                  <svg className="h-5 w-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                  </svg>
                  <svg className="h-5 w-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                  </svg>
                  <svg className="h-5 w-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                  </svg>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center mb-4">
                  <div className="bg-primary-light rounded-full w-12 h-12 flex items-center justify-center mr-4">
                    <span className="text-white font-bold">JS</span>
                  </div>
                  <div>
                    <h4 className="font-bold">Jane Smith</h4>
                    <p className="text-sm text-gray-600">Day Trader</p>
                  </div>
                </div>
                <p className="text-gray-600">"The real-time alerts are a game-changer. I'm able to enter trades at the perfect moment and maximize my profits."</p>
                <div className="flex mt-4">
                  <svg className="h-5 w-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                  </svg>
                  <svg className="h-5 w-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                  </svg>
                  <svg className="h-5 w-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                  </svg>
                  <svg className="h-5 w-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                  </svg>
                  <svg className="h-5 w-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                  </svg>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center mb-4">
                  <div className="bg-primary-light rounded-full w-12 h-12 flex items-center justify-center mr-4">
                    <span className="text-white font-bold">RJ</span>
                  </div>
                  <div>
                    <h4 className="font-bold">Robert Johnson</h4>
                    <p className="text-sm text-gray-600">Swing Trader</p>
                  </div>
                </div>
                <p className="text-gray-600">"Having precise entry, take profit, and stop loss levels has greatly improved my risk management. Worth every penny!"</p>
                <div className="flex mt-4">
                  <svg className="h-5 w-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                  </svg>
                  <svg className="h-5 w-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                  </svg>
                  <svg className="h-5 w-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                  </svg>
                  <svg className="h-5 w-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                  </svg>
                  <svg className="h-5 w-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* CTA Section */}
        <section className="py-16 bg-primary text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-6">Ready to Transform Your Forex Trading?</h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto">Join thousands of successful traders who rely on our signals to make profitable trades every day.</p>
            <Link to="/register" className="bg-secondary hover:bg-secondary-dark text-white px-8 py-3 rounded-lg font-bold text-lg transition duration-200 inline-block">Get Started Now</Link>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}

// Login Page
function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const from = location.state?.from?.pathname || "/signals";
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
      const success = await auth.login(email, password);
      if (success) {
        navigate(from, { replace: true });
      } else {
        setError("Failed to login. Please check your credentials.");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  if (auth.isAuthenticated) {
    return <Navigate to="/signals" />;
  }
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-grow flex items-center justify-center py-12 px-4 bg-neutral">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-3xl font-bold text-center mb-6">Login to Your Account</h2>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-primary"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-primary"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <input id="remember" type="checkbox" className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded" />
                <label htmlFor="remember" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>
              <a href="#" className="text-sm text-primary hover:text-primary-dark">
                Forgot password?
              </a>
            </div>
            
            <button
              type="submit"
              className={`w-full bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Logging in...
                </span>
              ) : 'Sign In'}
            </button>
          </form>
          
          <div className="text-center mt-6">
            <p className="text-sm text-gray-600">
              Don't have an account? <Link to="/register" className="text-primary hover:text-primary-dark">Register now</Link>
            </p>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}

// Register Page
function Register() {
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
    fullName: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const auth = useAuth();
  const navigate = useNavigate();
  
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    setLoading(true);
    
    try {
      const success = await auth.register({
        email: formData.email,
        username: formData.username,
        password: formData.password,
        full_name: formData.fullName
      });
      
      if (success) {
        // Login after successful registration
        const loginSuccess = await auth.login(formData.email, formData.password);
        if (loginSuccess) {
          navigate("/signals");
        } else {
          navigate("/login");
        }
      } else {
        setError("Failed to register. Please try again.");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  if (auth.isAuthenticated) {
    return <Navigate to="/signals" />;
  }
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-grow flex items-center justify-center py-12 px-4 bg-neutral">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-3xl font-bold text-center mb-6">Create an Account</h2>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-primary"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-primary"
                value={formData.username}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="fullName">
                Full Name (Optional)
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-primary"
                value={formData.fullName}
                onChange={handleChange}
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-primary"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
              />
              <p className="text-xs text-gray-500 mt-1">Must be at least 6 characters</p>
            </div>
            
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="confirmPassword">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-primary"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>
            
            <button
              type="submit"
              className={`w-full bg-secondary hover:bg-secondary-dark text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating account...
                </span>
              ) : 'Register'}
            </button>
          </form>
          
          <div className="text-center mt-6">
            <p className="text-sm text-gray-600">
              Already have an account? <Link to="/login" className="text-primary hover:text-primary-dark">Sign in</Link>
            </p>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}

// Signals Page
function Signals() {
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const auth = useAuth();
  
  useEffect(() => {
    const fetchSignals = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const response = await axios.get(`${API}/signals`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setSignals(response.data);
      } catch (err) {
        console.error("Error fetching signals:", err);
        setError("Failed to load signals. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchSignals();
  }, []);
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-grow py-8 px-4 bg-neutral">
        <div className="container mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h1 className="text-3xl font-bold mb-2">Trading Signals</h1>
            <p className="text-gray-600">Access your {auth.user?.tier} tier forex trading signals</p>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          ) : signals.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <svg className="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 14h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-xl font-medium text-gray-900 mb-2">No signals available</h3>
              <p className="text-gray-600">
                There are currently no trading signals available for your subscription tier.
                Check back soon or upgrade your subscription for more signals.
              </p>
              <div className="mt-6">
                <Link to="/" className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded">
                  Upgrade Subscription
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {signals.map((signal) => (
                <div key={signal.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="bg-primary text-white p-4">
                    <h3 className="text-xl font-bold">{signal.currency_pair}</h3>
                    <p className="text-sm">
                      {new Date(signal.created_at).toLocaleDateString()} - {new Date(signal.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                  
                  <div className="p-4">
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center">
                        <p className="text-gray-500 text-sm">Entry</p>
                        <p className="font-bold text-lg">{signal.entry_price}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-500 text-sm">Take Profit</p>
                        <p className="font-bold text-lg text-green-600">{signal.take_profit}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-500 text-sm">Stop Loss</p>
                        <p className="font-bold text-lg text-red-600">{signal.stop_loss}</p>
                      </div>
                    </div>
                    
                    {signal.notes && (
                      <div className="border-t pt-3">
                        <p className="text-sm text-gray-600">{signal.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}

// User Profile Page
function Profile() {
  const auth = useAuth();
  const [formData, setFormData] = useState({
    fullName: "",
    profilePicture: "",
    emailNotifications: true,
    appNotifications: true
  });
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (auth.user) {
      setFormData({
        fullName: auth.user.full_name || "",
        profilePicture: auth.user.profile_picture || "",
        emailNotifications: auth.user.notification_preferences?.email ?? true,
        appNotifications: auth.user.notification_preferences?.app ?? true
      });
    }
  }, [auth.user]);
  
  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess(false);
    setError("");
    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const updateData = {
        full_name: formData.fullName,
        profile_picture: formData.profilePicture,
        notification_preferences: {
          email: formData.emailNotifications,
          app: formData.appNotifications
        }
      };
      
      await axios.put(`${API}/users/me`, updateData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccess(true);
      
      // Refresh user data
      const userResponse = await axios.get(`${API}/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update the auth context with the new user data
      auth.user = userResponse.data;
      
    } catch (err) {
      console.error("Error updating profile:", err);
      setError("Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-grow py-8 px-4 bg-neutral">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-primary text-white p-6">
              <h1 className="text-2xl font-bold">Your Profile</h1>
            </div>
            
            <div className="p-6">
              {success && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                  Profile updated successfully!
                </div>
              )}
              
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                  {error}
                </div>
              )}
              
              <div className="flex flex-col md:flex-row">
                <div className="md:w-1/3 mb-6 md:mb-0">
                  <div className="flex flex-col items-center">
                    <div className="bg-primary-light rounded-full w-24 h-24 flex items-center justify-center text-white text-2xl font-bold mb-4">
                      {auth.user?.username?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <p className="text-lg font-bold">{auth.user?.username}</p>
                    <p className="text-gray-600">{auth.user?.email}</p>
                    <div className="mt-4 inline-block bg-primary-light text-white text-sm py-1 px-3 rounded-full uppercase">
                      {auth.user?.tier} Plan
                    </div>
                    {auth.user?.is_admin && (
                      <div className="mt-2 inline-block bg-secondary text-white text-sm py-1 px-3 rounded-full uppercase">
                        Admin
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="md:w-2/3 md:pl-8 border-t md:border-t-0 md:border-l border-gray-200 pt-6 md:pt-0 md:pl-8">
                  <h2 className="text-xl font-bold mb-4">Edit Profile</h2>
                  
                  <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                      <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="fullName">
                        Full Name
                      </label>
                      <input
                        id="fullName"
                        name="fullName"
                        type="text"
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-primary"
                        value={formData.fullName}
                        onChange={handleChange}
                      />
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="profilePicture">
                        Profile Picture URL
                      </label>
                      <input
                        id="profilePicture"
                        name="profilePicture"
                        type="text"
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-primary"
                        value={formData.profilePicture}
                        onChange={handleChange}
                      />
                    </div>
                    
                    <div className="mb-6">
                      <h3 className="text-md font-bold mb-2">Notification Preferences</h3>
                      
                      <div className="flex items-center mb-2">
                        <input
                          id="emailNotifications"
                          name="emailNotifications"
                          type="checkbox"
                          className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                          checked={formData.emailNotifications}
                          onChange={handleChange}
                        />
                        <label htmlFor="emailNotifications" className="ml-2 block text-sm text-gray-700">
                          Email Notifications
                        </label>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          id="appNotifications"
                          name="appNotifications"
                          type="checkbox"
                          className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                          checked={formData.appNotifications}
                          onChange={handleChange}
                        />
                        <label htmlFor="appNotifications" className="ml-2 block text-sm text-gray-700">
                          App Notifications
                        </label>
                      </div>
                    </div>
                    
                    <button
                      type="submit"
                      className={`bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                      disabled={loading}
                    >
                      {loading ? 'Updating...' : 'Save Changes'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}

// Notifications Page
function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const response = await axios.get(`${API}/notifications`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setNotifications(response.data);
      } catch (err) {
        console.error("Error fetching notifications:", err);
        setError("Failed to load notifications. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchNotifications();
  }, []);
  
  const markAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      await axios.put(`${API}/notifications/${notificationId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update local state
      setNotifications(notifications.map(notification => 
        notification.id === notificationId 
          ? {...notification, read: true} 
          : notification
      ));
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-grow py-8 px-4 bg-neutral">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-primary text-white p-6">
              <h1 className="text-2xl font-bold">Your Notifications</h1>
            </div>
            
            <div className="p-6">
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : error ? (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications yet</h3>
                  <p className="text-gray-600">
                    You don't have any notifications at the moment.
                    Check back later for updates on new signals.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {notifications.map((notification) => (
                    <div 
                      key={notification.id} 
                      className={`border rounded-lg p-4 ${notification.read ? 'bg-gray-50' : 'bg-blue-50 border-blue-200'}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className={`font-bold ${notification.read ? 'text-gray-700' : 'text-primary'}`}>
                            {notification.title}
                          </h3>
                          <p className="text-gray-600 mt-1">{notification.message}</p>
                          <p className="text-gray-400 text-sm mt-2">
                            {new Date(notification.created_at).toLocaleDateString()} - {new Date(notification.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                        
                        {!notification.read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs py-1 px-2 rounded"
                          >
                            Mark as read
                          </button>
                        )}
                      </div>
                      
                      {notification.related_to && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <Link 
                            to={`/signals/${notification.related_to}`} 
                            className="text-primary hover:text-primary-dark text-sm font-medium flex items-center"
                          >
                            View Signal
                            <svg className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </Link>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}

// Admin Signal Management Page
function AdminSignals() {
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    currency_pair: "EUR/USD",
    entry_price: "",
    take_profit: "",
    stop_loss: "",
    notes: "",
    tier_required: "free"
  });
  const auth = useAuth();
  
  useEffect(() => {
    const fetchSignals = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const response = await axios.get(`${API}/signals`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setSignals(response.data);
      } catch (err) {
        console.error("Error fetching signals:", err);
        setError("Failed to load signals. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchSignals();
  }, []);
  
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const response = await axios.post(`${API}/signals`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Add the new signal to the list
      setSignals([response.data, ...signals]);
      
      // Reset form
      setFormData({
        currency_pair: "EUR/USD",
        entry_price: "",
        take_profit: "",
        stop_loss: "",
        notes: "",
        tier_required: "free"
      });
      
    } catch (err) {
      console.error("Error creating signal:", err);
      setError("Failed to create signal. Please try again.");
    }
  };
  
  const deleteSignal = async (signalId) => {
    if (!window.confirm("Are you sure you want to delete this signal?")) return;
    
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      await axios.delete(`${API}/signals/${signalId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Remove the deleted signal from the list
      setSignals(signals.filter(signal => signal.id !== signalId));
      
    } catch (err) {
      console.error("Error deleting signal:", err);
      setError("Failed to delete signal. Please try again.");
    }
  };
  
  if (!auth.user?.is_admin) {
    return <Navigate to="/signals" />;
  }
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-grow py-8 px-4 bg-neutral">
        <div className="container mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h1 className="text-2xl font-bold mb-2">Signal Management</h1>
            <p className="text-gray-600">Create and manage forex trading signals</p>
          </div>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold mb-4">Create New Signal</h2>
                
                <form onSubmit={handleSubmit}>
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="currency_pair">
                      Currency Pair
                    </label>
                    <select
                      id="currency_pair"
                      name="currency_pair"
                      className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-primary"
                      value={formData.currency_pair}
                      onChange={handleChange}
                      required
                    >
                      <option value="EUR/USD">EUR/USD</option>
                      <option value="GBP/USD">GBP/USD</option>
                      <option value="USD/JPY">USD/JPY</option>
                      <option value="AUD/USD">AUD/USD</option>
                      <option value="USD/CAD">USD/CAD</option>
                      <option value="NZD/USD">NZD/USD</option>
                      <option value="EUR/GBP">EUR/GBP</option>
                      <option value="EUR/JPY">EUR/JPY</option>
                      <option value="GBP/JPY">GBP/JPY</option>
                      <option value="USD/CHF">USD/CHF</option>
                    </select>
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="entry_price">
                      Entry Price
                    </label>
                    <input
                      id="entry_price"
                      name="entry_price"
                      type="number"
                      step="0.00001"
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-primary"
                      value={formData.entry_price}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="take_profit">
                      Take Profit
                    </label>
                    <input
                      id="take_profit"
                      name="take_profit"
                      type="number"
                      step="0.00001"
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-primary"
                      value={formData.take_profit}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="stop_loss">
                      Stop Loss
                    </label>
                    <input
                      id="stop_loss"
                      name="stop_loss"
                      type="number"
                      step="0.00001"
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-primary"
                      value={formData.stop_loss}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="notes">
                      Notes (Optional)
                    </label>
                    <textarea
                      id="notes"
                      name="notes"
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-primary"
                      value={formData.notes}
                      onChange={handleChange}
                      rows={3}
                    ></textarea>
                  </div>
                  
                  <div className="mb-6">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="tier_required">
                      Required Subscription Tier
                    </label>
                    <select
                      id="tier_required"
                      name="tier_required"
                      className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-primary"
                      value={formData.tier_required}
                      onChange={handleChange}
                      required
                    >
                      <option value="free">Free</option>
                      <option value="basic">Basic</option>
                      <option value="premium">Premium</option>
                    </select>
                  </div>
                  
                  <button
                    type="submit"
                    className="w-full bg-secondary hover:bg-secondary-dark text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                  >
                    Create Signal
                  </button>
                </form>
              </div>
            </div>
            
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold mb-4">Existing Signals</h2>
                
                {loading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : signals.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600">No signals created yet. Create your first signal using the form.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Currency Pair
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Entry Price
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            TP/SL
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tier
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {signals.map((signal) => (
                          <tr key={signal.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {signal.currency_pair}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {signal.entry_price}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <span className="text-green-600">{signal.take_profit}</span> / <span className="text-red-600">{signal.stop_loss}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                signal.tier_required === 'premium' 
                                  ? 'bg-purple-100 text-purple-800' 
                                  : signal.tier_required === 'basic'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {signal.tier_required}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(signal.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => deleteSignal(signal.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/signals" element={
            <RequireAuth>
              <Signals />
            </RequireAuth>
          } />
          <Route path="/profile" element={
            <RequireAuth>
              <Profile />
            </RequireAuth>
          } />
          <Route path="/notifications" element={
            <RequireAuth>
              <Notifications />
            </RequireAuth>
          } />
          <Route path="/admin/signals" element={
            <RequireAuth>
              <AdminSignals />
            </RequireAuth>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
