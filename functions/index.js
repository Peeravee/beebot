/* eslint-disable max-len */
/* eslint-disable camelcase */
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const request = require("request-promise");
const path = require("path");
const wavedraw = require("wavedraw");
const toWav = require("audiobuffer-to-wav");
const AudioContext = require("web-audio-api").AudioContext;
const audioContext = new AudioContext();
const fs = require("fs");
const tf = require("@tensorflow/tfjs");
const tfnode = require("@tensorflow/tfjs-node");

admin.initializeApp();
// const runtimeOpts = {
//   timeoutSeconds: 180,
//   memory: "1GB",
// };

const token = `Ow/nDECGrRMCiyAWAeci3Nh16bC/ZibMNI3cuxkQGJWfzZ8o7x
Dao7AnRX7dml0912eXbqsU/blXQTGPOl2qth
jRMlMcb96CUrocoL5trIWk99DCDK6EPyDgaKbG86oEuWFV8Y8q
iYdM+J7rzw6R2AdB04t89/1O/w1cDnyilFU=`;
// const LINE_MESSAGING_API = "https://api.line.me/v2/bot/message/reply";
// const LINE_HEADER = {
//   "Content-Type": "application/json",
//   Authorization: `Bearer ${token}`,
// };
const LINE_CONTENT_API_PRE = "https://api-data.line.me/v2/bot/message/";
const LINE_CONTENT_API_SUF = "/content";
const LINE_HEADER_AUDIO = {
  Authorization: `Bearer ${token}`,
};

const getContent = async (messageId) => {
  const LINE_CONTENT_API = LINE_CONTENT_API_PRE + messageId + LINE_CONTENT_API_SUF;
  const contentBuffer = await request(LINE_CONTENT_API, {
    method: "GET",
    headers: LINE_HEADER_AUDIO,
    encoding: null,
  });

  return await contentBuffer;
};
exports.LineBotReply = functions.region("asia-southeast1").https
    .onRequest(async (req, res) => {
      const messageId = req.body.events[0].message.id;
      const sendfrom = req.body.destination;
      if (req.body.events[0].message.type === "audio") {
        const contentBuffer = await getContent(messageId);
        console.log(contentBuffer);

        const timestamp = req.body.events[0].timestamp;
        const filename = `${timestamp}.m4a`;
        const tempLocalFile = path.join("./temp", filename);
        await fs.writeFileSync(tempLocalFile, contentBuffer);
        const filenamewav = `${timestamp}.wav`;
        const tempLocalFileWav = path.join("./temp", filenamewav);
        const resp = await fs.readFileSync(tempLocalFile);
        await audioContext.decodeAudioData(resp, async (buffer) => {
          const wav = toWav(buffer);
          await fs.writeFileSync(tempLocalFileWav, new Buffer(wav));
          await waveDraw(`./temp/${timestamp}.wav`, `${timestamp}`);
          const pred = await predict(`./temp/wave${timestamp}.png`);
          await clearTemp(filenamewav, filename, `wave${timestamp}.png`);
          await increaseTransaction(pred[0].className);
          await logPush(pred[0].className, pred[0].probability, sendfrom);
          return res.status(200).end();
        });

        const db = admin.database();
        await db.ref("/prediction/All").transaction((current_val) => {
          return (current_val || 0) + 1;
        });
      }
    });

const waveDraw = (path, filename) => {
  // eslint-disable-next-line new-cap
  const wd = new wavedraw(path);
  const options = {
    width: 300,
    height: 300,
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

const clearTemp = (wav, m4a, png) => {
  fs.unlinkSync(`./temp/${wav}`);
  fs.unlinkSync(`./temp/${m4a}`);
  fs.unlinkSync(`./temp/${png}`);
};

const predict = async (img) => {
  const label = ["Bad", "Enemy", "Good", "Mite", "Pollen", "Queen"];
  const handler = tfnode.io.fileSystem("./model/model.json");
  const model = await tf.loadGraphModel(handler);
  await console.log("model is loaded!!!");
  const imgData = fs.readFileSync(img, Uint8Array);
  const tensor = await tfnode.node
      .decodePng(imgData, 3)
      .cast("float32")
      .resizeNearestNeighbor([300, 300])
      .expandDims()
      .toFloat();
  const pred = await model.predict(tensor).data();

  const predict = Array.from(pred)
      .map(function(p, i) {
        // this is Array.map
        return {
          probability: p,
          className: label[i], // we are selecting the value from the obj
        };
      })
      .sort(function(a, b) {
        return b.probability - a.probability;
      })
      .slice(0, 6);
  console.log(predict);
  return predict;
};

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

const increaseTransaction = async (classname) => {
  const db = admin.database();
  await db.ref("/prediction/All").transaction((current_val) => {
    return (current_val || 0) + 1;
  });
  await db.ref(`/prediction/${classname}`).transaction((current_val) => {
    return (current_val || 0) + 1;
  });
};

const logPush = async (className, probability, sendfrom) => {
  const db = admin.database();
  await db.ref("/log").push({
    class: className,
    date: new Date().toLocaleString("en-GB", {
      timeZone: "Asia/Jakarta",
    }),
    probability: probability.toFixed(2),
    sendfrom: sendfrom,
  });
};
