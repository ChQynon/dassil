const { Telegraf, Markup } = require('telegraf');
const config = require('./config');

// Bot initialization
const bot = new Telegraf(config.BOT_TOKEN);
const CHANNEL_ID = config.CHANNEL_ID;
const ADMIN_ID = config.ADMIN_ID;

// In-memory storage for contests and registrations
const contests = new Map();
let currentContestCreation = null;
let currentButtonEdit = null;

// Helper functions
const isAdmin = (ctx) => ctx.from?.id === ADMIN_ID;

const registerUser = (contestId, userId, username) => {
  const contest = contests.get(contestId);
  if (!contest) return false;
  
  if (!contest.participants.some(p => p.id === userId)) {
    contest.participants.push({
      id: userId,
      username: username || `User${userId}`,
      registeredAt: new Date().toISOString(),
      registrationInfo: {}
    });
    return true;
  }
  return false;
};

const updatePostWithParticipants = async (contestId) => {
  const contest = contests.get(contestId);
  if (!contest || !contest.messageId) return;
  
  const participantsList = contest.participants.length > 0 
    ? contest.participants.map(p => `• ${p.username}`).join('\n')
    : 'Пока нет участников';
  
  const deadlineText = contest.deadline 
    ? `\n\nДедлайн: ${contest.deadline}`
    : '\n\nДедлайн не установлен';
  
  const updatedText = `${contest.text}\n\n👥 Участники (${contest.participants.length}):\n${participantsList}${deadlineText}`;
  
  try {
    const buttons = contest.buttons || [{ text: 'Зарегистрироваться', callback_data: `register_${contestId}` }];
    
    await bot.telegram.editMessageText(
      CHANNEL_ID,
      contest.messageId,
      null,
      updatedText,
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard(buttons)
      }
    );
  } catch (error) {
    console.error('Error updating post:', error);
  }
};

const formatRegistrationInfo = (participant) => {
  const registered = new Date(participant.registeredAt);
  const formattedDate = `${registered.toLocaleDateString()} ${registered.toLocaleTimeString()}`;
  
  let info = `Имя: ${participant.username}\n`;
  info += `ID: ${participant.id}\n`;
  info += `Дата регистрации: ${formattedDate}\n`;
  
  if (participant.registrationInfo) {
    Object.entries(participant.registrationInfo).forEach(([key, value]) => {
      info += `${key}: ${value}\n`;
    });
  }
  
  return info;
};

// Command handlers
bot.start(async (ctx) => {
  if (isAdmin(ctx)) {
    await ctx.reply('Добро пожаловать, админ! Вы можете создать конкурс командой /new_contest');
  } else {
    const callbackData = ctx.startPayload;
    if (callbackData && callbackData.startsWith('contest_')) {
      const contestId = callbackData.split('_')[1];
      if (contests.has(contestId)) {
        const registered = registerUser(contestId, ctx.from.id, ctx.from.username || ctx.from.first_name);
        if (registered) {
          await ctx.reply('✅ Вы успешно зарегистрировались на конкурс!');
          
          // Ask for additional information if contest has registration fields
          const contest = contests.get(contestId);
          if (contest.registrationFields && contest.registrationFields.length > 0) {
            await ctx.reply('Пожалуйста, заполните следующую информацию:');
            
            // Store registration state
            contest.participants.find(p => p.id === ctx.from.id).registrationState = {
              inProgress: true,
              currentField: 0,
              fields: contest.registrationFields
            };
            
            // Ask the first question
            await ctx.reply(contest.registrationFields[0].question);
          }
          
          updatePostWithParticipants(contestId);
        } else {
          await ctx.reply('Вы уже зарегистрированы на этот конкурс.');
        }
      } else {
        await ctx.reply('Конкурс не найден или уже завершен.');
      }
    } else {
      await ctx.reply('Добро пожаловать! Перейдите по ссылке из канала, чтобы зарегистрироваться на конкурс.');
    }
  }
});

