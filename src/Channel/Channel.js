import {Socket} from 'phoenix-socket';

import Fetcher from '../Fetcher';

import OkEvent from './Event/Ok';
import ErrorEvent from './Event/Error';
import TimeoutEvent from './Event/Timeout';

import JoinMessage from './Message/Join';
import PingMessage from './Message/Ping';

import PongHandler from './Handler/Pong';

import crawl from '../crawl';

/**
 * Create new channel
 * @param socket Socket to be used for creating channel
 * @param channelName Name of channel to be joined to
 * @param registerPingFunction Function used for registering ping function - callback
 * @param unregisterPingFunction Function used for unregistering ping function - callback
 */
export function createChannel(socket, channelName, registerPingFunction, unregisterPingFunction, crawlers) {
  const channel = socket.channel(channelName, JoinMessage.construct());

  let event = channel.join();

  event = OkEvent.register(event, () => {
    registerPingFunction(channel);
  });

  event = ErrorEvent.register(event, unregisterPingFunction, () => {
    unregisterPingFunction();
  });

  /* event = */ TimeoutEvent.register(event);

  const fetcher = new Fetcher();

  channel.on('crawl', (data) => {
    console.log('Received event - crawl');

    let payload = null;
    try {
      payload = JSON.parse(data.payload);
    } catch (e) {
      const msg = `Parsing JSON failed, reason: ${e}, json: ${data.payload}`;
      console.log(msg);

      return channel.push('done', {
        error: msg
      });
    }

    console.log(JSON.stringify(payload, null, 4));

    try {
      return crawl(fetcher, crawlers, payload)
        .then(
          (result) => {
            return channel.push('done', result);
          },
          (error) => {
            return channel.push('done', error);
          }
        );
    } catch (error) {
      return channel.push('done', {
        error: error.message
      });
    }
  });

  PongHandler.register(channel);

  channel.push('msg', {msg: 'Hello World!'});
}

/**
 * Send ping function to channel
 * @param channel Channel to send the message to
 * @param id ID of the message
 */
export function pingFunction(channel, id) {
  console.log('Executing ping function.');
  channel.push('ping', PingMessage.construct(id));
}

/**
 * Create socket
 * @param url - URL to be connected to
 * @param token - jwt for worker authentication
 * @param unregisterPingFunction
 * @returns {Socket}
 */
export function createSocket(url, token, unregisterPingFunction) {
  console.log(`Connecting to "${url}"`);
  const socket = new Socket(url, {
    params: {
      guardian_token: token
    },
    transport: global.window.WebSocket
  });

  // Error handler
  socket.onError((err) => {
    console.log('There was an error with the connection!');
    console.log(err);
    unregisterPingFunction();
  });

  // Close handler
  socket.onClose(() => {
    console.log('The connection dropped.');
    unregisterPingFunction();
  });

  return socket;
}

/**
 * Channel (Websocket) used for communication with Webapp (Backend)
 */
export default class Channel {
  constructor() {
    console.log('Loading Supported Protocols');
  }

  /**
   * Register ping function
   * @param channel Channel to be used by ping fuction
   * @param heartbeatInterval Interval between pings
   */
  registerPingFunction(channel, heartbeatInterval = 10000) {
    console.log('Registering ping function.');

    let id = 0;
    this.pingFunctionInterval = setInterval(
      () => {
        pingFunction(channel, id);
        id += 1;
      },
      heartbeatInterval
    );
  }

  /**
   * Unegister ping function
   */
  unregisterPingFunction() {
    if (this.pingFunctionInterval) {
      console.log('Unregistering ping function.');
      clearInterval(this.pingFunctionInterval);
      this.pingFunctionInterval = null;
    }
  }

  /**
   * Initialize Channel
   * @param url Webapp Socket URL
   * @param token Auth Token
   * @param channelName Name of Channel used for Communication
   * @param manager Crawler Manager
   * @returns {Promise}
   */
  initialize(url, token, channelName, manager) {
    const crawlers = manager.crawlers;

    return new Promise((resolve) => {
      const socket = createSocket(url, token, this.unregisterPingFunction.bind(this));

      // Try to connect
      socket.connect();

      // const channel =
      createChannel(socket, channelName, this.registerPingFunction.bind(this), this.unregisterPingFunction.bind(this), crawlers);

      resolve(this);
    });
  }
}
