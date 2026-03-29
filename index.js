const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const ytdl = require("ytdl-core");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(express.static("public"));

let rooms = {};

function createRoom() {
  return Math.random().toString(36).substring(2, 7);
}

/* 🔥 AUDIO STREAM */
app.get("/audio", async (req, res) => {
  try {
    const url = req.query.url;

    if (!ytdl.validateURL(url)) {
      return res.status(400).send("URL inválida");
    }

    const info = await ytdl.getInfo(url);
    const format = ytdl.chooseFormat(info.formats, {
      quality: "highestaudio",
      filter: "audioonly"
    });

    res.setHeader("Content-Type", format.mimeType);

    ytdl(url, {
      format: format,
      highWaterMark: 1 << 25
    }).pipe(res);

  } catch (err) {
    console.error(err);
    res.status(500).send("Erro no áudio");
  }
});

/* 🔥 SOCKET */
io.on("connection", (socket) => {

  let currentRoom = null;

  socket.on("create-room", () => {
    socket.emit("room-created", createRoom());
  });

  socket.on("join-room", (roomId) => {

    if (!rooms[roomId]) {
      rooms[roomId] = {
        id: null,
        queue: []
      };
    }

    currentRoom = roomId;
    socket.join(roomId);

    socket.emit("queue", rooms[roomId].queue);
  });

  socket.on("load", (data) => {
    if (!currentRoom) return;

    rooms[currentRoom].id = data.id;
    io.to(currentRoom).emit("load", data);
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
      room.id = next.id;

      io.to(currentRoom).emit("load", next);
      io.to(currentRoom).emit("queue", room.queue);
    }
  });

  socket.on("play", (time) => {
    socket.to(currentRoom).emit("play", time);
  });

  socket.on("pause", (time) => {
    socket.to(currentRoom).emit("pause", time);
  });

  socket.on("chat-message", (data) => {
    io.to(currentRoom).emit("chat-message", data);
  });

});

server.listen(3000, () => {
  console.log("🔥 servidor rodando");
});
