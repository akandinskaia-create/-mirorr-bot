const TelegramBot = require('node-telegram-bot-api');
const Anthropic = require('@anthropic-ai/sdk');
const express = require('express');

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_KEY });
const app = express();

app.get('/', (req, res) => res.send('Mirorr bot is running!'));
app.listen(process.env.PORT || 3000);

console.log('Mirorr bot started...');

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, 
    `✦ Welcome to *Mirorr*\n\n_Your brain, organised._\n\nJust send me anything:\n\n• A job you want to apply for\n• A product you want to buy\n• A book to read\n• A course or certification\n• A dream, a goal, an idea\n• Anything on your mind\n\nI will organise it into your life plan automatically.`,
    { parse_mode: 'Markdown' }
  );
});

bot.on('message', async (msg) => {
  if (msg.text && msg.text.startsWith('/')) return;
  
  const chatId = msg.chat.id;
  const input = msg.text || '';

  if (!input) {
    bot.sendMessage(chatId, 'Please send me text — a product, job, idea, goal, anything!');
    return;
  }

  bot.sendMessage(chatId, '✦ Thinking...');

  try {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `You are Mirorr, an intelligent personal life planner. The user sent you this:

"${input}"

This could be anything: a job, product, book, goal, course, dream, idea, link, or life intention.

Respond ONLY with valid JSON, no markdown:
{
  "title": "clear short title, max 7 words",
  "category": "invent the most fitting life category name",
  "description": "one warm personal sentence about what this is, max 20 words",
  "nextStep": "the single most useful first step, max 15 words",
  "timeframe": "realistic timeframe: today, this week, this month, 3 months, 1 year, ongoing",
  "emoji": "one perfect emoji",
  "tags": ["tag1", "tag2", "tag3"]
}`
      }]
    });

    const text = response.content[0].text;
    const info = JSON.parse(text.replace(/```json|```/g, '').trim());

    const message = 
      `${info.emoji} *${info.title}*\n` +
      `📂 ${info.category}\n\n` +
      `${info.description}\n\n` +
      `👣 *Next step:* ${info.nextStep}\n` +
      `⏱ ${info.timeframe}\n\n` +
      `🏷 ${info.tags.map(t => `#${t}`).join(' ')}`;

    await bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: '📋 Planning', callback_data: `status_planning_${Date.now()}` },
          { text: '🔄 Doing', callback_data: `status_doing_${Date.now()}` },
          { text: '✅ Done', callback_data: `status_done_${Date.now()}` }
        ]]
      }
    });

  } catch (err) {
    console.error(err);
    bot.sendMessage(chatId, '⚠ Could not analyse that. Please try again or rephrase.');
  }
});

bot.on('callback_query', (query) => {
  const status = query.data.split('_')[1];
  const labels = { planning: '📋 Added to Planning', doing: '🔄 Marked as Doing', done: '✅ Marked as Done' };
  bot.answerCallbackQuery(query.id, { text: labels[status] || 'Updated!' });
});
