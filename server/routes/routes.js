"use strict";
/**
 * Teneo Connector to Khoros
 * author: Peter Joles
 * email: peter.joles@artificial-solutions.com
 * Khoros Docs: https://developer.khoros.com/khoroscaredevdocs/reference#bot-api-3
 */
require("dotenv").config();
const logger = require("./../config/winston");
const superagent = require("superagent");
import Bottleneck from "bottleneck";
import moment from "moment";
import Redis from "ioredis";
import TIE from "@artificialsolutions/tie-api-client";
import Twit from "twit";

import {
  limiterConfigPrivateTwitter,
  limiterConfigPublicTwitter,
  lithium,
  twitterConfig,
} from "../config/khorosConfig";
import { isEmpty } from "../lib/utils";
const limiterPublic = new Bottleneck(limiterConfigPublicTwitter); // To help with Twitter rate limits
const limiterPrivate = new Bottleneck(limiterConfigPrivateTwitter); // To help with Twitter rate limits
const limiterKhoros = new Bottleneck(limiterKhoros); // queue Khoros API requests // 2 per second
const redis = new Redis({
  port: parseInt(process.env.REDIS_PORT), // Redis port
  host: process.env.REDIS_HOST, // Redis host
  family: 4, // 4 (IPv4) or 6 (IPv6)
  password: process.env.REDIS_PASSWORD,
});

const T = new Twit(twitterConfig);

const logTeneoResponse = (teneoResponse) => {
  logger.info("Teneo Response:", teneoResponse);
  return teneoResponse;
};

const generateChannelName = (lithiumEvent) => {
  // ("twitter-private/twitter-public/facebook-private/facebook-public");
  let channelName = `${lithiumEvent.coordinate.networkKey}-${(
    lithiumEvent.coordinate.scope + ""
  ).toLowerCase()}`;
  logger.debug(`Responding to CHANNEL: ${channelName}`);
  return channelName;
};

/**
 * Lithium only gives us the twitter post id. We need to get the message text via API call directly to twitter.
 * https://tinyurl.com/ungrfn8
 */
const getPublicTweetMessage = async (lithiumEvent) => {
  return new Promise((resolve, reject) => {
    const tweetId = lithiumEvent.coordinate.messageId;
    const params = {
      id: tweetId,
    };
    T.get(`statuses/show`, params, (err, data, response) => {
      if (err) {
        logger.info(`Could not find tweetId ${tweetId} publically`);
        resolve(null);
      } else {
        logger.info(
          `SUCCESS:Twitter:GET:statuses/show: ${tweetId} => ${data.text}`
        );
        resolve(data.text); // lots of information available https://developer.twitter.com/en/docs/tweets/post-and-engage/api-reference/get-statuses-show-id
      }
    });
  });
};

const getPrivateTweetMessage = async (lithiumEvent) => {
  return new Promise((resolve, reject) => {
    const tweetId = lithiumEvent.coordinate.messageId;
    const params = {
      id: tweetId,
    };
    T.get(`direct_messages/events/show`, params, (err, data, response) => {
      // https://developer.twitter.com/en/docs/direct-messages/sending-and-receiving/api-reference/get-event
      if (err) {
        logger.error(
          `ERROR:Twitter:GET:direct_messages/events/show: ${tweetId}`
        );
        resolve(null);
      } else {
        logger.debug(
          `SUCCESS:Twitter:GET:direct_messages/events/show: ${tweetId}: ${data.event.message_create.message_data.text}`
        );
        resolve(data.event.message_create.message_data.text);
      }
    });
  });
};

const session = {
  deleteSessionId: (khorosId) => {
    redis.del(khorosId).then(() => {
      logger.debug(`REDIS:DEL[SESSION] Deleted cache for key: ${khorosId}`);
    });
  },
  findSessionId: async (khorosId) => {
    return new Promise((resolve, reject) => {
      redis
        .get(khorosId)
        .then((teneoSesisonId) => {
          logger.info(`REDIS:GET[SESSION] Teneo Session ID: ${teneoSesisonId}`);
          resolve(teneoSesisonId);
        })
        .catch((err) => {
          logger.info("REDIS:GET[SESSION]", err);
          resolve(null);
        });
    });
  },
  cacheSessionId: (khorosPostId, teneoSessionId) => {
    let minutes = 20;
    redis.set(khorosPostId, teneoSessionId, "EX", minutes * 60);
    logger.debug(
      `REDIS:SET[SESSION] Caching Session Info for [${minutes}min]: ${khorosPostId} ${teneoSessionId}`
    );
  },
};

