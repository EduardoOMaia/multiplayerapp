const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
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

  let currentRoom = null;

  socket.on("join-room", (roomId) => {
    if (!rooms[roomId]) {
      rooms[roomId] = {
        type: "video",
        id: null,
        index: 0,
        queue: [],
        time: 0,
        isPlaying: false
      };
    }

    currentRoom = roomId;
    socket.join(roomId);

    socket.emit("sync", rooms[roomId]);
    io.to(roomId).emit("queue", rooms[roomId].queue);
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

  socket.on("playlist-next", () => {
    if (!currentRoom) return;
    io.to(currentRoom).emit("playlist-next");
  });

  socket.on("playlist-prev", () => {
    if (!currentRoom) return;
    io.to(currentRoom).emit("playlist-prev");
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
        type: next.type,
        id: next.id,
        index: next.index || 0,
        time: 0
      };

      io.to(currentRoom).emit("load", rooms[currentRoom]);
      io.to(currentRoom).emit("queue", rooms[currentRoom].queue);
    }
  });

  socket.on("play-from-queue", (i) => {
    if (!currentRoom) return;

    const room = rooms[currentRoom];
    const selected = room.queue[i];
    if (!selected) return;

    room.queue.splice(i, 1);

    rooms[currentRoom] = {
      ...room,
      type: selected.type,
      id: selected.id,
      index: selected.index || 0,
      time: 0
    };

    io.to(currentRoom).emit("load", rooms[currentRoom]);
    io.to(currentRoom).emit("queue", rooms[currentRoom].queue);
  });

  socket.on("remove-queue", (i) => {
    if (!currentRoom) return;

    rooms[currentRoom].queue.splice(i, 1);
    io.to(currentRoom).emit("queue", rooms[currentRoom].queue);
  });

  socket.on("play", (time) => {
    if (!currentRoom) return;
    io.to(currentRoom).emit("play", time);
  });

  socket.on("pause", (time) => {
    if (!currentRoom) return;
    io.to(currentRoom).emit("pause", time);
  });

  socket.on("seek", (time) => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit("seek", time);
  });

  socket.on("chat-message", (data) => {
    if (!currentRoom) return;
    io.to(currentRoom).emit("chat-message", data);
  });

});

server.listen(3000, () => {
  console.log("🔥 Servidor rodando na porta 3000");
});
