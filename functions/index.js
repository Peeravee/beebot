const functions = require("firebase-functions");
const request = require("request-promise");
const http = require("http");
const path = require("path");
const os = require("os");
const wavedraw = require('wavedraw');


const token =
  "Ow/nDECGrRMCiyAWAeci3Nh16bC/ZibMNI3cuxkQGJWfzZ8o7xDao7AnRX7dml0912eXbqsU/blXQTGPOl2qthjRMlMcb96CUrocoL5trIWk99DCDK6EPyDgaKbG86oEuWFV8Y8qiYdM+J7rzw6R2AdB04t89/1O/w1cDnyilFU=";
const LINE_MESSAGING_API = "https://api.line.me/v2/bot/message/reply";
const fs = require("fs");
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
    const contentUri = ` https://api-data.line.me/v2/bot/message/${messageId}/content`;
    const audio = await request(contentUri, {
      method: "GET",
      headers: LINE_HEADER_AUDIO,
      encoding: null
    });


    const buffer = await new Uint16Array(audio)

    console.log(buffer)
    const filename = `${req.body.events[0].timestamp}.wav`;
    let tempLocalFile = path.join(os.tmpdir(), filename);
    await fs.writeFileSync(tempLocalFile, buffer);

    await wave(tempLocalFile)


  }
  
  return res.status(200);

});


const wave =  (path) => {
  const wd = new wavedraw(path);
  const options = {
    width: 600,
    height: 300,
    rms: true,
    maximums: true,
    average: false,
    start: 'START',
    end: 'END',
    colors: {
      maximums: '#0000ff',
      rms: '#659df7',
      background: '#ffffff'
    },
    filename: 'example1.png'
  };
  return wd.drawWave(options)
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
