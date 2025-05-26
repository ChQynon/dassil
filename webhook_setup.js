const axios = require('axios');
const config = require('./src/config');
const readline = require('readline');

const BOT_TOKEN = config.BOT_TOKEN;

// WebhookURL для прямого подключения к Telegram API
const apiURL = `https://api.telegram.org/bot${BOT_TOKEN}`;
const deleteWebhookURL = `${apiURL}/deleteWebhook`;
const setWebhookURL = `${apiURL}/setWebhook`;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function setupWebhook() {
  try {
    console.log('Подготовка к настройке вебхука для бота...\n');
    
    rl.question('Введите URL вашего деплоя на Vercel (например, https://your-app.vercel.app): ', async (vercelURL) => {
      if (!vercelURL || !vercelURL.startsWith('http')) {
        console.log('Неверный URL. URL должен начинаться с http:// или https://');
        rl.close();
        return;
      }

      const webhookURL = `${vercelURL}/api/telegram`.replace(/\/\//g, '/').replace(/^(https?:)\//, '$1//');
      
      try {
        // Удаляем старый вебхук
        console.log('Удаление старого вебхука...');
        const deleteResponse = await axios.get(deleteWebhookURL);
        console.log('Результат удаления:', deleteResponse.data);

        // Устанавливаем новый вебхук
        console.log(`\nУстановка нового вебхука на адрес: ${webhookURL}`);
        const setResponse = await axios.post(setWebhookURL, {
          url: webhookURL,
          drop_pending_updates: true
        });
        
        console.log('Результат установки вебхука:', setResponse.data);
        
        if (setResponse.data.ok) {
          console.log('\n✅ Вебхук успешно установлен!');
          console.log(`\nВаш бот теперь принимает обновления через: ${webhookURL}`);
        } else {
          console.log('\n❌ Не удалось установить вебхук. Проверьте URL и доступность сервера.');
        }
        
        console.log('\nИнформация о боте:');
        console.log(`- Токен: ${BOT_TOKEN}`);
        console.log(`- ID канала: ${config.CHANNEL_ID}`);
        console.log(`- ID админа: ${config.ADMIN_ID}`);
      } catch (error) {
        console.error('\n❌ Произошла ошибка при настройке вебхука:', error.message);
      } finally {
        rl.close();
      }
    });
  } catch (error) {
    console.error('Ошибка:', error.message);
    rl.close();
  }
}

setupWebhook().catch(console.error); 