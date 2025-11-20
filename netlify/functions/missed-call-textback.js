// netlify/functions/missed-call-textback.js

const twilio = require("twilio");
const querystring = require("querystring");

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  BASE_URL
} = process.env;

const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

// Add the Twilio number you're using:
const CLIENTS = {
  "+18665517715": {
    name: "Demo Contractor",
    forwardTo: "+1YOUR_REAL_CELL",  // <-- we will update this later
    textTemplate:
      "Hey, sorry we missed your call. Reply here and we'll text you back ASAP!"
  }
};

exports.handler = async (event) => {
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const params = querystring.parse(event.body || "");

  const from = params.From;
  const to = params.To;
  const dialStatus = params.DialCallStatus;

  const clientConfig = CLIENTS[to];

  // callback after dial
  if (dialStatus) {
    const missed =
      ["no-answer", "busy", "failed"].includes(dialStatus) &&
      from &&
      to &&
      clientConfig;

    if (missed) {
      try {
        await client.messages.create({
          to: from,
          from: to,
          body: clientConfig.textTemplate
        });
        console.log("Missed-call SMS sent!");
      } catch (e) {
        console.error("Failed to send SMS:", e);
      }
    }

    return { statusCode: 200, body: "" };
  }

  // incoming call
  const twiml = new VoiceResponse();

  if (!clientConfig) {
    twiml.say("This number is not configured.");
  } else {
    const dial = twiml.dial({
      callerId: to,
      action: `${BASE_URL}/.netlify/functions/missed-call-textback`,
      method: "POST",
      timeout: 20
    });

    dial.number(clientConfig.forwardTo);
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "text/xml" },
    body: twiml.toString()
  };
};
