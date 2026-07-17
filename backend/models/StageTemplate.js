const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const StageTemplate = sequelize.define('StageTemplate', {
  type:          { type: DataTypes.ENUM('pregnancy','immunization'), allowNull: false },
  stage_code:    { type: DataTypes.STRING(50), allowNull: false, unique: true }, // e.g. ANC_16W
  stage_name:    { type: DataTypes.STRING(150), allowNull: false },
  description:   { type: DataTypes.TEXT },
  trigger_basis: { type: DataTypes.ENUM('lmp_week','child_age_days'), allowNull: false },
  trigger_value: { type: DataTypes.INTEGER, allowNull: false }, // weeks or days
  order_index:   { type: DataTypes.INTEGER, allowNull: false }
}, { tableName: 'stage_templates', timestamps: false });

module.exports = StageTemplate;
