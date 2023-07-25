const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

const onlineUsers = new Set();

io.on('connection', (socket) => {
  let nickname;

  // Notify all connected clients when a new user joins
  socket.broadcast.emit('user connected', 'A new user has joined the chat.');

  socket.on('set nickname', (name) => {
    nickname = name;

    // Add user to the onlineUsers set when they connect
    onlineUsers.add(socket.id);

    // Broadcast the list of online users to all clients
    io.emit('online users', Array.from(onlineUsers));
  });

  socket.on('disconnect', () => {
    // Remove user from onlineUsers set when they disconnect
    onlineUsers.delete(socket.id);

    // Broadcast the updated list of online users to all clients
    io.emit('online users', Array.from(onlineUsers));

    // Notify all connected clients when a user leaves
    socket.broadcast.emit('user disconnected', 'A user has left the chat.');
  });

  socket.on('chat message', (msg) => {
    // Don't send the same message to the user that sent it
    socket.broadcast.emit('chat message', { nickname, message: msg });
  });

  let typing = false;

  socket.on('typing', () => {
    if (!typing) {
      typing = true;
      socket.broadcast.emit('user typing', nickname);
    }
  });

  socket.on('stop typing', () => {
    if (typing) {
      typing = false;
      socket.broadcast.emit('user stopped typing');
    }
  });

  socket.on('private message', ({ recipientId, message }) => {
    socket.to(recipientId).emit('private message', { sender: nickname, message });
  });
});

http.listen(port, () => {
  console.log(`Socket.IO server running at http://localhost:${port}/`);
});
