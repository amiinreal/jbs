/**
 * Utility to update user's last active timestamp
 */

const updateUserActivity = async () => {
  // Only update for authenticated users
  if (!localStorage.getItem('isAuthenticated')) return;
  
  try {
    await fetch('/api/users/activity', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    // We don't need to do anything with the response
  } catch (error) {
    // Silent fail - we don't want to disrupt the user experience
    console.debug('Failed to update user activity');
  }
};

// Update activity when the page loads and every 5 minutes
const initActivityTracker = () => {
  // Update immediately
  updateUserActivity();
  
  // Then set up interval
  setInterval(updateUserActivity, 5 * 60 * 1000);
  
  // Also update when tab becomes visible again
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      updateUserActivity();
    }
  });
};

export { updateUserActivity, initActivityTracker };