bot.command('new_contest', async (ctx) => {
  if (!isAdmin(ctx)) {
    return ctx.reply('Эта команда доступна только администратору.');
  }
  
  currentContestCreation = {
    id: Date.now().toString(),
    text: '',
    participants: [],
    registrationFields: [],
    buttons: [{ text: 'Зарегистрироваться', callback_data: `register_${Date.now().toString()}` }]
  };
  
  await ctx.reply('Отправьте текст поста для конкурса:');
});

// Handle admin messages for contest creation
bot.on('message', async (ctx) => {
  // Handle registration form submission
  const userId = ctx.from.id;
  let isProcessingRegistration = false;
  
  // Check if user is in registration process
  for (const [contestId, contest] of contests.entries()) {
    const participant = contest.participants.find(p => p.id === userId);
    
    if (participant && participant.registrationState?.inProgress) {
      isProcessingRegistration = true;
      const { registrationState } = participant;
      const field = registrationState.fields[registrationState.currentField];
      
      // Save answer
      participant.registrationInfo[field.name] = ctx.message.text;
      
      // Move to next field or complete
      registrationState.currentField++;
      
      if (registrationState.currentField < registrationState.fields.length) {
        // Ask next question
        await ctx.reply(registrationState.fields[registrationState.currentField].question);
      } else {
        // Complete registration
        registrationState.inProgress = false;
        await ctx.reply('Спасибо! Ваша регистрация завершена.');
        updatePostWithParticipants(contestId);
      }
      
      break;
    }
  }
  
  // If not in registration process, handle admin features
  if (!isProcessingRegistration && isAdmin(ctx)) {
    // Handle button editing
    if (currentButtonEdit) {
      const contestId = currentButtonEdit.contestId;
      const buttonIndex = currentButtonEdit.buttonIndex;
      const buttonType = currentButtonEdit.type;
      
      const contest = contests.get(contestId);
      if (contest) {
        if (buttonType === 'text') {
          contest.buttons[buttonIndex].text = ctx.message.text;
          await ctx.reply(`Текст кнопки обновлен на: ${ctx.message.text}`);
        } else if (buttonType === 'callback') {
          contest.buttons[buttonIndex].callback_data = ctx.message.text;
          await ctx.reply(`Callback-данные кнопки обновлены на: ${ctx.message.text}`);
        }
        
        updatePostWithParticipants(contestId);
        currentButtonEdit = null;
        return;
      }
    }
    
    // Handle registration fields creation
    if (currentContestCreation && currentContestCreation.awaitingFieldName) {
      const fieldName = ctx.message.text;
      currentContestCreation.currentField = { name: fieldName };
      currentContestCreation.awaitingFieldName = false;
      currentContestCreation.awaitingFieldQuestion = true;
      
      await ctx.reply('Введите вопрос для этого поля:');
      return;
    }
    
    if (currentContestCreation && currentContestCreation.awaitingFieldQuestion) {
      const fieldQuestion = ctx.message.text;
      currentContestCreation.currentField.question = fieldQuestion;
      
      if (!currentContestCreation.registrationFields) {
        currentContestCreation.registrationFields = [];
      }
      
      currentContestCreation.registrationFields.push(currentContestCreation.currentField);
      currentContestCreation.currentField = null;
      currentContestCreation.awaitingFieldQuestion = false;
      
      await ctx.reply(
        'Поле добавлено! Выберите действие:',
        Markup.inlineKeyboard([
          Markup.button.callback('Добавить еще поле', 'add_field'),
          Markup.button.callback('Продолжить создание конкурса', 'continue_creation')
        ])
      );
      return;
    }
    
    // Handle contest text creation
    if (currentContestCreation && !currentContestCreation.text) {
      currentContestCreation.text = ctx.message.text;
      contests.set(currentContestCreation.id, currentContestCreation);
      
      await ctx.reply(
        'Предпросмотр поста:\n\n' + currentContestCreation.text,
        {
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard([
            [
              Markup.button.callback('Добавить поля для регистрации', 'add_registration_fields'),
              Markup.button.callback('Настроить кнопки', 'setup_buttons')
            ],
            [
              Markup.button.callback('Опубликовать', `publish_${currentContestCreation.id}`),
              Markup.button.callback('Отменить', 'cancel_creation')
            ]
          ])
        }
      );
    }
  }
});

