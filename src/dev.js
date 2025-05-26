const bot = require('./index');

async function startDevMode() {
  try {
    console.log('Запуск бота в режиме разработки...');
    
    // Удаляем вебхук перед запуском в режиме polling
    await bot.telegram.deleteWebhook();
    console.log('Вебхук удален для режима разработки.');
    
    // Запускаем бота
    await bot.launch();
    console.log('\n✅ Бот успешно запущен в режиме разработки!');
    console.log('Все обновления будут получены через long polling.\n');
    
    // Выводим информацию о конфигурации
    const config = require('./config');
    console.log('Информация:');
    console.log(`- ID канала: ${config.CHANNEL_ID}`);
    console.log(`- ID админа: ${config.ADMIN_ID}`);
    console.log('\nНажмите Ctrl+C для остановки бота.');
    
  } catch (error) {
    console.error(`❌ Ошибка запуска бота: ${error.message}`);
    process.exit(1);
  }
}

startDevMode().catch(console.error); 