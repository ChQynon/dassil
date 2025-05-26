const { Telegraf } = require('telegraf');
const config = require('./config');
const botIndex = require('./index');

// Инициализируем бота для вебхука
const bot = new Telegraf(config.BOT_TOKEN);

// Отключаем запуск через launch() в основном файле
// и регистрируем все обработчики из основного файла
bot.use(botIndex.middleware());

// Функция для обработки вебхука
const handleWebhook = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res.status(200).json({ status: 'webhook is active', time: new Date().toISOString() });
    }
    
    // Логирование запроса для отладки
    console.log('Received webhook update:', new Date().toISOString());
    
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