// Callback queries
bot.on('callback_query', async (ctx) => {
  const callbackData = ctx.callbackQuery.data;
  
  // Registration fields management
  if (callbackData === 'add_registration_fields' && isAdmin(ctx)) {
    await ctx.answerCbQuery('Добавление полей для регистрации');
    await ctx.reply('Введите имя поля (например, "email" или "phone"):');
    
    currentContestCreation.awaitingFieldName = true;
    return;
  }
  
  if (callbackData === 'add_field' && isAdmin(ctx)) {
    await ctx.answerCbQuery('Добавление нового поля');
    await ctx.reply('Введите имя поля:');
    
    currentContestCreation.awaitingFieldName = true;
    return;
  }
  
  if (callbackData === 'continue_creation' && isAdmin(ctx)) {
    await ctx.answerCbQuery('Продолжение создания конкурса');
    await ctx.reply(
      'Предпросмотр поста:\n\n' + currentContestCreation.text,
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('Настроить кнопки', 'setup_buttons'),
            Markup.button.callback('Опубликовать', `publish_${currentContestCreation.id}`)
          ],
          [
            Markup.button.callback('Отменить', 'cancel_creation')
          ]
        ])
      }
    );
    return;
  }
  
  // Button management
  if (callbackData === 'setup_buttons' && isAdmin(ctx)) {
    await ctx.answerCbQuery('Настройка кнопок');
    
    const contest = currentContestCreation;
    let buttonList = '';
    
    contest.buttons.forEach((button, index) => {
      buttonList += `${index + 1}. "${button.text}" (${button.callback_data})\n`;
    });
    
    const keyboard = [
      [
        Markup.button.callback('Добавить кнопку', 'add_button'),
        Markup.button.callback('Удалить кнопку', 'remove_button')
      ],
      [
        Markup.button.callback('Изменить текст', 'edit_button_text'),
        Markup.button.callback('Изменить callback', 'edit_button_callback')
      ],
      [
        Markup.button.callback('Готово', 'buttons_done')
      ]
    ];
    
    await ctx.editMessageText(
      `Текущие кнопки:\n${buttonList}\n\nВыберите действие:`,
      Markup.inlineKeyboard(keyboard)
    );
    return;
  }
  
  if (callbackData === 'add_button' && isAdmin(ctx)) {
    await ctx.answerCbQuery('Добавление кнопки');
    
    const contest = currentContestCreation;
    const buttonId = `custom_${Date.now()}`;
    
    contest.buttons.push({ text: 'Новая кнопка', callback_data: buttonId });
    
    let buttonList = '';
    contest.buttons.forEach((button, index) => {
      buttonList += `${index + 1}. "${button.text}" (${button.callback_data})\n`;
    });
    
    await ctx.editMessageText(
      `Кнопка добавлена!\n\nТекущие кнопки:\n${buttonList}\n\nВыберите действие:`,
      {
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('Добавить кнопку', 'add_button'),
            Markup.button.callback('Удалить кнопку', 'remove_button')
          ],
          [
            Markup.button.callback('Изменить текст', 'edit_button_text'),
            Markup.button.callback('Изменить callback', 'edit_button_callback')
          ],
          [
            Markup.button.callback('Готово', 'buttons_done')
          ]
        ])
      }
    );
    return;
  }
  
  if (callbackData === 'edit_button_text' && isAdmin(ctx)) {
    await ctx.answerCbQuery('Редактирование текста кнопки');
    
    const contest = currentContestCreation;
    const buttons = contest.buttons.map((btn, idx) => {
      return Markup.button.callback(`${idx + 1}. ${btn.text}`, `edit_text_${idx}`);
    });
    
    const keyboard = [];
    for (let i = 0; i < buttons.length; i += 2) {
      const row = [buttons[i]];
      if (i + 1 < buttons.length) {
        row.push(buttons[i + 1]);
      }
      keyboard.push(row);
    }
    keyboard.push([Markup.button.callback('Отмена', 'buttons_done')]);
    
    await ctx.editMessageText('Выберите кнопку для изменения текста:', Markup.inlineKeyboard(keyboard));
    return;
  }
  
  if (callbackData.startsWith('edit_text_') && isAdmin(ctx)) {
    await ctx.answerCbQuery('Введите новый текст');
    
    const buttonIndex = parseInt(callbackData.split('_')[2], 10);
    currentButtonEdit = { 
      contestId: currentContestCreation.id,
      buttonIndex,
      type: 'text'
    };
    
    await ctx.reply(`Введите новый текст для кнопки "${currentContestCreation.buttons[buttonIndex].text}":`);
    return;
  }
  
  if (callbackData === 'edit_button_callback' && isAdmin(ctx)) {
    await ctx.answerCbQuery('Редактирование callback данных кнопки');
    
    const contest = currentContestCreation;
    const buttons = contest.buttons.map((btn, idx) => {
      return Markup.button.callback(`${idx + 1}. ${btn.text}`, `edit_callback_${idx}`);
    });
    
    const keyboard = [];
    for (let i = 0; i < buttons.length; i += 2) {
      const row = [buttons[i]];
      if (i + 1 < buttons.length) {
        row.push(buttons[i + 1]);
      }
      keyboard.push(row);
    }
    keyboard.push([Markup.button.callback('Отмена', 'buttons_done')]);
    
    await ctx.editMessageText('Выберите кнопку для изменения callback данных:', Markup.inlineKeyboard(keyboard));
    return;
  }
  
  if (callbackData.startsWith('edit_callback_') && isAdmin(ctx)) {
    await ctx.answerCbQuery('Введите новый callback');
    
    const buttonIndex = parseInt(callbackData.split('_')[2], 10);
    currentButtonEdit = { 
      contestId: currentContestCreation.id,
      buttonIndex,
      type: 'callback'
    };
    
    await ctx.reply(`Введите новые callback данные для кнопки "${currentContestCreation.buttons[buttonIndex].text}" (текущие: ${currentContestCreation.buttons[buttonIndex].callback_data}):`);
    return;
  }
  
  if (callbackData === 'remove_button' && isAdmin(ctx)) {
    await ctx.answerCbQuery('Удаление кнопки');
    
    const contest = currentContestCreation;
    if (contest.buttons.length <= 1) {
      await ctx.reply('Невозможно удалить единственную кнопку!');
      return;
    }
    
    const buttons = contest.buttons.map((btn, idx) => {
      return Markup.button.callback(`${idx + 1}. ${btn.text}`, `remove_button_${idx}`);
    });
    
    const keyboard = [];
    for (let i = 0; i < buttons.length; i += 2) {
      const row = [buttons[i]];
      if (i + 1 < buttons.length) {
        row.push(buttons[i + 1]);
      }
      keyboard.push(row);
    }
    keyboard.push([Markup.button.callback('Отмена', 'buttons_done')]);
    
    await ctx.editMessageText('Выберите кнопку для удаления:', Markup.inlineKeyboard(keyboard));
    return;
  }
  
  if (callbackData.startsWith('remove_button_') && isAdmin(ctx)) {
    await ctx.answerCbQuery('Кнопка удалена');
    
    const buttonIndex = parseInt(callbackData.split('_')[2], 10);
    const removedButton = currentContestCreation.buttons.splice(buttonIndex, 1)[0];
    
    let buttonList = '';
    currentContestCreation.buttons.forEach((button, index) => {
      buttonList += `${index + 1}. "${button.text}" (${button.callback_data})\n`;
    });
    
    await ctx.editMessageText(
      `Кнопка "${removedButton.text}" удалена!\n\nТекущие кнопки:\n${buttonList}\n\nВыберите действие:`,
      {
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('Добавить кнопку', 'add_button'),
            Markup.button.callback('Удалить кнопку', 'remove_button')
          ],
          [
            Markup.button.callback('Изменить текст', 'edit_button_text'),
            Markup.button.callback('Изменить callback', 'edit_button_callback')
          ],
          [
            Markup.button.callback('Готово', 'buttons_done')
          ]
        ])
      }
    );
    return;
  }
  
  if (callbackData === 'buttons_done' && isAdmin(ctx)) {
    await ctx.answerCbQuery('Настройка кнопок завершена');
    await ctx.editMessageText(
      'Предпросмотр поста:\n\n' + currentContestCreation.text,
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('Добавить поля для регистрации', 'add_registration_fields'),
            Markup.button.callback('Настроить кнопки', 'setup_buttons')
          ],
          [
            Markup.button.callback('Опубликовать', `publish_${currentContestCreation.id}`),
            Markup.button.callback('Отменить', 'cancel_creation')
          ]
        ])
      }
    );
    return;
  }
  
  // Admin publishing a contest
  if (callbackData.startsWith('publish_') && isAdmin(ctx)) {
    const contestId = callbackData.split('_')[1];
    const contest = contests.get(contestId);
    
    if (contest) {
      try {
        // Post to channel
        const message = await bot.telegram.sendMessage(
          CHANNEL_ID,
          contest.text,
          {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard(contest.buttons)
          }
        );
        
        // Pin the message
        await bot.telegram.pinChatMessage(CHANNEL_ID, message.message_id);
        
        // Save message ID
        contest.messageId = message.message_id;
        
        // Confirm to admin
        await ctx.answerCbQuery('Конкурс опубликован и закреплен!');
        await ctx.editMessageText('✅ Конкурс успешно опубликован и закреплен в канале.');
        
        currentContestCreation = null;
      } catch (error) {
        console.error('Error publishing contest:', error);
        await ctx.answerCbQuery('Ошибка при публикации.');
        await ctx.reply(`Ошибка: ${error.message}`);
      }
    }
  }
  
  // Cancel contest creation
  else if (callbackData === 'cancel_creation' && isAdmin(ctx)) {
    currentContestCreation = null;
    await ctx.answerCbQuery('Создание конкурса отменено');
    await ctx.editMessageText('❌ Создание конкурса отменено.');
  }
  
  // User registration button from channel
  else if (callbackData.startsWith('register_')) {
    const contestId = callbackData.split('_')[1];
    if (contests.has(contestId)) {
      if (ctx.from.id === ADMIN_ID) {
        await ctx.answerCbQuery('Администраторы не отображаются в списке участников');
        return;
      }
      
      const botUsername = (await bot.telegram.getMe()).username;
      const startLink = `https://t.me/${botUsername}?start=contest_${contestId}`;
      
      await ctx.answerCbQuery('Перейдите в бота для регистрации', {url: startLink});
    } else {
      await ctx.answerCbQuery('Конкурс не найден или уже завершен.');
    }
  }
});