const tokenObj = {
  registerBot: async () => {
    return new Promise(async (resolve, reject) => {
      let accessToken = await tokenObj.getAccessToken();
      let responses = [];
      if (accessToken) {
        lithium.bot.networks.forEach(async (network) => {
          const registrationPayload = {
            companyKey: lithium.bot.companyKey,
            platform: "LITHIUM",
            networkKey: network.key,
            externalId: network.externalId,
            appId: lithium.appId,
            name: lithium.bot.name,
            avatarUrl: lithium.bot.avatarUrl,
            contact: { email: lithium.bot.supportEmail },
            mode: "LIVE", // or MAINTENANCE
            publicFilter: {
              includeTargeted: network.includeTargeted,
            },
            callbackUrl: lithium.bot.callbackUrl,
            credentials: lithium.bot.callbackCredentials,
          };

          const auth = `Bearer ${accessToken}`;

          superagent
            .post(lithium.registrationUrl)
            .send(registrationPayload)
            .set("Authorization", auth)
            .set("Accept", "application/json")
            .then((resp) => {
              let responseJson = JSON.stringify(resp.body);
              logger.info(`Register Bot with network response: `, responseJson);
              responses.push(responseJson);
            })
            .catch((error) => {
              logger.error(
                `Bot Registration: ${registrationPayload.name}:  ${error.message}`
              );
              responses.push({
                status: "error",
                message: error.message,
              });
            });
        });
        resolve(responses);
      } else {
        resolve(responses);
      }
    });
  },
  /**
   * Requests a new access token and caches new token in Redis.
   * Returns new token
   */
  requestNewAccessToken: async () => {
    const auth =
      "Basic " +
      Buffer.from(
        lithium.credentials.username + ":" + lithium.credentials.password
      ).toString("base64");
    try {
      superagent
        .post(lithium.tokenUrl)
        .send(registrationPayload)
        .set("Authorization", auth)
        .set("Accept", "application/json")
        .then((resp) => {
          let responseJson = JSON.stringify(resp.body);
          logger.info(responseJson);
          // let resp = {
          //   status: "success",
          //   data: {
          //     token: "mytoken",
          //     expiresAtMillis: "<epochMillis>"
          //   }
          // };
          if (responseJson.status === "success") {
            tokenObj.cacheAccessToken(responseJson);
            return responseJson.data;
          } else {
            return null;
          }
        })
        .catch((error) => {
          logger.error(`Could not requestNewAccessToken: ${error.message}`);
          return null;
        });
    } catch (e) {
      logger.error(`Could not requestNewAccessToken: ${e.message}`);
      return null;
    }
  },
  /**
   * Requests refreshed token and caches the result in Redis.
   * Returns the new token
   */
  refreshAccessToken: async (token) => {
    // refresh
    superagent
      .put(lithium.refreshTokenUrl)
      .set("Authorization", `Bearer ${token}`)
      .set("Accept", "application/json")
      .then((resp) => {
        let responseJson = JSON.stringify(resp.body);
        // cache
        if (responseJson.status === "success") {
          tokenObj.cacheAccessToken(responseJson);
          // return
          return responseJson.data;
        } else {
          return null;
        }
      })
      .catch((error) => {
        logger.error(`refreshAccessToken: ${error.message}`);
        return null;
      });
  },
  /**
   * Either returns the token or null
   */
  getCachedAccessToken: async () => {
    return new Promise((resolve, reject) => {
      redis
        .get(lithium.KHOROS_ACCESS_TOKEN_CACHE_KEY)
        .then((cachedAccessTokenResponse) => {
          logger.info(`ACCESS TOKEN RAW: ${cachedAccessTokenResponse}`);
          let parsedToken = JSON.parse(cachedAccessTokenResponse);
          logger.debug("REDIS:GET[KHOROS_ACCESS_TOKEN] ", parsedToken);
          resolve(parsedToken);
        })
        .catch((err) => {
          logger.warn(`No Cached Access Token in Redis`, err);
          resolve(null);
        });
    });
  },
  /**
   * Caches the Lithium token until it needs refreshing
   */
  cacheAccessToken: (responseToken) => {
    let expires = moment(responseToken.data.expiresAtMillis);
    let now = moment();
    let secondsUntilExpiry = expires.diff(now, "seconds");

    redis
      .set(
        lithium.KHOROS_ACCESS_TOKEN_CACHE_KEY,
        JSON.stringify(responseToken.data),
        "EX",
        secondsUntilExpiry
      )
      .then(() => {
        logger.info(
          `REDIS:SET:ACCESS_TOKEN: cached access token for ${secondsUntilExpiry} secs`
        );
      });
  },
  /**
   * Looks in cache first, if not found requests a new token.
   * If found, checks if a week has passed and requests a refresh to token.
   * check cache, refresh if needed or request new token
   */
  getAccessToken: async () => {
    let configDaysUntilExpiry = 10;
    let accessToken = await tokenObj.getCachedAccessToken();
    if (accessToken) {
      // found an existing access token
      let expires = moment(accessToken.expiresAtMillis);
      let now = moment();
      let daysUntilExpiry = expires.diff(now, "days");
      if (daysUntilExpiry < configDaysUntilExpiry) {
        logger.info(`Trying to refresh access token: ${accessToken.token} `);
        // request refresh to existing token - a week has passed

        let newAccessToken = await tokenObj.refreshAccessToken(
          accessToken.token
        );
        if (newAccessToken) {
          accessToken = newAccessToken;
        }
      }
      return accessToken.token;
    } else {
      // no access token found in cache - ask for a new token
      let accessToken = await tokenObj.requestNewAccessToken();
      return accessToken ? accessToken.token : null;
    }
  },
};

