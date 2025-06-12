const { config } = require('./src/config/env');

module.exports = {
  client: 'pg',
  connection: config.DATABASE_URL,
  migrations: {
    tableName: 'knex_migrations',
    directory: './migrations'
  }
};