// Admin commands for contest management
bot.command('set_deadline', async (ctx) => {
  if (!isAdmin(ctx)) {
    return ctx.reply('Эта команда доступна только администратору.');
  }
  
  const args = ctx.message.text.split(' ');
  if (args.length < 3) {
    return ctx.reply('Использование: /set_deadline [ID конкурса] [дата дедлайна]');
  }
  
  const contestId = args[1];
  const deadline = args.slice(2).join(' ');
  
  if (contests.has(contestId)) {
    contests.get(contestId).deadline = deadline;
    await ctx.reply(`Дедлайн для конкурса установлен: ${deadline}`);
    updatePostWithParticipants(contestId);
  } else {
    await ctx.reply('Конкурс не найден.');
  }
});

bot.command('broadcast', async (ctx) => {
  if (!isAdmin(ctx)) {
    return ctx.reply('Эта команда доступна только администратору.');
  }
  
  const args = ctx.message.text.split(' ');
  if (args.length < 3) {
    return ctx.reply('Использование: /broadcast [ID конкурса] [текст сообщения]');
  }
  
  const contestId = args[1];
  const message = args.slice(2).join(' ');
  
  if (contests.has(contestId)) {
    const contest = contests.get(contestId);
    let sentCount = 0;
    
    for (const participant of contest.participants) {
      try {
        await bot.telegram.sendMessage(participant.id, message);
        sentCount++;
      } catch (error) {
        console.error(`Error sending broadcast to ${participant.id}:`, error);
      }
    }
    
    await ctx.reply(`Рассылка отправлена ${sentCount} из ${contest.participants.length} участников.`);
  } else {
    await ctx.reply('Конкурс не найден.');
  }
});