const sortBy = (field) => {
  return function (a, b) {
    return (a[field] > b[field]) - (a[field] < b[field]);
  };
};

const parseTasksFromTeneoResponse = (tasks) => {
  let tempTasks = tasks.split("||");
  let allTasks = [
    { order: 10, name: "image", postsAnAnswer: true, shouldPostAnswer: true },
    { order: 20, name: "video", postsAnAnswer: true, shouldPostAnswer: true },
    {
      order: 30,
      name: "richimage",
      postsAnAnswer: true,
      shouldPostAnswer: true,
    },
    {
      order: 40,
      name: "richvideo",
      postsAnAnswer: true,
      shouldPostAnswer: true,
    },
    {
      order: 50,
      name: "tags",
      postsAnAnswer: false,
      meta: true,
    },
    {
      order: 60,
      name: "note",
      postsAnAnswer: false,
      meta: true,
    },
    {
      order: 70,
      name: "priortiy",
      postsAnAnswer: false,
      shouldPostAnswer: false,
    },
    {
      order: 80,
      name: "workqueue",
      postsAnAnswer: false,
      shouldPostAnswer: false,
    },
    {
      order: 90,
      name: "resolve",
      postsAnAnswer: false,
      shouldPostAnswer: true,
    },
    {
      order: 95,
      name: "handover",
      postsAnAnswer: false,
      shouldPostAnswer: false,
    },
  ];

  tempTasks.forEach((task) => {
    let taskInstructions = task.split("|");
    let finalTaskInstructions = [];
    taskInstructions.forEach((instruction) => {
      let finalInstruction = instruction.replace(/  |\r\n|\n|\r/gm, "");
      finalInstruction = instruction.trim();
      if (finalInstruction !== "") {
        finalTaskInstructions.push(finalInstruction);
      }
    });
    if (finalTaskInstructions.length > 0) {
      const foundIndex = allTasks.findIndex(
        (task) => task.name === finalTaskInstructions[0].toLowerCase()
      );
      allTasks[foundIndex].info = finalTaskInstructions;
    }
  });

  allTasks.sort(sortBy("order"));
  allTasks = allTasks.filter((task) => "info" in task);
  return allTasks;
};

