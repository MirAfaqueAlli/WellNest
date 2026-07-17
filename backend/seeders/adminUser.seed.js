const bcrypt = require('bcryptjs');
const { Hospital, User } = require('../models/index');

async function seed() {
  // Create default hospital first
  const [hospital] = await Hospital.findOrCreate({
    where: { name: 'WellNest General Hospital' },
    defaults: {
      address: '123 Health Avenue, Medical City',
      phone:   '+1-555-0100',
    }
  });

  console.log(`✅ Hospital ready (id: ${hospital.id})`);

  // Create superadmin
  const passwordHash = await bcrypt.hash('Admin@123', 12);
  const [user, created] = await User.findOrCreate({
    where: { email: 'admin@wellnest.com' },
    defaults: {
      hospital_id:   hospital.id,
      name:          'Super Admin',
      password_hash: passwordHash,
      role:          'superadmin'
    }
  });

  if (created) {
    console.log('✅ Superadmin created:');
    console.log('   Email:    admin@wellnest.com');
    console.log('   Password: Admin@123');
    console.log('   ⚠️  Change the password after first login!');
  } else {
    console.log('ℹ️  Superadmin already exists — skipped');
  }

  process.exit(0);
}

seed().catch(e => { console.error('❌ Seeding failed:', e); process.exit(1); });
