const { Telegraf } = require('telegraf');
const config = require('./config');
const botHandler = require('./index');

async function startPolling() {
  try {
    const bot = new Telegraf(config.BOT_TOKEN);
    
    // Удаляем все вебхуки для работы в режиме long polling
    await bot.telegram.deleteWebhook();
    console.log('Вебхук удален, запуск в режиме long polling...');
    
    // Запуск бота
    await bot.launch();
    console.log('Бот успешно запущен в режиме long polling!');
    console.log(`ID канала: ${config.CHANNEL_ID}`);
    console.log(`ID админа: ${config.ADMIN_ID}`);
    
    // Обработка сигналов остановки
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
  } catch (error) {
    console.error('Ошибка запуска бота:', error);
    process.exit(1);
  }
}

startPolling().catch(console.error); 