const axios = require('axios');
const config = require('./src/config');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('Telegram Bot Setup Script');
console.log('-------------------------');

rl.question('Enter your Vercel deployment URL (e.g., https://your-app.vercel.app): ', async (deploymentUrl) => {
  try {
    const webhookUrl = `${deploymentUrl}/api/telegram`;
    
    console.log(`Setting webhook to: ${webhookUrl}`);
    
    const response = await axios.get(
      `https://api.telegram.org/bot${config.BOT_TOKEN}/setWebhook`,
      {
        params: {
          url: webhookUrl,
          drop_pending_updates: true
        }
      }
    );
    
    if (response.data.ok) {
      console.log('✅ Webhook successfully set!');
    } else {
      console.error('❌ Failed to set webhook:', response.data.description);
    }
  } catch (error) {
    console.error('❌ Error setting webhook:', error.message);
  } finally {
    rl.close();
  }
});

console.log('\nNotes:');
console.log('1. Make sure you have deployed to Vercel before running this script');
console.log('2. The Telegram bot token is configured in src/config.js');
console.log('3. Ensure your bot has been added to the channel and given admin rights'); 