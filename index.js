require('dotenv').config();
const { server, scheduleReminders } = require('./server/src/app');

const port = process.env.PORT || 3000;

scheduleReminders();
server.listen(port, () => console.log(`Server running on port ${port}`));
