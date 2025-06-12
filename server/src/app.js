const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const createRidesModule = require('./rides');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

io.on('connection', (socket) => {
  socket.on('join_drivers', () => {
    socket.join('drivers');
  });
});

const { router: ridesRouter, scheduleReminders, pool } = createRidesModule(io);
app.use('/rides', ridesRouter);

module.exports = { app, server, scheduleReminders, pool };
