import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import './App.css';
import './styles/globalStyles.css';
import ErrorBoundary from './components/ErrorBoundary';
import Notifications from './components/Notifications';
import Messages from './components/Messages';
import JobListings from './components/JobListings';
import JobDetail from './components/JobDetail'; // Add this import
import HouseListings from './components/HouseListings';
import CarListings from './components/CarListings';
import ItemListings from './components/ItemListings';
import LandingPage from './components/LandingPage';
import LoginRegister from './components/LoginRegister';
import CreateAd from './components/CreateAd';
import Dashboard from './components/Dashboard';
import CompanyRegistration from './components/CompanyRegistration';
import Navigation from './components/Navigation';
import UserListings from './components/UserListings';
import VerificationStatus from './components/VerificationStatus';
import LoadingOverlay from './components/common/LoadingOverlay';
import JobListingForm from './components/JobListingForm'; // Added for job form
import ManageJobPostings from './components/ManageJobPostings'; // Added for managing jobs
import ViewJobApplicants from './components/ViewJobApplicants'; // Added for viewing applicants

// Import admin components
import AdminDashboard from './components/admin/AdminDashboard';
import UserManagement from './components/admin/UserManagement';
import VerificationRequests from './components/admin/VerificationRequests';
import ListingManagement from './components/admin/ListingManagement';
import OnlineUsers from './components/admin/OnlineUsers';
import CompanyProfile from './components/CompanyProfile';

// Import auth and loading helpers
import { checkAuthStatus, getAuthUserFromStorage } from './utils/authUtils';
import { createAuthLoadingController } from './utils/loadingUtils';

