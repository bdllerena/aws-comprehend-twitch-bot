import tmi from 'tmi.js';
import { PARAM_TOKEN, PARAM_USERNAME, PARAM_CHANNEL } from './constant';
import * as AWS from "aws-sdk";

const ssm = new AWS.SSM(  { region: "us-east-1" } );
const comprehend = new AWS.Comprehend({ region: "us-east-1" });

const getParameter = async (secretName) => {
  const params = {
    Name: secretName, 
    WithDecryption: false
  };

  //Refactor this method to use getParameters, push values into an array
  const result = await ssm.getParameter(params).promise();
  return result.Parameter.Value;
};


const startBot = async function() {
  const token = await getParameter(PARAM_TOKEN).then((name) => {
    return name;
  });
  
  const user = await getParameter(PARAM_USERNAME).then((name) => {
    return name;
  });

  const channel = await getParameter(PARAM_CHANNEL).then((name) => {
    return name;
  });

  const options = {
    options: { debug: true },
    connection: {
      reconnect: true,
      secure: true,
      timeout: 180000,
      reconnectDecay: 1.4,
      reconnectInterval: 1000,
    },
    identity: {
      username: user,
      password: token
    },
    channels: [channel]
  }
  
  const client = new tmi.Client(options)
  
  client.connect()

  client.on('message', (channel, userState, message, self) => {
    if(self) {
      return
    }
  
    if (userState.username === user) {
      console.log(`Not checking bot's messages.`)
      return
    }
  
    if(message.toLowerCase() === '!hello') {
      hello(channel, userState)
      return
    }
  
    onMessageHandler(client,channel, userState, message, self)
  })

  // events
client.on('disconnected', (reason) => {
  onDisconnectedHandler(reason)
})

client.on('connected', (address, port) => {
  onConnectedHandler(address, port)
})


client.on('reconnect', () => {
  reconnectHandler()
})
}

// event handlers

function onMessageHandler (client, channel, userState, message) {
  checkTwitchChat(client, userState, message, channel)
}

function onDisconnectedHandler(reason) {
  console.log(`Disconnected: ${reason}`)
}

function onConnectedHandler(address, port) {
  console.log(`Connected: ${address}:${port}`)
}

function reconnectHandler () {
  console.log('Reconnecting...')
}

function checkTwitchChat(client, userState, message, channel) {
  console.log(message)
  comprehend.detectSentiment({LanguageCode: 'en',Text: message}, function(err, data) {
      if (err) console.log(err, err.stack); // an error occurred
        else {
            console.log(data.Sentiment)
            if (data.Sentiment === 'NEGATIVE') {
                console.log("not working")
                // tell user
                client.say(channel, `@${userState.username}, sorry!  You message was deleted.`)
                // delete message
                client.deletemessage(channel, userState.id)
              }
        }
    })

}

startBot();