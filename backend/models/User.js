const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
  hospital_id:    { type: DataTypes.INTEGER, allowNull: false },
  name:           { type: DataTypes.STRING(100), allowNull: false },
  email:          { type: DataTypes.STRING(100), allowNull: false, unique: true },
  password_hash:  { type: DataTypes.STRING(255), allowNull: false },
  role:           { type: DataTypes.ENUM('superadmin','admin','staff'), defaultValue: 'staff' }
}, { tableName: 'users', timestamps: true });

module.exports = User;