/** Teneo has already been called - let's focus on what needs to be done now */
const handleTeneoResponse = async (lithiumEvent, teneoResponse) => {
  const khorosPostId = lithiumEvent.author.id; // or something that is session specific
  session.cacheSessionId(khorosPostId, teneoResponse.sessionId);
  let extraInfo = teneoResponse.output.parameters;

  let simplePayload = lithium.routes.textReply(
    lithiumEvent,
    teneoResponse.output.text
  );

  // logger.info(`Simple Payload`, simplePayload, simplePayload.payload.text);

  if (
    (isEmpty(extraInfo) || !("khoros" in extraInfo)) &&
    simplePayload.payload.text
  ) {
    logger.info(`Queueing task "textReply" to Khoros:`, simplePayload);
    limiterKhoros
      .schedule(() => doKhorosBotApiCall(simplePayload))
      .then((khorosResp) => {
        logger.info(`Success: "textReply" sent toKhoros`);
      })
      .catch((err) =>
        logger.error(`Error: Failed to send reply: ${err.message}`)
      );
  } else if (extraInfo.khoros) {
    // image | imageUrl ||
    // video | videoUrlMp4 ||
    // handover | commentText ||
    // resolve | commentText||
    // tags | 123,234,555 ||
    // note | noteText ||
    // priortiy | 0 ||
    // workQueue | workQueueIdName | comment ||
    // richImage | imageLinkUrl | imageTitle | imageUrl | mimeTypeOfImage ||
    // richVideo | videoLinkUrl | videoTitle | videoUrl | mimeTypeOfVideo ||
    try {
      let taskList = parseTasksFromTeneoResponse(extraInfo.khoros);

      // let's adhere to the rules
      let tasksThatSendReplies = taskList.filter((task) => task.postsAnAnswer);

      let tasksForbiddingBotReply = taskList.filter(
        (task) => !task.shouldPostAnswer && !task.meta
      );

      // Find the first task that posts an answer. Ignore others if present
      let aTaskThatSendsReply = tasksThatSendReplies.find(
        (task) => task.postsAnAnswer
      );

      // find meta tasks that don't actually send text response but should be associated a reply grouping
      let metaTasks = taskList.filter((task) => task.meta);

      // only send a simple text reply when we are allowed to -
      // ie.no existing rich responses or any tasks that explicity prohibit a response at all
      if (
        tasksThatSendReplies.length === 0 &&
        tasksForbiddingBotReply.length === 0 &&
        simplePayload.payload.text
      ) {
        logger.info(`Queueing task "textReply" to Khoros:`, simplePayload);
        limiterKhoros
          .schedule(() => doKhorosBotApiCall(simplePayload))
          .then((khorosResp) => {
            logger.info(`Success: Reply sent to Khoros`);
          })
          .catch((err) =>
            logger.error(
              `Error: Failed to send a reply with meta: ${err.message}`
            )
          );
      }
      if (tasksForbiddingBotReply.length > 0) {
        taskList = tasksForbiddingBotReply; // ignore others so that we don't post when we shouldn't
        taskList.concat(metaTasks);
      } else {
        taskList = [aTaskThatSendsReply].concat(metaTasks); // combine arrays
        taskList.sort(sortBy("order")); // important to get these in the correct order
      }

      const finalTaskList = taskList.filter((e) => e != null);

      logger.info("Final Task List", finalTaskList);
      for (const task of finalTaskList) {
        let taskName = task.name.toLowerCase();
        let jsonPayload = {};
        switch (taskName) {
          case "image":
            if (task.info.length > 1) {
              jsonPayload = lithium.routes.imageReply(
                lithiumEvent,
                teneoResponse.output.text,
                task.info[1]
              );
            }
            break;
          case "video":
            if (task.info.length > 1) {
              jsonPayload = lithium.routes.videoReply(
                lithiumEvent,
                teneoResponse.output.text,
                task.info[1]
              );
            }
            break;
          case "handover":
            jsonPayload = lithium.routes.handover(
              lithiumEvent,
              task.info.length > 1 ? task.info[1] : ""
            );
            session.deleteSessionId(khorosPostId);
            break;
          case "resolve":
            if (task.info.length > 1) {
              jsonPayload = lithium.routes.resolve(lithiumEvent, task.info[1]);
            }
            break;
          case "tags":
            if (task.info.length > 1) {
              jsonPayload = lithium.routes.addTags(
                lithiumEvent,
                task.info[1].split(/\s*,\s*/).map(Number)
              );
            }
            break;
          case "note":
            if (task.info.length > 1) {
              jsonPayload = lithium.routes.addNote(lithiumEvent, task.info[1]);
            }
            break;
          case "priortiy":
            if (task.info.length > 1) {
              jsonPayload = lithium.routes.changePriority(
                lithiumEvent,
                parseInt(task.info[1])
              );
            }
            break;
          case "workqueue":
            if (task.info.length > 2) {
              jsonPayload = lithium.routes.changeWorkQueue(
                lithiumEvent,
                task.info[1],
                task.info[2]
              );
            }
            session.deleteSessionId(khorosPostId);
            break;
          case "richimage":
            if (task.info.length > 4) {
              jsonPayload = lithium.routes.richImageReply(
                lithiumEvent,
                teneoResponse.output.text,
                task.info[1],
                task.info[2],
                task.info[3],
                task.info[4]
              );
            }
            break;
          case "richvideo":
            if (task.info.length === 5) {
              jsonPayload = lithium.routes.richVideoReply(
                lithiumEvent,
                teneoResponse.output.text,
                task.info[1],
                task.info[2],
                task.info[3],
                task.info[4]
              );
            }
            break;
          default:
            break;
        }
        if (!isEmpty(jsonPayload)) {
          logger.info(`Queueing task "${taskName}" to Khoros:`, jsonPayload);
          limiterKhoros
            .schedule(() => doKhorosBotApiCall(jsonPayload))
            .then((khorosBotApiCallResponse) => {
              logger.info(
                `Success: Task "${taskName}" successfully sent to Khoros:`
              );
            })
            .catch((anErr) =>
              logger.error(
                `Error: Failed to handover to agent: ${anErr.message}`
              )
            );
        }
      }
    } catch (err) {
      logger.error(
        `There was a problem parsing Khoros tasks from Teneo: ${err.message}`
      );
    }
  }
};

