const jwt = require('jsonwebtoken');
const { User } = require('../models/index');

/**
 * Verifies the Bearer token and attaches req.user.
 */
const protect = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ error: 'Not authenticated' });

  try {
    const token   = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password_hash'] }
    });
    if (!req.user) return res.status(401).json({ error: 'User not found' });
    next();
  } catch {
    res.status(401).json({ error: 'Token invalid or expired' });
  }
};

/**
 * Gates a route to specific roles.
 * Usage: requireRole('admin', 'superadmin')
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role))
    return res.status(403).json({ error: 'Forbidden — insufficient role' });
  next();
};

module.exports = { protect, requireRole };
