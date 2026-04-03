const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

const io = new Server(server, {
  cors: { origin: "*" }
});

let rooms = {};

io.on("connection", (socket) => {

  let room = null;

  socket.on("join", (roomId) => {
    room = roomId;
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

  socket.on("play", (time) => {
    if (!room) return;
    rooms[room].isPlaying = true;
    rooms[room].time = time;

    socket.to(room).emit("play", time);
  });

  socket.on("pause", (time) => {
    if (!room) return;
    rooms[room].isPlaying = false;
    rooms[room].time = time;

    socket.to(room).emit("pause", time);
  });

  socket.on("load", (url) => {
    if (!room) return;

    rooms[room].url = url;
    rooms[room].time = 0;

    io.to(room).emit("load", url);
  });

});

app.get("/", (req, res) => {
  res.send("Servidor rodando");
});

server.listen(3000, () => {
  console.log("🔥 Servidor rodando na porta 3000");
});
