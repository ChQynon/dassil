// Webhook handler for Vercel
const botHandler = require('../src/index');

module.exports = async (req, res) => {
  try {
    if (req.method === 'POST') {
      await botHandler(req, res);
    } else {
      res.status(200).json({ status: 'ok' });
    }
  } catch (error) {
    console.error('Error in webhook handler:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}; 