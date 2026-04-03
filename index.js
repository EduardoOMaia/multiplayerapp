const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const io = new Server(server, {
  cors: { origin: "*" }
});

let rooms = {};

function createRoom() {
  return Math.random().toString(36).substring(2, 7);
}

io.on("connection", (socket) => {

  let currentRoom = null;

  socket.on("create-room", () => {
    const id = createRoom();
    socket.emit("room-created", id);
  });

  socket.on("join-room", (roomId) => {

    if (!rooms[roomId]) {
      rooms[roomId] = {
        type: "video",
        id: null,
        queue: [],
        isPlaying: false,
        time: 0
      };
    }

    currentRoom = roomId;
    socket.join(roomId);

    socket.emit("sync", rooms[roomId]);
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

  socket.on("play", (time) => {
    if (!currentRoom) return;
    rooms[currentRoom].isPlaying = true;
    io.to(currentRoom).emit("play", time);
  });

  socket.on("pause", (time) => {
    if (!currentRoom) return;
    rooms[currentRoom].isPlaying = false;
    io.to(currentRoom).emit("pause", time);
  });

  socket.on("seek", (time) => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit("seek", time);
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

  socket.on("chat-message", (msg) => {
    if (!currentRoom) return;
    io.to(currentRoom).emit("chat-message", msg);
  });

});

server.listen(PORT, () => {
  console.log("🔥 Rodando na porta", PORT);
});
