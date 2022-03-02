const functions = require("firebase-functions");
const admin = require("firebase-admin");
const request = require("request-promise");
const http = require("http");
const path = require("path");
const os = require("os");
const wavedraw = require("wavedraw");
const toWav = require("audiobuffer-to-wav");
const AudioContext = require("web-audio-api").AudioContext;
const audioContext = new AudioContext();
const fs = require("fs");

admin.initializeApp();

const token =
  "Ow/nDECGrRMCiyAWAeci3Nh16bC/ZibMNI3cuxkQGJWfzZ8o7xDao7AnRX7dml0912eXbqsU/blXQTGPOl2qthjRMlMcb96CUrocoL5trIWk99DCDK6EPyDgaKbG86oEuWFV8Y8qiYdM+J7rzw6R2AdB04t89/1O/w1cDnyilFU=";
const LINE_MESSAGING_API = "https://api.line.me/v2/bot/message/reply";
const wavefile = require("wavefile");
const { database } = require("firebase-functions/v1/firestore");
const LINE_HEADER = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
};

const LINE_HEADER_AUDIO = {
  Authorization: `Bearer ${token}`,
};

exports.LineBotReply = functions.https.onRequest(async (req, res) => {
  const type = req.body.events[0].message.type;
  const messageId = req.body.events[0].message.id;
  if (type === "audio") {
    const contentUri = `https://api-data.line.me/v2/bot/message/${messageId}/content`;
    const contentBuffer = await request(contentUri, {
      method: "GET",
      headers: LINE_HEADER_AUDIO,
      encoding: null,
    });

    let timestamp = req.body.events[0].timestamp
    const filename = `${timestamp}.m4a`;
    let tempLocalFile = path.join("./temp", filename);
    await fs.writeFileSync(tempLocalFile, contentBuffer);
    const filenamewav = `${timestamp}.wav`;
    let tempLocalFileWav = path.join("./temp", filenamewav);
    const resp = await fs.readFileSync(tempLocalFile);
    audioContext.decodeAudioData(resp, async (buffer) => {
      const wav = toWav(buffer);
      await fs.writeFileSync(tempLocalFileWav, new Buffer(wav));
      await waveDraw(`./temp/${timestamp}.wav`, `${timestamp}`);
    });

    const db = admin.database();
    await db.ref("/prediction/All").transaction((current_val) => {
      return (current_val || 0) + 1;
    });
    await clearTemp(filenamewav,filename,`wave${timestamp}.png`)
    return res.status(200).end();
  }

  return res.status(400).end();
});

const waveDraw = (path, filename) => {
  const wd = new wavedraw(path);
  const options = {
    width: 300,
    height: 150,
    rms: true,
    maximums: true,
    average: false,
    start: "START",
    end: "END",
    colors: {
      maximums: "#0000ff",
      rms: "#659df7",
      background: "#ffffff",
    },
    filename: `./temp/wave${filename}.png`,
  };
  return wd.drawWave(options);
};


const clearTemp = (wav,m4a,png)=>{
  fs.unlinkSync(`./temp/${wav}`)
  fs.unlinkSync(`./temp/${m4a}`)
  fs.unlinkSync(`./temp/${png}`)
}

// const reply = (bodyResponse) => {
//   return request({
//     method: "POST",
//     uri: LINE_MESSAGING_API,
//     headers: LINE_HEADER,
//     body: JSON.stringify({
//       replyToken: bodyResponse.events[0].replyToken,
//       messages: [
//         {
//           type: "text",
//           text: JSON.stringify(bodyResponse),
//         },
//       ],
//     }),
//   });
// };
