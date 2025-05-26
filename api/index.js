// Статическая страница для проверки работы бота
const axios = require('axios');
const config = require('../src/config');

const checkBotStatus = async () => {
  try {
    const response = await axios.get(`https://api.telegram.org/bot${config.BOT_TOKEN}/getMe`);
    return response.data.ok ? response.data.result : null;
  } catch (error) {
    console.error('Error checking bot status:', error.message);
    return null;
  }
};

module.exports = async (req, res) => {
  const botToken = process.env.BOT_TOKEN || config.BOT_TOKEN;
  // скрываем полный токен
  const maskedToken = botToken.slice(0, 8) + '...' + botToken.slice(-5);
  
  // Проверяем статус бота
  let botInfo = null;
  let botStatus = 'Неизвестно';
  try {
    botInfo = await checkBotStatus();
    botStatus = botInfo ? 'Активен' : 'Неактивен';
  } catch (error) {
    console.error('Error checking bot:', error);
  }
  
  // Отправляем HTML с информацией о боте
  res.setHeader('Content-Type', 'text/html; charset=UTF-8');
  res.status(200).send(`<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Telegram Бот для Конкурсов</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', sans-serif;
      background: #f5f5f5;
      color: #333;
      line-height: 1.6;
      margin: 0;
      padding: 20px;
      display: flex;
      justify-content: center;
    }
    .container {
      max-width: 800px;
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 {
      color: #0088cc;
      margin-top: 0;
    }
    .status {
      display: inline-block;
      padding: 5px 10px;
      background: ${botInfo ? '#4CAF50' : '#f44336'};
      color: white;
      border-radius: 4px;
      font-weight: bold;
    }
    pre {
      background: #f7f7f7;
      padding: 15px;
      border-radius: 4px;
      overflow-x: auto;
    }
    .info {
      margin: 20px 0;
      padding: 15px;
      background: #e7f3fe;
      border-left: 5px solid #2196F3;
    }
    .tip {
      margin: 20px 0;
      padding: 15px;
      background: #ffedcc;
      border-left: 5px solid #ffc107;
    }
    button {
      background-color: #0088cc;
      color: white;
      border: none;
      padding: 10px 15px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
      margin-top: 10px;
    }
    button:hover {
      background-color: #006699;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Telegram Бот для Конкурсов</h1>
    <p class="status">${botStatus}</p>
    
    <h2>Статус API</h2>
    <p>Вебхук настроен и активно принимает запросы от Telegram API.</p>
    
    <div class="info">
      <h3>Информация о боте</h3>
      ${botInfo ? `
      <p><strong>Имя бота:</strong> ${botInfo.first_name}</p>
      <p><strong>Username:</strong> @${botInfo.username}</p>
      ` : ''}
      <p><strong>Webhook URL:</strong> ${req.headers.host}/api/telegram</p>
      <p><strong>Токен (маска):</strong> ${maskedToken}</p>
      <p><strong>Канал:</strong> ${config.CHANNEL_ID}</p>
      <p>Сервер времени: ${new Date().toLocaleString()}</p>
    </div>
    
    <h2>Доступные команды</h2>
    <pre>/start - Начать работу с ботом
/admin - Админ-панель (только для администратора)
/new_contest - Создать новый конкурс (только для администратора)
/list_contests - Просмотреть список конкурсов (только для администратора)
/registrations [ID] - Просмотр регистраций на конкурс (только для администратора)
/edit_buttons [ID] - Изменение кнопок конкурса (только для администратора)
/set_deadline [ID] [дата] - Установка дедлайна конкурса (только для администратора)</pre>
    
    <div class="tip">
      <h3>Подсказка</h3>
      <p>Если бот не отвечает на команды, убедитесь, что:</p>
      <ul>
        <li>Бот запущен и активен</li>
        <li>Вебхук правильно настроен</li>
        <li>Токен указан верно</li>
        <li>У бота есть права для отправки сообщений</li>
      </ul>
    </div>
    
    <button onclick="window.location.reload()">Обновить статус</button>
  </div>
</body>
</html>`);
}; 