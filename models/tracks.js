const Sequelize = require('sequelize');
const sequelize = require('../util/database');
const User = require('./user');

const Track = sequelize.define('tracks', {
    userid: {
        type: Sequelize.INTEGER,
        allowNull: false,
    },
    from: Sequelize.TEXT,
    to: Sequelize.TEXT,
    when: {
        type: Sequelize.FLOAT,
        allowNull: false,
    }
});

module.exports = Track;

