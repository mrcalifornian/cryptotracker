const Sequelize = require("sequelize");
require('dotenv').config();

const sequelize = new Sequelize(process.env.DATABASE, 'postgres', process.env.PASSWORD, {
    dialect: 'postgresql',
    host: process.env.HOST,
    port: '7710',
    logging: false
});

module.exports = sequelize;