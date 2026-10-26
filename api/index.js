const app = require('../index');
const { initializeDatabase } = require('../src/config/migrate');

let databaseInitialization;

module.exports = async (req, res) => {
  if (!databaseInitialization) {
    databaseInitialization = initializeDatabase().catch((error) => {
      databaseInitialization = undefined;
      throw error;
    });
  }

  try {
    await databaseInitialization;
    return app(req, res);
  } catch (error) {
    console.error('❌ Failed to initialize database:', error.message);
    return res.status(503).json({
      success: false,
      message: 'Database is temporarily unavailable.',
    });
  }
};