bot.command('list_contests', async (ctx) => {
  if (!isAdmin(ctx)) {
    return ctx.reply('Эта команда доступна только администратору.');
  }
  
  if (contests.size === 0) {
    return ctx.reply('Конкурсы не найдены.');
  }
  
  let message = '📋 Список конкурсов:\n\n';
  
  for (const [id, contest] of contests.entries()) {
    message += `ID: ${id}\n`;
    message += `Участников: ${contest.participants.length}\n`;
    message += `Дедлайн: ${contest.deadline || 'не установлен'}\n\n`;
  }
  
  await ctx.reply(message);
});

// New command to view registrations
bot.command('registrations', async (ctx) => {
  if (!isAdmin(ctx)) {
    return ctx.reply('Эта команда доступна только администратору.');
  }
  
  const args = ctx.message.text.split(' ');
  if (args.length < 2) {
    return ctx.reply('Использование: /registrations [ID конкурса]');
  }
  
  const contestId = args[1];
  
  if (contests.has(contestId)) {
    const contest = contests.get(contestId);
    
    if (contest.participants.length === 0) {
      return ctx.reply('Нет зарегистрированных участников.');
    }
    
    // Send paginated list of participants
    const pageSize = 10;
    const totalPages = Math.ceil(contest.participants.length / pageSize);
    
    for (let page = 0; page < totalPages; page++) {
      const start = page * pageSize;
      const end = Math.min(start + pageSize, contest.participants.length);
      
      let message = `📝 Регистрации для конкурса ${contestId} (${page + 1}/${totalPages}):\n\n`;
      
      for (let i = start; i < end; i++) {
        const participant = contest.participants[i];
        message += `👤 ${i + 1}. ${participant.username} (${participant.id})\n`;
        
        if (Object.keys(participant.registrationInfo || {}).length > 0) {
          message += 'Информация:\n';
          Object.entries(participant.registrationInfo).forEach(([key, value]) => {
            message += `  - ${key}: ${value}\n`;
          });
        }
        
        message += `📅 ${new Date(participant.registeredAt).toLocaleString()}\n\n`;
      }
      
      await ctx.reply(message);
    }
    
    // Offer export option
    await ctx.reply(
      'Выберите формат для экспорта:',
      {
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('Текстовый файл', `export_txt_${contestId}`),
            Markup.button.callback('CSV', `export_csv_${contestId}`)
          ]
        ])
      }
    );
  } else {
    await ctx.reply('Конкурс не найден.');
  }
});

