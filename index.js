app.get("/audio", async (req, res) => {
  try {
    const url = req.query.url;

    if (!ytdl.validateURL(url)) {
      return res.status(400).send("URL inválida");
    }

    const stream = ytdl(url, {
      filter: "audioonly",
      quality: "highestaudio",
      highWaterMark: 1 << 25
    });

    res.setHeader("Content-Type", "audio/mp4");

    stream.pipe(res);

  } catch (err) {
    console.error(err);
    res.status(500).send("Erro");
  }
});
