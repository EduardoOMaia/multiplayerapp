const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);

// 🔥 PORTA CORRETA PARA RENDER
const PORT = process.env.PORT || 3000;

// 🔥 CORS
app.use(cors());
app.use(express.json());

// 🔥 SERVIR FRONTEND (IMPORTANTE)
app.use(express.static("public"));

// 🔥 SOCKET.IO
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

// 🔥 ESTADO DAS SALAS
let rooms = {};

// 🔥 SOCKET PRINCIPAL
io.on("connection", (socket) => {

  let currentRoom = null;

  // ENTRAR NA SALA
  socket.on("join", (roomId) => {
    currentRoom = roomId;
    socket.join(roomId);

    if (!rooms[roomId]) {
      rooms[roomId] = {
        url: "",
        isPlaying: false,
        time: 0
      };
    }

    socket.emit("sync", rooms[roomId]);
  });

  // CARREGAR MÍDIA
  socket.on("load", (url) => {
    if (!currentRoom) return;

    rooms[currentRoom].url = url;
    rooms[currentRoom].time = 0;

    io.to(currentRoom).emit("load", url);
  });

  // PLAY
  socket.on("play", (time) => {
    if (!currentRoom) return;

    rooms[currentRoom].isPlaying = true;
    rooms[currentRoom].time = time;

    socket.to(currentRoom).emit("play", time);
  });

  // PAUSE
  socket.on("pause", (time) => {
    if (!currentRoom) return;

    rooms[currentRoom].isPlaying = false;
    rooms[currentRoom].time = time;

    socket.to(currentRoom).emit("pause", time);
  });

  // DESCONECTAR
  socket.on("disconnect", () => {
    // opcional: limpar sala depois
  });

});

// 🔥 START SERVER
server.listen(PORT, () => {
  console.log("🔥 Servidor rodando na porta", PORT);
});
