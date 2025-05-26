const { Telegraf } = require('telegraf');
const config = require('./config');

async function startDevMode() {
  try {
    console.log('Запуск бота в режиме разработки...');
    
    // Инициализируем бота с токеном
    const bot = new Telegraf(config.BOT_TOKEN);
    
    // Удаляем вебхук перед запуском в режиме polling
    await bot.telegram.deleteWebhook();
    console.log('Вебхук удален для режима разработки.');
    
    // Запускаем бота
    await bot.launch();
    console.log('\n✅ Бот успешно запущен в режиме разработки!');
    console.log('Все обновления будут получены через long polling.\n');
    console.log('Информация:');
    console.log(`- ID канала: ${config.CHANNEL_ID}`);
    console.log(`- ID админа: ${config.ADMIN_ID}`);
    console.log('\nНажмите Ctrl+C для остановки бота.');
    
    // Обработка сигналов остановки
    process.once('SIGINT', () => {
      console.log('Остановка бота...');
      bot.stop('SIGINT');
    });
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
    
  } catch (error) {
    console.error(`❌ Ошибка запуска бота: ${error.message}`);
    process.exit(1);
  }
}

startDevMode().catch(console.error); 