const teneoProcess = async (lithiumEvent, postText = null) => {
  postText = postText ? postText : lithiumEvent.text;

  const teneoSessionId = await session.findSessionId(lithiumEvent.author.id);

  TIE.sendInput(lithium.bot.tieUrl, teneoSessionId, {
    text: postText,
    channel: "khoros",
    socialMediaChannel: generateChannelName(lithiumEvent),
  })
    .then(logTeneoResponse)
    .then((teneoResponse) => {
      handleTeneoResponse(lithiumEvent, teneoResponse);
    })
    .catch((err) => {
      logger.error(`Teneo ERROR:  ${err.message}`);
    });
};

/**
 * Check if Twitter or Facebook
 * @param {*} lithiumEvent is the event delivered by Lithium
 */
const scheduleEvent = async (lithiumEvent) => {
  if (lithiumEvent.text) {
    // assume facebook
    teneoProcess(lithiumEvent); // no need to scheule anything
  } else {
    // very likely twitter
    const twitterChannelName = generateChannelName(lithiumEvent);
    // more lax rate limit on public tweets - start here
    if (twitterChannelName.includes("public")) {
      limiterPublic
        .schedule(() => getPublicTweetMessage(lithiumEvent))
        .then((postText) => {
          if (postText) {
            logger.info(`Public Tweet Text: ${postText}`);
            teneoProcess(lithiumEvent, postText);
          } else {
            logger.info(
              `Public Text on Twitter could not be found`,
              lithiumEvent
            );
          }
        });
    } else if (twitterChannelName.includes("private")) {
      limiterPrivate
        .schedule(() => getPrivateTweetMessage(lithiumEvent))
        .then((dmText) => {
          if (dmText) {
            logger.info(`DM Tweet Text: ${dmText}`);
            teneoProcess(lithiumEvent, dmText);
          } else {
            logger.warning(
              `WARNING: Private Tweet could be found for: `,
              lithiumEvent
            );
          }
        });
    }
  }
};

/**
 * This function make the call to the botAPI
 * @param {*} jsonPayload is the payload to deliver to Lithium
 */
