const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Hospital = sequelize.define('Hospital', {
  name:                  { type: DataTypes.STRING(255), allowNull: false },
  address:               { type: DataTypes.TEXT },
  phone:                 { type: DataTypes.STRING(20) },
  whatsapp_sender_id:    { type: DataTypes.STRING(50) },     // registered WA business number
  whatsapp_api_url:      { type: DataTypes.STRING(500) },    // e.g. https://wapi.rextrox.in/send-message
  whatsapp_api_key:      { type: DataTypes.STRING(500) },    // x-api-key value
  whatsapp_api_provider: { type: DataTypes.STRING(100) },    // label e.g. "wapi.rextrox.in"
}, { tableName: 'hospitals', timestamps: true });

module.exports = Hospital;
