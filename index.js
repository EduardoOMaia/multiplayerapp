const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// ⚠️ IMPORTANTE: permitir conexões externas
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

app.use(express.static("public"));

let rooms = {};

function createRoom() {
  return Math.random().toString(36).substring(2, 7);
}

io.on("connection", (socket) => {
  console.log("🔌 Conectado:", socket.id);

  let currentRoom = null;

  socket.on("join-room", (roomId) => {
    if (!rooms[roomId]) {
      rooms[roomId] = {
        id: null,
        time: 0,
        isPlaying: false,
        queue: []
      };
    }

    currentRoom = roomId;
    socket.join(roomId);

    console.log("👥 Entrou na sala:", roomId);

    socket.emit("sync", rooms[roomId]);
  });

  socket.on("create-room", () => {
    const roomId = createRoom();
    socket.emit("room-created", roomId);
  });

  socket.on("load", (data) => {
    if (!currentRoom) return;

    rooms[currentRoom] = {
      ...rooms[currentRoom],
      ...data,
      time: 0
    };

    io.to(currentRoom).emit("load", rooms[currentRoom]);
  });

  socket.on("add-queue", (video) => {
    if (!currentRoom) return;

    rooms[currentRoom].queue.push(video);
    io.to(currentRoom).emit("queue", rooms[currentRoom].queue);
  });

  socket.on("next", () => {
    if (!currentRoom) return;

    const room = rooms[currentRoom];

    if (room.queue.length > 0) {
      const next = room.queue.shift();

      rooms[currentRoom] = {
        ...room,
        ...next,
        time: 0
      };

      io.to(currentRoom).emit("load", rooms[currentRoom]);
      io.to(currentRoom).emit("queue", rooms[currentRoom].queue);
    }
  });

  socket.on("play", (time) => {
    if (!currentRoom) return;

    rooms[currentRoom].isPlaying = true;
    rooms[currentRoom].time = time;

    io.to(currentRoom).emit("play", time);
  });

  socket.on("pause", (time) => {
    if (!currentRoom) return;

    rooms[currentRoom].isPlaying = false;
    rooms[currentRoom].time = time;

    io.to(currentRoom).emit("pause", time);
  });

  socket.on("seek", (time) => {
    if (!currentRoom) return;

    rooms[currentRoom].time = time;
    socket.to(currentRoom).emit("seek", time);
  });

  socket.on("chat-message", (data) => {
    if (!currentRoom) return;
    io.to(currentRoom).emit("chat-message", data);
  });
});

// 🔥 ESSENCIAL PRA CELULAR FUNCIONAR
server.listen(3000, "0.0.0.0", () => {
  console.log("🔥 Servidor rodando na porta 3000");
});