const doKhorosBotApiCall = async (instructions) => {
  /**
   * To ensure that emojis are delivered correctly, add charset=utf-8 to your header when using the /respondendpoint.
   * Content-Type: application/json; charset=utf-8
   */
  const accessToken = await tokenObj.getAccessToken();
  return new Promise((resolve, reject) => {
    if (accessToken) {
      let url = `${lithium.baseApiUrl}${instructions.path}`;
      let request;
      if (instructions.method === "POST") {
        request = superagent.post(url);
      } else {
        request = superagent.put(url);
      }

      request
        .send(instructions.payload)
        .set("Authorization", `Bearer ${accessToken}`)
        .set("Content-Type", "application/json; charset=utf-8")
        .set("Accept", "application/json")
        .then((resp) => {
          // logger.info(`API response from Khoros`, resp);
          let jsonResponse = JSON.stringify(resp.body);
          resolve(jsonResponse);
        })
        .catch((error) => {
          reject(error);
        });
    } else {
      reject({
        message: "No access token can be found",
      });
    }
  });
};

const sendHandover = (lithiumEvent) => {
  logger.info("Pass control to Khoros agent =>");
  doKhorosBotApiCall(lithium.routes.handover(lithiumEvent, ""))
    .then((resp) => logger.info(`Success: Handed off to agent`))
    .catch((err) =>
      logger.error(`Error: Failed to handover to agent:  ${err.message}`)
    );
};

/**
 * Decide up front if we should handle this event or not.
 */
const processLithiumEvent = async (lithiumEvent) => {
  if (
    lithiumEvent &&
    lithiumEvent.type === "update" &&
    lithiumEvent.operation === "AGENT_RESPONSE" &&
    lithiumEvent.coordinate.scope === "PUBLIC"
  ) {
    sendHandover(lithiumEvent);
  } else if (
    lithiumEvent &&
    lithiumEvent.owner &&
    lithiumEvent.owner.type === "BOT" &&
    lithiumEvent.owner.appId === lithium.appId
  ) {
    /**
     * The bot receives all events even if it is not the owner. However, the bot can only
     * send a message to the author if it is the owner. It can take all other actions.
     * So ignore type = [update|agent]
     */
    // Only process events you want to process
    if (lithiumEvent.type === "message") {
      scheduleEvent(lithiumEvent);
    }
  }
};

/** Register Bot will all networks [Twitter/Facebook] */
const registerBot = () => {
  return new Promise((resolve, reject) => {
    tokenObj.registerBot().then((responses) => {
      resolve(responses);
    });
  });
};

/**
 * Handles the event delivered by Lithium. The body of the "event"
 *   delivered by the API Gateway is the event from Lithium.
 */
export const khorosInbound = (req, res) => {
  // {
  //   "author"      : { "id": "<authorId>" },
  //   "coordinate"  : {
  //     "botId"      : "<botId>",
  //     "companyKey" : "<companyKey>",
  //     "externalId" : "<externalId>",
  //     "messageId"  : "<messageId>",
  //     "networkKey" : "<networkKey>",
  //     "scope"      : "<PUBLIC|PRIVATE><private|public>"
  //   },
  //   "owner"       : {
  //     "appId" : "<appId>",
  //     "type"  : "bot"
  //   },
  //   "publishedTS" : "<published epoch millis>",
  //   "receivedTS"  : "<received epoch millis>",
  //   "text"        : "Who created you?",
  //   "type"        : "message"
  // }
  const lithiumEvent = req.body;
  logger.info("Khoros Event: ", lithiumEvent); //log the event
  processLithiumEvent(lithiumEvent);
  res.status(202).json({ message: "Teneo - Roger that", echo: lithiumEvent });
};

/**
 * Gets a new access token and registers the Teneo Bot with Khoros.
 * Registers for the following networks [twitter & facebook]
 */
export const khorosRegisterBot = (req, res) => {
  registerBot()
    .then((responses) => {
      res.status(200).json({
        message: "Teneo - Results from register Teneo as Bot",
        results: responses,
      });
    })
    .catch((err) => logger.error(`Registration Error:  ${err.message}`));
};