function App() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [houses, setHouses] = useState([]);
  const [cars, setCars] = useState([]);
  const [items, setItems] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState('user');
  const [isCompany, setIsCompany] = useState(false);
  const [isVerifiedCompany, setIsVerifiedCompany] = useState(false);
  const [user, setUser] = useState(null);
  const [userId, setUserId] = useState(null);
  const [username, setUsername] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Create auth loading controller
  const authLoadingController = createAuthLoadingController(
    setAuthLoading,
    setIsAuthenticated,
    setUser
  );

  // Quick initial load from localStorage to prevent flashing
  useEffect(() => {
    const storedUser = getAuthUserFromStorage();
    if (storedUser) {
      setIsAuthenticated(true);
      setUser(storedUser);
      setUserRole(storedUser.role || 'user');
      setIsCompany(storedUser.isCompany || false);
      setIsVerifiedCompany(storedUser.isVerifiedCompany || false);
      setUserId(storedUser.id);
      setUsername(storedUser.username || '');
      setUserEmail(storedUser.email || '');
    }
    setInitialLoadComplete(true);
  }, []);

  // UseEffect for authentication check
  useEffect(() => {
    // Skip if initial load is not complete
    if (!initialLoadComplete) return;
    
    // Check authentication status
    const checkAuth = async () => {
      try {
        // Start authentication loading with proper timeout handling
        authLoadingController.startAuthLoading(8000);
        console.log("Checking authentication against server...");
        
        const authResult = await checkAuthStatus();
        
        if (authResult.success && authResult.isAuthenticated && authResult.user) {
          const userData = authResult.user;
          
          // Update all auth state
          setUserRole(userData.role || 'user');
          setIsCompany(userData.isCompany || false);
          setIsVerifiedCompany(userData.isVerifiedCompany || false);
          setUserId(userData.id);
          setUsername(userData.username || '');
          setUserEmail(userData.email || '');
          
          // Stop loading and set authenticated state with user data
          authLoadingController.stopAuthLoading(true, userData);
        } else {
          console.log('Not authenticated:', authResult);
          authLoadingController.stopAuthLoading(false, null);
        }
      } catch (error) {
        console.error('Error in auth check:', error);
        authLoadingController.stopAuthLoading(false, null);
      }
    };

    checkAuth();
  }, [initialLoadComplete]);

  // Add a separate effect to fetch listings after authentication is confirmed
  useEffect(() => {
    // Only fetch listings if authentication check is complete
    if (!authLoading) {
      const fetchListings = async () => {
        try {
          console.log("Fetching listings...");
          
          // Helper function to fetch data with error handling
          const fetchData = async (url) => {
            try {
              console.log(`Fetching from: ${url}`);
              const response = await fetch(url, {
                credentials: 'include'
              });
              
              if (!response.ok) {
                console.warn(`Failed to fetch ${url}, status: ${response.status}`);
                return { data: [] };
              }
              
              return await response.json();
            } catch (error) {
              console.error(`Error fetching ${url}:`, error);
              return { data: [] };
            }
          };

          // Fetch all data in parallel - use the public endpoints
          const [jobsData, housesData, carsData, itemsData] = await Promise.all([
            fetchData('/api/jobs'),
            fetchData('/api/houses/public'),
            fetchData('/api/cars/public'),
            fetchData('/api/items/public')
          ]);

          setJobs(jobsData.data || []);
          setHouses(housesData.data || []);
          setCars(carsData.data || []);
          setItems(itemsData.data || []);
          
          console.log("Listings fetched successfully");
        } catch (error) {
          console.error('Error fetching listings:', error);
        }
      };
      
      fetchListings();
    }
  }, [authLoading]);

  // Function to handle logout with improved error handling
  const handleLogout = async () => {
    try {
      setAuthLoading(true);
      
      // Clear local auth state
      localStorage.removeItem('auth_user');
      
      try {
        const response = await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          console.warn('Logout response not OK:', response.status);
        }
      } catch (error) {
        console.error('Fetch error during logout:', error);
      }
      
      // Always clear auth state regardless of server response
      setIsAuthenticated(false);
      setUser(null);
      setUserRole('user');
      setIsCompany(false);
      setIsVerifiedCompany(false);
      setUsername('');
      setUserEmail('');
      setUserId(null);
      
      // Redirect to home page
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setAuthLoading(false);
    }
  };

  // Protected route component
  const ProtectedRoute = ({ children, requiredRole = null }) => {
    if (authLoading) {
      return <LoadingOverlay isLoading={true} text="Checking authentication..." />;
    }
    
    if (!isAuthenticated) {
      // Save current path for redirect after login
      const currentPath = window.location.pathname;
      sessionStorage.setItem('redirectAfterLogin', currentPath);
      
      // Redirect to login with state to enable return after login
      return <Navigate to="/login" state={{ from: currentPath }} replace />;
    }
    
    // Check for role requirement if specified
    if (requiredRole && userRole !== requiredRole) {
      return <Navigate to="/dashboard" replace />;
    }
    
    return children;
  };

  // If initial load is not complete, show minimal loading screen
  if (!initialLoadComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="p-8 bg-white shadow-md rounded-lg text-center">
          <h1 className="text-2xl font-bold mb-4">Loading application...</h1>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <LoadingOverlay 
        isLoading={authLoading} 
        text="Authenticating..." 
        transparent={true}
      >
        <Navigation 
          user={user} 
          isAuthenticated={isAuthenticated} 
          setIsAuthenticated={setIsAuthenticated} 
          handleLogout={handleLogout}
          authLoading={authLoading}
        />
        
        <Routes>
          <Route path="/" element={<LandingPage isAuthenticated={isAuthenticated} />} />
          
          <Route 
            path="/login" 
            element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginRegister setIsAuthenticated={setIsAuthenticated} />} 
          />
          
          <Route 
            path="/register" 
            element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginRegister setIsAuthenticated={setIsAuthenticated} initialTab="register" />} 
          />
          
          {/* Protected routes using the ProtectedRoute component */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard userRole={userRole} isCompany={isCompany} isVerifiedCompany={isVerifiedCompany} />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/messages" 
            element={
              <ProtectedRoute>
                <Messages currentUser={user} />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/notifications" 
            element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/new-ad" 
            element={
              <ProtectedRoute>
                <CreateAd 
                  isCompany={isCompany} 
                  isVerifiedCompany={isVerifiedCompany} 
                  user={user} 
                />
              </ProtectedRoute>
            } 
          />

          {/* Route for creating a new job posting */}
          <Route 
            path="/post-job" 
            element={
              <ProtectedRoute>
                {isCompany && isVerifiedCompany ? <JobListingForm /> : <Navigate to="/dashboard" />}
              </ProtectedRoute>
            } 
          />

          {/* Route for editing an existing job posting */}
          <Route 
            path="/post-job/:jobId" 
            element={
              <ProtectedRoute>
                {isCompany && isVerifiedCompany ? <JobListingForm /> : <Navigate to="/dashboard" />}
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/my-listings" 
            element={
              <ProtectedRoute>
                <UserListings userId={user?.id} />
              </ProtectedRoute>
            } 
          />

          {/* Route for managing company's job postings */}
          <Route 
            path="/manage-jobs" 
            element={
              <ProtectedRoute>
                {isCompany ? <ManageJobPostings /> : <Navigate to="/dashboard" />}
              </ProtectedRoute>
            } 
          />
          
          {/* Company routes */}
          <Route 
            path="/company-profile" 
            element={
              <ProtectedRoute>
                {isCompany ? <CompanyProfile user={user} /> : <Navigate to="/company-registration" />}
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/company-registration" 
            element={
              <ProtectedRoute>
                {isCompany ? <Navigate to="/company-profile" /> : <CompanyRegistration user={user} />}
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/verification-status" 
            element={
              <ProtectedRoute>
                {isCompany ? <VerificationStatus user={user} /> : <Navigate to="/company-registration" />}
              </ProtectedRoute>
            } 
          />
          
          {/* Admin routes */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/admin/users" 
            element={
              <ProtectedRoute requiredRole="admin">
                <UserManagement />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/admin/online-users" 
            element={
              <ProtectedRoute requiredRole="admin">
                <OnlineUsers />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/admin/verifications" 
            element={
              <ProtectedRoute requiredRole="admin">
                <VerificationRequests />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/admin/listings" 
            element={
              <ProtectedRoute requiredRole="admin">
                <ListingManagement />
              </ProtectedRoute>
            } 
          />
          
          {/* Public routes */}
          <Route path="/jobs" element={<JobListings isAuthenticated={isAuthenticated} />} />
          <Route path="/jobs/:jobId" element={<JobDetail user={user} isAuthenticated={isAuthenticated} />} /> 
          {/* Route for viewing applicants for a specific job */}
          <Route 
            path="/jobs/:jobId/applicants" 
            element={
              <ProtectedRoute>
                {isCompany ? <ViewJobApplicants /> : <Navigate to="/dashboard" />}
              </ProtectedRoute>
            } 
          />
          <Route path="/houses" element={<HouseListings isAuthenticated={isAuthenticated} />} />
          <Route path="/cars" element={<CarListings isAuthenticated={isAuthenticated} />} />
          <Route path="/items" element={<ItemListings isAuthenticated={isAuthenticated} />} />
        </Routes>

        <footer className="footer py-4">
          <div className="container">
            <div className="text-center">
              <p>&copy; {new Date().getFullYear()} Jobs & Beyond Services. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </LoadingOverlay>
    </ErrorBoundary>
  );
}

export default App;
