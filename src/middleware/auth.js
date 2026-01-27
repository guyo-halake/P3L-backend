import jwt from 'jsonwebtoken';

// Middleware to verify JWT and attach user to request
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
}

// Middleware to require a specific user_type (e.g., 'full_admin')
export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.user_type !== role) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
}
