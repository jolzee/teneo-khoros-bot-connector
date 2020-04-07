require("dotenv").config();

export const lithium = {
  KHOROS_ACCESS_TOKEN_CACHE_KEY: process.env.KHOROS_ACCESS_TOKEN_CACHE_KEY,
  baseApiUrl: process.env.KHOROS_BASE_API_URL,
  baseTokenUrl: process.env.KHOROS_BASE_TOKEN_URL,
  tokensPath: "/tokens/appId/",
  get refreshTokenUrl() {
    return `${this.baseApiUrl}${this.tokensPath}${this.appId}`;
  },
  get registrationUrl() {
    return `${this.baseApiUrl}/registrations`;
  },
  get tokenUrl() {
    return `${this.baseTokenUrl}${this.appId}`;
  },
  credentials: {
    username: process.env.KHOROS_CREDENTIALS_USERNAME,
    password: process.env.KHOROS_CREDENTIALS_PASSWORD,
  },
  // https://developer.khoros.com/khoroscaredevdocs/reference
  routes: {
    /*
      Respond to an incoming message (bot to channel)
      A bot can respond to an incoming message in several ways:

      text
      references to external media
      a raw payload to the messaging provider (referred to as a passthrough)
      a postback
      a reply

      Note: A raw passthrough and a listpicker cannot be set in the same message payload.
      Note: A bot attempting to respond to a conversation it doesn’t own will receive a 403 Forbidden response.
    */
    respond: (payload) => {
      return {
        path: "/respond",
        method: "POST",
        payload: payload,
      };
    },
    textReply: (lithiumEvent, text) => {
      return lithium.routes.respond({
        coordinate: lithiumEvent.coordinate, //the bot simply passes the coordinate back
        author: lithiumEvent.author, //the bot simply passes the author back
        type: "message",
        text: text.trim(),
      });
    },
    imageReply: (lithiumEvent, text, imageUrl) => {
      return lithium.routes.respond({
        coordinate: lithiumEvent.coordinate, //the bot simply passes the coordinate back
        author: lithiumEvent.author, //the bot simply passes the author back
        type: "message",
        media: {
          url: imageUrl, // The fully-qualified, publicly-available reference to the media
          mediaType: "IMAGE", // IMAGE, VIDEO
        },
        text: text.trim(),
      });
    },
    videoReply: (lithiumEvent, text, videoUrl) => {
      return lithium.routes.respond({
        coordinate: lithiumEvent.coordinate, //the bot simply passes the coordinate back
        author: lithiumEvent.author, //the bot simply passes the author back
        type: "message",
        media: {
          url: videoUrl, // The fully-qualified, publicly-available reference to the media
          mediaType: "VIDEO", // IMAGE, VIDEO
        },
        text: text.trim(),
      });
    },
    richImageReply: (
      lithiumEvent,
      text,
      linkUrl,
      title,
      imageUrl,
      mimeType = "image/jpeg"
    ) => {
      return lithium.routes.respond({
        coordinate: lithiumEvent.coordinate, //the bot simply passes the coordinate back
        author: lithiumEvent.author, //the bot simply passes the author back
        type: "message",
        richContent: {
          mediaType: "IMAGE", // Required. A type like IMAGE or VIDEO.
          url: linkUrl, // Required. A URL of a resource to which the end user will be redirected if they click the rich content/link.
          title: title, // Required. A title for the content at url.
          mediaUrl: imageUrl, // Required. A URL of a media resource like an image or video. Handling may be network-specific.
          mimeType: mimeType, // "image/jpeg" // Required. The MIME type of the resource at mediaUrl.
        },
        text: text.trim(),
      });
    },
    richVideoReply: (
      lithiumEvent,
      text,
      linkUrl,
      title,
      videoUrl,
      mimeType = "video/mp4"
    ) => {
      return lithium.routes.respond({
        coordinate: lithiumEvent.coordinate, //the bot simply passes the coordinate back
        author: lithiumEvent.author, //the bot simply passes the author back
        type: "message",
        richContent: {
          mediaType: "VIDEO", // Required. A type like IMAGE or VIDEO.
          url: linkUrl, // Required. A URL of a resource to which the end user will be redirected if they click the rich content/link.
          title: title, // Required. A title for the content at url.
          mediaUrl: videoUrl, // Required. A URL of a media resource like an image or video. Handling may be network-specific.
          mimeType: mimeType, // "video/mp4" // Required. The MIME type of the resource at mediaUrl.
        },
        text: text.trim(),
      });
    },
    /**
     * You can pass conversation control from the bot to a Care agent using a PUT call
     * to the/control endpoint. The request takes a control JSON payload as Body.
     * https://developer.khoros.com/khoroscaredevdocs/reference#control-put
     */
    handover: (lithiumEvent, comment) => {
      return {
        path: "/control",
        method: "PUT",
        payload: {
          type: "control",
          coordinate: lithiumEvent.coordinate, // A Coordinate object. This is object contains details about the bot and the message in context. It is used by Khoros Care.
          author: lithiumEvent.author, // An Author object representing the message author on the social network channel.
          owner: {
            type: "AGENT",
          }, // The new owner (controller) of the conversation. - AGENT or BOT
          comment: comment, // Optional. Custom text that will be displayed in the response UI along with the handoff message.
        },
      };
    },
    /**
     * Use the Bot v3 API to change the conversation priority
     */
    changePriority: (lithiumEvent, newPriority) => {
      return {
        path: "/priority",
        method: "PUT",
        payload: {
          type: "priority",
          coordinate: lithiumEvent.coordinate, // A Coordinate object. This is object contains details about the bot and the message in context. It is used by Khoros Care.
          author: lithiumEvent.author, // An Author object representing the message author on the social network channel.
          newPriority: newPriority, // An integer from 0 to 5 where 0 is the highest priority
        },
      };
    },
    /**
     * Use the Bot v3 API to have a bot move a conversation to a specific workqueue
     */
    changeWorkQueue: (lithiumEvent, newWorkQueue, comment) => {
      let payload = {
        path: "/workqueue",
        method: "PUT",
        payload: {
          type: "workqueue",
          coordinate: lithiumEvent.coordinate, // A Coordinate object. This is object contains details about the bot and the message in context. It is used by Khoros Care.
          author: lithiumEvent.author, // An Author object representing the message author on the social network channel.
          comment: comment, // An optional comment about this conversation resolution. Stored as an internal note visible in this case history in Khoros Care.
          newWorkQueue: parseInt(newWorkQueue), // Required. The integer ID of the workqueue you wish to move the conversation to. Must be a valid Care workqueue ID.
        },
      };
      // The integer conversation display ID. If present, the ID must match an existing conversation. If absent, we will attempt to match an eligible case based on author and network.
      if (lithiumEvent.conversation && lithiumEvent.conversation.displayId) {
        payload.conversationDisplayId = lithiumEvent.conversation.displayId;
      }
      return payload;
    },
    /**
     * Have a bot mark a conversation as resolved using the Bot v3 API
     */
    resolve: (lithiumEvent, comment = "") => {
      return {
        path: "/resolve",
        method: "PUT",
        payload: {
          type: "resolve",
          coordinate: lithiumEvent.coordinate, // A Coordinate object. This is object contains details about the bot and the message in context. It is used by Khoros Care.
          author: lithiumEvent.author, // An Author object representing the message author on the social network channel.
          comment: comment, // An optional comment about this conversation resolution. Stored as an internal note visible in this case history in Care.
        },
      };
    },
    /**
     * Attach an internal note to the current bot conversation with a PUT request to /bots/v3/note.
     */
    addNote: (lithiumEvent, noteText) => {
      return {
        path: "/note",
        method: "PUT",
        payload: {
          type: "note",
          coordinate: lithiumEvent.coordinate, // A Coordinate object. This is object contains details about the bot and the message in context. It is used by Khoros Care.
          author: lithiumEvent.author, // An Author object representing the message author on the social network channel.
          note: noteText, // The text of the note.
        },
      };
    },
    /**
     * Use the Bot v3 API to tag a specific message with an existing Care tag ID.
     */
    addTags: (lithiumEvent, tagIds) => {
      return {
        path: "/tag",
        method: "PUT",
        payload: {
          type: "tag",
          entityType: "POST",
          coordinate: lithiumEvent.coordinate, // A Coordinate object. This is object contains details about the bot and the message in context. It is used by Khoros Care.
          author: lithiumEvent.author, // An Author object representing the message author on the social network channel.
          tagIds: tagIds, // An integer array of Care tag IDs.
        },
      };
    },
  },
  appId: process.env.KHOROS_APP_ID,
  bot: {
    name: process.env.TENEO_BOT_NAME,
    supportEmail: process.env.TENEO_SUPPORT_EMAIL,
    tieUrl: process.env.TENEO_TIE_URL,
    avatarUrl: process.env.TENEO_AVATAR_URL,
    callbackUrl: process.env.TENEO_CALLBACK_URL,
    callbackCredentials: {
      // The credentials provided are for when lithium deliver events to the callbackUrl
      // you specify.Your endpoint might ignore it, but you must provide values.
      type: "BASIC_AUTH",
      identity: "teneo",
      secret: "<super-secret-squirrel>",
    },
    companyKey: process.env.KHOROS_COMPANY_KEY,
    networks: [
      {
        key: "twitter",
        externalId: process.env.KHOROS_NETWORK_TWITTER_EXTERNAL_ID, //handleId of the twitter handle
        includeTargeted: true,
        auth: {
          accountId: process.env.KHOROS_NETWORK_TWITTER_AUTH_ACCOUNT_ID, // TWITTER Acount Id,
          consumerKey: process.env.KHOROS_NETWORK_TWITTER_AUTH_CONSUMER_KEY, // TWITTER_CONSUMER_KEY,
          consumerSecret:
            process.env.KHOROS_NETWORK_TWITTER_AUTH_CONSUMER_SECRET, // TWITTER_CONSUMER_SECRET,
          accessTokenKey:
            process.env.KHOROS_NETWORK_TWITTER_AUTH_ACCESS_TOKEN_KEY, // TWITTER_ACCESS_TOKEN_KEY,
          acessTokenSecret:
            process.env.KHOROS_NETWORK_TWITTER_AUTH_ACCESS_TOKEN_SECRET, // TWITTER_ACCESS_TOKEN_SECRET
        },
      },
      {
        key: "facebook",
        externalId: process.env.KHOROS_NETWORK_FACEBOOK_EXTERNAL_ID, //pageId of the Facebook page
        includeTargeted: true,
      },
    ],
  },
};

