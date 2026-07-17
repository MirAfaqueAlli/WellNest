const sequelize    = require('../config/db');
const Hospital     = require('./Hospital');
const User         = require('./User');
const Patient      = require('./Patient');
const StageTemplate = require('./StageTemplate');
const PatientStage  = require('./PatientStage');
const Notification  = require('./Notification');

// ── Associations ──────────────────────────────────────────────────────────────

Hospital.hasMany(User,     { foreignKey: 'hospital_id' });
User.belongsTo(Hospital,   { foreignKey: 'hospital_id' });

Hospital.hasMany(Patient,  { foreignKey: 'hospital_id' });
Patient.belongsTo(Hospital, { foreignKey: 'hospital_id' });

Patient.hasMany(PatientStage,    { foreignKey: 'patient_id', as: 'stages' });
PatientStage.belongsTo(Patient,  { foreignKey: 'patient_id' });

StageTemplate.hasMany(PatientStage,   { foreignKey: 'stage_template_id' });
PatientStage.belongsTo(StageTemplate, { foreignKey: 'stage_template_id', as: 'template' });

Patient.hasMany(Notification,    { foreignKey: 'patient_id' });
Notification.belongsTo(Patient,  { foreignKey: 'patient_id' });

PatientStage.hasMany(Notification,   { foreignKey: 'patient_stage_id' });
Notification.belongsTo(PatientStage, { foreignKey: 'patient_stage_id' });

User.hasMany(PatientStage,    { foreignKey: 'recorded_by', as: 'recorded_stages' });
PatientStage.belongsTo(User,  { foreignKey: 'recorded_by', as: 'recorder' });

module.exports = { sequelize, Hospital, User, Patient, StageTemplate, PatientStage, Notification };
