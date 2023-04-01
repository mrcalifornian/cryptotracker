const { Telegraf, Context } = require('telegraf');
const axios = require('axios');
const User = require('./models/user');
const Tracks = require('./models/tracks');
const sequelize = require('./util/database');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);


const commands = [
    { command: '/start', description: 'Запустить бота' },
    { command: '/help', description: 'Получить помощь с ботом' },
    { command: '/track', description: 'Установить трекер для валюты' },
    { command: '/check', description: 'Узнать актуальную цену на...' },
    { command: '/mytracks', description: 'Список всех ваших треков' },
    { command: '/delete', description: 'Удалить трекер' }
];

bot.telegram.setMyCommands(commands);

let cryptocurrencies = ["BTC", "BCH", "ETH", "LTC", "DOT"];

let notify = () => {
    console.log('Tracking started!');
    let getCurrentRate = async (crypto) => {
        const response = await axios.get(`${process.env.COINBASE}/v2/prices/${crypto}-USD/spot`);
        return response.data.data.amount;
    }

    setInterval(async () => {
        for (let crp of cryptocurrencies) {
            let rate = await getCurrentRate(crp);
            rate = parseFloat(rate);
            console.log(crp, rate,);
            let tracks = await Tracks.findAll({ where: { from: crp } });
            for (let track of tracks) {
                if (tracks.length > 0) {
                    if (rate >= track.when) {
                        bot.telegram.sendMessage(track.userid, `🟢 ${track.from} поднялся выше $ ${track.when}\nТекущая цена $ ${rate}`);
                        await track.destroy();
                    }
                }
            }
        }
    }, 5000);
}

bot.start(async ctx => {
    try {
        let botUser = ctx.message.from;

        let user = await User.findOne({ where: { userid: botUser.id } });
        if (!user) {

            let newUser = await User.create({
                userid: botUser.id,
                firstname: botUser.first_name,
                username: botUser.username || '',
                track: ''
            });

            await newUser.save();
            ctx.telegram.sendMessage(ctx.message.from.id, `👋 Привет, ${botUser.first_name}. Добро пожаловать в наш бот. Этот бот помогает вам получать уведомления об отслеживании цены криптовалюты.`);

        } else {
            ctx.reply(`👋 Привет, ${user.firstname}, ты готов установить трекеры? \nПросто /track`);
        }
    } catch (error) {
        console.log(error);
    }
});

bot.help(ctx => {
    ctx.reply(`Бот поможет вам установить уведомления для криптовалют, когда они превышают цену (в долларах США), которую вы им установили.
- Вы можете иметь только один трек для одной криптовалюты одновременно
- При указании цены запятая (456,01) не ставится! Пишите как 456.01`)
});

bot.command('track', async (ctx) => {
    try {
        let botUser = ctx.message.from;
        let user = await User.findOne({ where: { userid: botUser.id } });
        user.operation = 'track';
        await user.save();
        ctx.reply('Что вы хотите отслеживать? 🤔', {
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'BTC', callback_data: "BTC" }, { text: 'ETH', callback_data: "ETH" }, { text: 'DOT', callback_data: "DOT" }],
                    [{ text: "LTC", callback_data: "LTC" }, { text: 'BCH', callback_data: "BCH" }]
                ]
            }
        });
    } catch (error) {
        console.log(error);
    }
});

bot.command('check', async (ctx) => {
    try {
        let botUser = ctx.message.from;
        let user = await User.findOne({ where: { userid: botUser.id } });
        user.operation = 'check';
        await user.save();
        ctx.reply('Цену какой криптовалюты вы хотите увидеть?', {
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'BTC', callback_data: "BTC" }, { text: 'ETH', callback_data: "ETH" }, { text: 'DOT', callback_data: "DOT" }],
                    [{ text: "LTC", callback_data: "LTC" }, { text: 'BCH', callback_data: "BCH" }]
                ]
            }
        });
    } catch (error) {
        console.log(error);
    }
});

bot.command('mytracks', async ctx => {
    try {
        let botUser = ctx.message.from;

        let tracks = await Tracks.findAll({ where: { userid: botUser.id } });
        if (tracks.length < 1) {
            ctx.reply('У вас нет активных треков!\nУстановите один с помощью команды /track!');
        } else {
            let msg = 'Ваши активные треки:\n\n';
            for (let track of tracks) {
                msg += `${track.from} на $ ${track.when}\n`;
            }

            ctx.reply(msg);
        }

    } catch (error) {
        console.log(error);
    }
});

bot.command('delete', async ctx => {
    try {
        let botUser = ctx.message.from;
        let user = await User.findOne({ where: { userid: botUser.id } });
        user.operation = 'delete';
        await user.save();
        ctx.reply('Какой из треков вы хотите удалить? 🤔', {
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'BTC', callback_data: "BTC" }, { text: 'ETH', callback_data: "ETH" }, { text: 'DOT', callback_data: "DOT" }],
                    [{ text: "LTC", callback_data: "LTC" }, { text: 'BCH', callback_data: "BCH" }]
                ]
            }
        });
    } catch (error) {
        console.log(error);
    }
});

bot.on('text', async ctx => {
    try {
        let botUser = ctx.message.from;
        let text = ctx.update.message.text;

        let user = await User.findOne({ where: { userid: botUser.id } });
        if (user.track !== '') {
            text = parseFloat(text);
            let track = await Tracks.findOne({ where: { userid: botUser.id, from: user.track } });
            if (!track) {
                let newTrack = await Tracks.create({
                    userid: botUser.id,
                    from: user.track,
                    to: 'USD',
                    when: text
                });

                text = await newTrack.save();
            } else {
                track.when = text;
                text = await track.save();
            }
            ctx.reply(`✅ Ваш уведомитель настроен \nна ${text.from} на $ ${text.when}`);
        }

        user.track = '';
        await user.save();

    } catch (error) {
        console.log(error);
    }
});

bot.on('callback_query', async ctx => {
    try {
        let botUser = ctx.callbackQuery.from;
        let currency = ctx.update.callback_query.data;
        let user = await User.findOne({ where: { userid: botUser.id } });

        ctx.deleteMessage(ctx.update.callback_query.message.message_id);
        switch (user.operation) {
            case 'track':
                user.track = currency;
                await user.save();
                ctx.reply(`Когда мы должны сообщить вам? \nВведите цену ${currency}`);
                break;
            case 'delete':
                let track = await Tracks.findOne({ where: { userid: botUser.id, from: currency } });
                if (track) {
                    ctx.reply(`🗑 Ваш трек для ${track.from} на $ ${track.when} удален!`);
                    await track.destroy();
                } else {
                    ctx.reply(`Ваш трек для ${currency} не найден!`);
                }
                break;
            case 'check':
                const response = await axios.get(`${process.env.COINBASE}/v2/prices/${currency}-USD/spot`);
                let price = response.data.data.amount;
                ctx.reply(`Текущая цена ${currency} -  $ ${price}`)


        }

        user.operation = '';
        await user.save();
    } catch (error) {
        console.log(error);
    }


})

sequelize.sync()
    .then((result) => {
        console.log('DB Connected');
        bot.launch();
        console.log("Bot's runing!");
        notify();
    }).catch((err) => {
        console.log(err);
    });