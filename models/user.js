const Sequelize = require('sequelize');
const sequelize = require('../util/database');
const Track = require('./tracks');

const User = sequelize.define('users', {
  userid: {
    type: Sequelize.INTEGER,
    allowNull: false,
    primaryKey: true
  },
  firstname: Sequelize.TEXT,
  username: Sequelize.TEXT,
  track: Sequelize.TEXT,
  operation: Sequelize.TEXT
});

User.hasMany(Track, { foreignKey: 'userid' });
Track.belongsTo(User, { foreignKey: 'userid' });

module.exports = User;

