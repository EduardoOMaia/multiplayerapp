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

// 🔥 API PRA EXTRAIR ÁUDIO
app.get("/audio", async (req, res) => {
  try {
    const url = req.query.url;

    if (!ytdl.validateURL(url)) {
      return res.status(400).send("URL inválida");
    }

    res.header("Content-Type", "audio/mp4");

    ytdl(url, {
      filter: "audioonly",
      quality: "highestaudio"
    }).pipe(res);

  } catch (err) {
    res.status(500).send("Erro ao extrair áudio");
  }
});

io.on("connection", (socket) => {

  let currentRoom = null;

  socket.on("join-room", (roomId) => {
    if (!rooms[roomId]) {
      rooms[roomId] = {
        id: null,
        queue: []
      };
    }

    currentRoom = roomId;
    socket.join(roomId);
  });

  socket.on("create-room", () => {
    socket.emit("room-created", createRoom());
  });

  socket.on("load", (data) => {
    if (!currentRoom) return;

    rooms[currentRoom].id = data.id;

    io.to(currentRoom).emit("load", data);
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

  socket.on("add-queue", (video) => {
    if (!currentRoom) return;

    rooms[currentRoom].queue.push(video);
    io.to(currentRoom).emit("queue", rooms[currentRoom].queue);
  });

});

server.listen(3000, () => {
  console.log("🔥 servidor rodando");
});
