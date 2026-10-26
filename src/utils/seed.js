require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const bcrypt = require('bcrypt');
const pool = require('../config/db');
const { initializeDatabase } = require('../config/migrate');

const SALT_ROUNDS = 12;

const seedDatabase = async () => {
  try {
    // Ensure tables exist
    await initializeDatabase();

    // Check if admin already seeded
    const existingAdmin = await pool.query(
      "SELECT id FROM users WHERE email = 'admin@securetask.com' LIMIT 1"
    );
    if (existingAdmin.rows.length > 0) {
      console.log('⚠️  Seed data already exists. Skipping...');
      process.exit(0);
    }

    const adminPassword = await bcrypt.hash('Admin@12345', SALT_ROUNDS);
    const employeePassword = await bcrypt.hash('Employee@12345', SALT_ROUNDS);

    // Create admin
    const adminResult = await pool.query(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      ['Administrator', 'admin@securetask.com', adminPassword, 'admin']
    );
    const adminId = adminResult.rows[0].id;

    // Create employee
    const empResult = await pool.query(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      ['John Doe', 'employee@securetask.com', employeePassword, 'employee']
    );
    const empId = empResult.rows[0].id;

    // Create sample tasks
    await pool.query(
      `INSERT INTO tasks (user_id, title, description, status) VALUES
       ($1, 'Setup project infrastructure', 'Initialize the project repo and configure CI/CD pipelines', 'done'),
       ($1, 'Write security documentation', 'Document all security measures implemented in the portal', 'in_progress'),
       ($2, 'Complete onboarding training', 'Finish all required onboarding modules by end of week', 'todo'),
       ($2, 'Submit weekly report', 'Prepare and submit the weekly progress report to the manager', 'in_progress')`,
      [adminId, empId]
    );

    console.log('✅ Seed data inserted successfully!');
    console.log('');
    console.log('🔑 Login Credentials:');
    console.log('   Admin    → admin@securetask.com     / Admin@12345');
    console.log('   Employee → employee@securetask.com  / Employee@12345');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  }
};

seedDatabase();
