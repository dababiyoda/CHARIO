const { config } = require('./src/config/env');
const { server, scheduleReminders } = require('./server/src/app');

const port = config.PORT || 3000;

scheduleReminders();
server.listen(port, () => console.log(`Server running on port ${port}`));
