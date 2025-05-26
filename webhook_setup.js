const axios = require('axios');
const config = require('./src/config');

const BOT_TOKEN = config.BOT_TOKEN;

// WebhookURL для прямого подключения к Telegram API
const webhookURL = `https://api.telegram.org/bot${BOT_TOKEN}`;
const deleteWebhook = `${webhookURL}/deleteWebhook`;
const setWebhook = `${webhookURL}/setWebhook`;

async function setupWebhook() {
  try {
    console.log('Удаление старого вебхука...');
    const deleteResponse = await axios.get(deleteWebhook);
    console.log('Результат удаления:', deleteResponse.data);

    console.log('\nНастройка нового вебхука для локальной разработки...');
    console.log('\nВаш бот настроен для работы в режиме long polling.');
    console.log('Это значит, что бот будет получать обновления через API Telegram напрямую.');
    
    console.log('\n1. Запустите локальный сервер:');
    console.log('   npm run dev');
    
    console.log('\n2. Когда вы будете готовы к деплою в облако:');
    console.log('   - Создайте проект на Vercel');
    console.log('   - Подключите ваш GitHub репозиторий к Vercel');
    console.log('   - После деплоя, запустите команду:');
    console.log('     node setup.js');
    
    console.log('\nТокен вашего бота:', BOT_TOKEN);
    console.log('ID канала:', config.CHANNEL_ID);
    console.log('ID администратора:', config.ADMIN_ID);
  } catch (error) {
    console.error('Ошибка при настройке вебхука:', error.message);
  }
}

setupWebhook().catch(console.error); 