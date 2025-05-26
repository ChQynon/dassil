const { Telegraf } = require('telegraf');
const config = require('./config');
const botModule = require('./index');

// Инициализируем бота
const bot = new Telegraf(config.BOT_TOKEN);

// Функция для обработки вебхука
const handleWebhook = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res.status(200).json({ status: 'webhook is active' });
    }
    
    // Логирование запроса для отладки
    console.log('Received webhook:', JSON.stringify(req.body).slice(0, 100) + '...');
    
    // Обработка обновления
    await bot.handleUpdate(req.body);
    
    // Всегда отвечаем успешно Telegram
    return res.status(200).end();
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: error.message });
  }
};

module.exports = handleWebhook; 