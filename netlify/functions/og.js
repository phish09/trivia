const { createCanvas } = require("canvas");

exports.handler = async (event) => {
  const code = event.queryStringParameters?.code || "????";

  const width = 1200;
  const height = 630;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, width, height);

  // Text
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.font = "bold 64px sans-serif";
  ctx.fillText("Join Game", width / 2, 220);

  ctx.font = "bold 140px sans-serif";
  ctx.fillText(code, width / 2, 380);

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
    body: canvas.toBuffer("image/png").toString("base64"),
    isBase64Encoded: true,
  };
};
