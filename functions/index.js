const functions = require("firebase-functions");
const request = require("request-promise");
const token = "Ow/nDECGrRMCiyAWAeci3Nh16bC/ZibMNI3cuxkQGJWfzZ8o7xDao7AnRX7dml0912eXbqsU/blXQTGPOl2qthjRMlMcb96CUrocoL5trIWk99DCDK6EPyDgaKbG86oEuWFV8Y8qiYdM+J7rzw6R2AdB04t89/1O/w1cDnyilFU="
const LINE_MESSAGING_API = "https://api.line.me/v2/bot/message/reply";
 
const LINE_HEADER = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${token}`,
};
exports.LineBotReply = functions.https.onRequest((req, res) => {
  if (req.method === "POST") {
    reply(req.body);
  } else {
    return res.status(200).send("Done");
  }
});

const reply = (bodyResponse) => {
  return request({
    method: "POST",
    uri: LINE_MESSAGING_API,
    headers: LINE_HEADER,
    body: JSON.stringify({
      replyToken: bodyResponse.events[0].replyToken,
      messages: [{
        type: "text",
        text: JSON.stringify(bodyResponse),
      }],
    }),
  });
};
