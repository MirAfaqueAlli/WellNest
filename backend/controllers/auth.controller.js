const { Op }   = require('sequelize');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { User, Hospital } = require('../models/index');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

// ── POST /api/auth/login ──────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password required' });

    const user = await User.findOne({ where: { email }, include: [Hospital] });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    res.json({
      token: generateToken(user.id),
      user: {
        id:          user.id,
        name:        user.name,
        email:       user.email,
        role:        user.role,
        hospital_id: user.hospital_id,
        hospital:    user.Hospital?.name
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
};

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
exports.getMe = async (req, res) => {
  res.json({ user: req.user });
};

// ── POST /api/auth/register-staff  (admin+ only) ─────────────────────────────
exports.registerStaff = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'name, email and password required' });

    const hashed = await bcrypt.hash(password, 12);
    const ALLOWED_ROLES = ['staff', 'admin', 'doctor_pregnancy', 'doctor_immunization'];
    const assignedRole  = ALLOWED_ROLES.includes(role) ? role : 'staff';
    const staff  = await User.create({
      name,
      email,
      password_hash: hashed,
      role:          assignedRole,
      hospital_id:   req.user.hospital_id
    });

    res.status(201).json({ id: staff.id, name: staff.name, email: staff.email, role: staff.role });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError')
      return res.status(409).json({ error: 'Email already in use' });
    console.error('Register staff error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// ── GET /api/auth/staff  (admin+ only) ───────────────────────────────────────
exports.listStaff = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, role } = req.query;
    const lim = parseInt(limit) || 10;
    const offset = (parseInt(page) - 1) * lim;

    const where = { hospital_id: req.user.hospital_id };
    if (role) where.role = role;
    if (search) {
      where[Op.or] = [
        { name:  { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password_hash'] },
      order:      [['createdAt', 'DESC']],
      limit:      lim,
      offset
    });

    res.json({
      total: count,
      page:  parseInt(page),
      limit: lim,
      pages: Math.ceil(count / lim) || 1,
      staff: rows
    });
  } catch (err) {
    console.error('List staff error:', err);
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
};