/**
 *  Private DMs for Twitter - Requests / 15-min window (user auth) = 15
 *  reservoir allows for burst of requests
 *  https://developer.twitter.com/en/docs/direct-messages/sending-and-receiving/api-reference/get-event
 */
export const limiterConfigPrivateTwitter = {
  reservoir: 15, // initial value
  reservoirRefreshAmount: 15,
  reservoirRefreshInterval: 15 * 60 * 1000, // must be divisible by 250
  maxConcurrent: 1,
  minTime: 1000, // every 1 seconds for the queue backlog - stagger jobs for performance
};

/**
 *  Public Tweets for Twitter - Requests / 15-min window = 900
 *  reservoir allows for burst of requests
 *  https://developer.twitter.com/en/docs/direct-messages/sending-and-receiving/api-reference/get-event
 */
export const limiterConfigPublicTwitter = {
  reservoir: 900, // initial value
  reservoirRefreshAmount: 900,
  reservoirRefreshInterval: 15 * 60 * 1000, // must be divisible by 250
  maxConcurrent: 1,
  minTime: 1000, // every 1 seconds for the queue backlog - stagger jobs for performance
};

export const limiterKhoros = {
  maxConcurrent: 1,
  minTime: 500, // 2 per second - for the queue backlog - stagger jobs for performance
};

export const twitterConfig = {
  consumer_key: lithium.bot.networks[0].auth.consumerKey,
  consumer_secret: lithium.bot.networks[0].auth.consumerSecret,
  access_token: lithium.bot.networks[0].auth.accessTokenKey,
  access_token_secret: lithium.bot.networks[0].auth.acessTokenSecret,
  timeout_ms: 60 * 1000, // optional HTTP request timeout to apply to all requests.
  strictSSL: true, // optional - requires SSL certificates to be valid.
};