// Command to modify contest buttons after publication
bot.command('edit_buttons', async (ctx) => {
  if (!isAdmin(ctx)) {
    return ctx.reply('Эта команда доступна только администратору.');
  }
  
  const args = ctx.message.text.split(' ');
  if (args.length < 2) {
    return ctx.reply('Использование: /edit_buttons [ID конкурса]');
  }
  
  const contestId = args[1];
  
  if (contests.has(contestId)) {
    const contest = contests.get(contestId);
    
    let buttonList = '';
    contest.buttons.forEach((button, index) => {
      buttonList += `${index + 1}. "${button.text}" (${button.callback_data})\n`;
    });
    
    await ctx.reply(
      `Текущие кнопки:\n${buttonList}\n\nВыберите действие:`,
      {
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('Добавить кнопку', `add_button_${contestId}`),
            Markup.button.callback('Удалить кнопку', `remove_button_${contestId}`)
          ],
          [
            Markup.button.callback('Изменить текст', `edit_text_contest_${contestId}`),
            Markup.button.callback('Изменить callback', `edit_callback_contest_${contestId}`)
          ]
        ])
      }
    );
  } else {
    await ctx.reply('Конкурс не найден.');
  }
});

// Error handling
bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}:`, err);
});

// Start the bot
bot.launch()
  .then(() => console.log('Bot started successfully!'))
  .catch(err => console.error('Failed to start bot:', err));

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

// For Vercel serverless deployment
module.exports = async (req, res) => {
  try {
    await bot.handleUpdate(req.body);
    res.status(200).end();
  } catch (error) {
    console.error('Error in webhook handler:', error);
    res.status(500).end();
  }
}; 