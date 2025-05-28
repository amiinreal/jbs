import React, { useState, useEffect } from 'react'; // Keep useEffect for non-auth tasks if any
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'; // Ensure Router is imported if not already
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
import { AuthProvider, useAuth } from './contexts/AuthContext'; // Import AuthProvider and useAuth

// Helper function for ProtectedRoute, now defined inside App or imported
// If it uses useAuth, it cannot be defined at the top level of App.jsx before App component itself.
// So, we'll define it inside App or make it a separate component that uses useAuth.


function App() {
  // Remove old auth state and logic
  // const navigate = useNavigate(); // useNavigate can be used by components directly via useAuth if needed for logout
  const [jobs, setJobs] = useState([]);
  const [houses, setHouses] = useState([]);
  const [cars, setCars] = useState([]);
  const [items, setItems] = useState([]);
  // All these states are now managed by AuthContext:
  // const [isAuthenticated, setIsAuthenticated] = useState(false);
  // const [userRole, setUserRole] = useState('user');
  // const [isCompany, setIsCompany] = useState(false);
  // const [isVerifiedCompany, setIsVerifiedCompany] = useState(false);
  // const [user, setUser] = useState(null);
  // const [userId, setUserId] = useState(null);
  // const [username, setUsername] = useState('');
  // const [userEmail, setUserEmail] = useState('');
  // const [authLoading, setAuthLoading] = useState(true);
  // const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Remove old auth useEffects
  // useEffect for initialLoadComplete can be removed or adapted if still needed for other purposes
  // useEffect for checkAuth is removed
  
  // The useEffect for fetching listings should now depend on the loading state from AuthContext
  // or be triggered in a way that doesn't rely on App.jsx's local authLoading.
  // For simplicity, we'll assume components fetch their own data or this is handled elsewhere.
  // If listings are global and depend on auth status, this needs careful placement.
  // For now, removing the listing fetch from App.jsx to simplify.
  // Components can fetch data they need, using useAuth if auth is a prerequisite.

  // ProtectedRoute component - now uses useAuth
  const ProtectedRoute = ({ children, requiredRole = null, requiredCompany = false, requiredVerifiedCompany = false }) => {
    const { isAuthenticated, currentUser, loading, isCompany, isVerifiedCompany, isAdmin } = useAuth();
    // const location = useLocation(); // To preserve redirect state

    if (loading) {
      return <LoadingOverlay isLoading={true} text="Checking authentication..." />;
    }
    
    if (!isAuthenticated) {
      const currentPath = window.location.pathname + window.location.search;
      sessionStorage.setItem('redirectAfterLogin', currentPath);
      return <Navigate to="/login" state={{ from: currentPath }} replace />;
    }
    
    if (requiredRole && currentUser?.role !== requiredRole) {
      return <Navigate to="/dashboard" replace />; // Or an unauthorized page
    }

    if (requiredCompany && !isCompany) {
      return <Navigate to="/dashboard" replace />; // Or company registration page
    }
    
    if (requiredVerifiedCompany && !isVerifiedCompany) {
       return <Navigate to="/dashboard" replace />; // Or verification status page
    }
    
    return children;
  };
  
  // Main App Wrapper - This component will be rendered by AuthProvider
  const AppContent = () => {
    const { isAuthenticated, currentUser, loading, isCompany, isVerifiedCompany, isAdmin } = useAuth();
    // This component can now access auth context if needed, e.g. for passing to Navigation or Routes
    // Or Navigation and Routes can use useAuth() themselves.

    if (loading) {
      // This is the initial loading screen from AuthContext
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
        {/* Navigation will now use useAuth directly */}
        <Navigation /> 
        
        <Routes>
          {/* Pass isAuthenticated from useAuth to public routes that have different UI based on it */}
          <Route path="/" element={<LandingPage isAuthenticated={isAuthenticated} />} />
          
          <Route 
            path="/login" 
            // LoginRegister will use useAuth to call login function
            element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginRegister />} 
          />
          
          <Route 
            path="/register" 
            element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginRegister initialTab="register" />} 
          />
          
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                {/* Dashboard can use useAuth to get userRole, isCompany, etc. */}
                <Dashboard /> 
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/messages" 
            element={
              <ProtectedRoute>
                {/* Messages can use useAuth to get currentUser */}
                <Messages /> 
              </ProtectedRoute>
            } 
          />
          
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          
          <Route 
            path="/new-ad" 
            element={
              <ProtectedRoute requiredCompany={true} requiredVerifiedCompany={true}>
                {/* CreateAd can use useAuth */}
                <CreateAd />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/post-job" 
            element={
              <ProtectedRoute requiredCompany={true} requiredVerifiedCompany={true}>
                <JobListingForm />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/post-job/:jobId" 
            element={
              <ProtectedRoute requiredCompany={true} requiredVerifiedCompany={true}>
                <JobListingForm />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/my-listings" 
            element={
              <ProtectedRoute>
                {/* UserListings can use useAuth to get currentUser.id */}
                <UserListings /> 
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/manage-jobs" 
            element={
              <ProtectedRoute requiredCompany={true}>
                <ManageJobPostings />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/company-profile" 
            element={
              <ProtectedRoute requiredCompany={true}>
                <CompanyProfile />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/company-registration" 
            element={
              <ProtectedRoute> 
                {/* Logic within CompanyRegistration or here to redirect if already company */}
                {isCompany ? <Navigate to="/company-profile" /> : <CompanyRegistration />}
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/verification-status" 
            element={
              <ProtectedRoute requiredCompany={true}>
                <VerificationStatus />
              </ProtectedRoute>
            } 
          />
          
          <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute requiredRole="admin"><UserManagement /></ProtectedRoute>} />
          <Route path="/admin/online-users" element={<ProtectedRoute requiredRole="admin"><OnlineUsers /></ProtectedRoute>} />
          <Route path="/admin/verifications" element={<ProtectedRoute requiredRole="admin"><VerificationRequests /></ProtectedRoute>} />
          <Route path="/admin/listings" element={<ProtectedRoute requiredRole="admin"><ListingManagement /></ProtectedRoute>} />
          
          {/* Public routes: pass isAuthenticated for UI changes if needed */}
          <Route path="/jobs" element={<JobListings isAuthenticated={isAuthenticated} />} />
          <Route path="/jobs/:jobId" element={<JobDetail isAuthenticated={isAuthenticated} />} /> 
          <Route 
            path="/jobs/:jobId/applicants" 
            element={
              <ProtectedRoute requiredCompany={true}>
                <ViewJobApplicants />
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
      </ErrorBoundary>
    );
  }

  return (
    // Router should be the outermost component if App is the root for routing
    // Or, if main.jsx has Router, then App doesn't need it. Assuming App is root for routing here.
    <Router> 
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
