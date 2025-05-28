/**
 * Custom CORS middleware for public system endpoints
 */

export const publicEndpointCors = (req, res, next) => {
  // In development, be more permissive with CORS
  const isDev = process.env.NODE_ENV === 'development';
  
  // Allow requests from frontend during development
  if (isDev) {
    const allowedOrigins = ['http://localhost:5173', 'http://localhost:5000'];
    const origin = req.headers.origin;
    
    if (origin && allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    }
  } else {
    // In production, be more restrictive
    const allowedOrigins = ['https://yourdomain.com', 'https://app.yourdomain.com'];
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    }
  }
  
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,Accept,X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  
  return next();
};

// General CORS middleware for all routes
export const corsMiddleware = (req, res, next) => {
  const isDev = process.env.NODE_ENV === 'development';
  
  if (isDev) {
    const allowedOrigins = ['http://localhost:5173', 'http://localhost:5000'];
    const origin = req.headers.origin;
    
    if (origin && allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    }
    
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS,POST,PUT,DELETE,PATCH');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
  }
  
  next();
};
