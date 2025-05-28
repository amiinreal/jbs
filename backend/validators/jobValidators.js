/**
 * Validation functions for job listings
 */

export const validateJobListing = (jobData) => {
  // Required fields
  const requiredFields = ['title', 'description', 'location', 'type', 'experience_required', 'salary'];
  
  for (const field of requiredFields) {
    if (!jobData[field]) {
      return { 
        error: { message: `${field.charAt(0).toUpperCase() + field.slice(1).replace('_', ' ')} is required` }
      };
    }
  }
  
  // Specific validations
  if (jobData.title.length < 5 || jobData.title.length > 100) {
    return { error: { message: 'Title must be between 5 and 100 characters' } };
  }
  
  if (jobData.description.length < 50) {
    return { error: { message: 'Description must be at least 50 characters long' } };
  }
  
  // Allowed job types
  const validTypes = ['full-time', 'part-time', 'contract', 'freelance', 'internship', 'temporary'];
  if (jobData.type && !validTypes.includes(jobData.type.toLowerCase())) {
    return { error: { message: 'Invalid job type' } };
  }
  
  // Passed all validations
  return { error: null };
};
