// Webhook handler for Vercel
const handleWebhook = require('../src/webhook');

module.exports = async (req, res) => {
  try {
    await handleWebhook(req, res);
  } catch (error) {
    console.error('Error in webhook handler:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}; 