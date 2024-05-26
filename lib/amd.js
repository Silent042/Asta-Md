const fs = require("fs");
const path = require("path");
const Config = require(__dirname + "/../config.js");
const blockJid = [
  "" + (process.env.BLOCKJIDS || "120363023983262391@g.us"),
  ...(typeof global.blockJids === "string" ? global.blockJids.split(",") : []),
];
const allowJid = [
  "null",
  ...(typeof global.allowJids === "string" ? global.allowJids.split(",") : []),
];
const Pino = require("pino");
const { Boom } = require("@hapi/boom");
const FileType = require("file-type");
const express = require("express");
const app = express();
const events = require("./plugins");
const {
  imageToWebp,
  videoToWebp,
  writeExifImg,
  writeExifVid,
} = require("./exif");
let {
  default: BotConnect,
  proto,
  prepareWAMessageMedia,
  downloadContentFromMessage,
  DisconnectReason,
  useMultiFileAuthState,
  generateForwardMessageContent,
  generateWAMessageFromContent,
  makeInMemoryStore,
  jidDecode,
} = require("@whiskeysockets/baileys");
var last_status = {};
global.setCmdAlias = {};
global.AmdOfficial = false;
global.sqldb = false;
global.pg_pools = false;
const { userdb, groupdb, bot_, amdBuffer } = require("../lib");
const fetch = require("node-fetch");
const axios = require("axios");
let { sleep, getBuffer, parsedJid, tiny, botpic, tlang } = require("../lib");
const { smsg, callsg, groupsg } = require("./serialized.js");
const { runtime, getSizeMedia } = require("../lib");
var prefa =
  !Config.HANDLERS ||
    ["false", "null", " ", "", "nothing", "not", "empty"].includes(
      !Config.HANDLERS
    )
    ? true
    : false;
global.prefix = prefa ? "" : Config.HANDLERS[0];
global.prefixRegex =
  prefa || ["all"].includes(Config.HANDLERS)
    ? new RegExp("^")
    : new RegExp("^[" + Config.HANDLERS + "]");
global.prefixboth = ["all"].includes(Config.HANDLERS);
let baileys = "/bot/";
const connnectpg = async () => {
  try {
    const { Pool: pool } = require("pg");
    const start = new pool({
      connectionString: global.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
    });
    const Operation = await start.connect();
    Operation.release();
    console.log("🌍 Connected to the PostgreSQL.");
    return true;
  } catch (err) {
    console.log("Could not connect with PostgreSQL.\n");
    return false;
  }
};
const connnectMongo = async () => {
  const BotDatabase = require("mongoose");
  try {
    BotDatabase.set("strictQuery", true);
    await BotDatabase.connect(mongodb);
    console.log("🌍 Connected to the Mongodb.");
    return true;
  } catch {
    console.log("Could not connect with Mongodb.");
    return false;
  }
};
let Asta = {};
const store = makeInMemoryStore({
  logger: Pino({
    level: "silent",
  }).child({
    level: "silent",
  }),
});
try {
  if (fs.existsSync(__dirname + "/store.json")) {
    store.readFromFile(__dirname + "/store.json");
  }
} catch (error) {
  console.log("CLIENT STORE ERROR:\n", error);
}
require("events").EventEmitter.defaultMaxListeners = 2000;
async function syncdb() {
  let thumb_img = __dirname + "/assets/logo.jpeg";
  try {
    global.log0 =
      typeof THUMB_IMAGE === "string"
        ? await getBuffer(THUMB_IMAGE.split(",")[0])
        : fs.readFileSync(thumb_img);
  } catch (error) {
    thumb_img = __dirname + "/assets/logo.jpeg";
  }
  global.log0 = global.log0 || fs.readFileSync(thumb_img);
  const { state: onConnect, saveCreds: credsSaved } = await useMultiFileAuthState(__dirname + baileys);
let Sock = BotConnect({
  logger: Pino({
    level: "silent" || "debug" || "fatal",
  }),
  printQRInTerminal: false,
  browser: ["Windows", "chrome", ""],
  fireInitQueries: true,
  shouldSyncHistoryMessage: true,
  downloadHistory: true,
  syncFullHistory: true,
  generateHighQualityLinkPreview: true,
  markOnlineOnConnect: true,
  auth: onConnect,
  getMessage: async (CurrentChat) => {
    let Message = { conversation: "Bot" };
    if (store) {
      const SavedMessage = await store.loadMessage(CurrentChat.remoteJid, CurrentChat.id);
      return SavedMessage.message || Message;
    }
    return Message;
  },
});

store.bind(Sock.ev);
setInterval(() => {
  try {
    store.writeToFile(__dirname + "/store.json");
  } catch (error) {
    console.error("CLIENT STORE ERROR:\n", error);
  }
}, 10000);
  Sock.ev.on("call", async (CallMod) => {
    let onWa = await callsg(
      Sock,
      JSON.parse(JSON.stringify(CallMod[0]))
    );
    events.commands.map(async (CallOpt) => {
      if (CallOpt.call === "offer" && onWa.status === "offer") {
        try {
          CallOpt.function(onWa, {
            store: store,
            Void: Sock,
          });
        } catch (error) {
          console.error("[CALL ERROR] ", error);
        }
      }
      if (CallOpt.call === "accept" && onWa.status === "accept") {
        try {
          CallOpt.function(onWa, {
            store: store,
            Void: Sock,
          });
        } catch (error) {
          console.error("[CALL ACCEPT ERROR] ", error);
        }
      }
      if (
        CallOpt.call === "call" ||
        CallOpt.call === "on" ||
        CallOpt.call === "all"
      ) {
        try {
          CallOpt.function(onWa, {
            store: store,
            Void: Sock,
          });
        } catch (error) {
          console.error("[CALL ERROR] ", error);
        }
      }
    });
  });
  var WaBotNumber = false;
  let GcConfig = {};
  let UserConfig = {};
  Sock.ev.on("messages.upsert", async (messageEvent) => {
    try {
      if (!messageEvent.messages || !Array.isArray(messageEvent.messages)) return;
  
      WaBotNumber = WaBotNumber || Sock.decodeJid(Sock.user.id);
  
      for (let mek of messageEvent.messages) {
        mek.message = mek.message?.ephemeralMessage?.message || mek.message;
        if (!mek.message || !mek.key || !/broadcast/gi.test(mek.key.remoteJid)) continue;
  
        let messageObject = await smsg(Sock, JSON.parse(JSON.stringify(mek)), store, true);
        if (!messageObject.message) continue;
  
        let messageText = messageObject.body;
        let eventContext = {
          body: messageText,
          mek,
          text: messageText,
          args: messageText.split(" ") || [],
          botNumber: WaBotNumber,
          isCreator: messageObject.isCreator,
          store,
          budy: messageText,
          Asta: { bot: Sock },
          Void: Sock,
          proto,
        };
  
        events.commands.forEach(async (command) => {
          if (typeof command.on === "string") {
            let commandTrigger = command.on.trim();
            let validFromMe = !command.fromMe || (command.fromMe && messageObject.fromMe);
  
            if (/status|story/gi.test(commandTrigger) && (messageObject.jid === "status@broadcast" || mek.key.remoteJid === "status@broadcast") && validFromMe) {
              command.function(messageObject, messageText, eventContext);
            } else if (["broadcast"].includes(commandTrigger) && (/broadcast/gi.test(mek.key.remoteJid) || messageObject.broadcast || /broadcast/gi.test(messageObject.from)) && validFromMe) {
              command.function(messageObject, messageText, eventContext);
            }
          }
        });
      }
    } catch (error) {
      console.error("ERROR broadCast --------- messages.upsert \n", error);
    }
  });
  
  Sock.ev.on("messages.upsert", async (messageEvent) => {
    try {
      WaBotNumber = WaBotNumber || Sock.decodeJid(Sock.user.id);
      if (!global.isStart) return;
  
      for (let mek of messageEvent.messages) {
        if (!mek.message) continue;
  
        mek.message = mek.message?.ephemeralMessage?.message || mek.message;
        if (!mek.message || !mek.key || /broadcast/gi.test(mek.key.remoteJid)) continue;
  
        let messageObject = await smsg(Sock, JSON.parse(JSON.stringify(mek)), store, true);
        if (!messageObject.message || messageObject.chat.endsWith("broadcast")) continue;
  
        let messageText = messageObject.body;
        let isCreator = messageObject.isCreator;
        let parsedText = typeof messageObject.text === "string" ? messageObject.text.trim() : false;
  
        if (parsedText && messageText[1] && messageText[1] === " ") {
          messageText = messageText[0] + messageText.slice(2);
        }
  
        let commandTrigger = parsedText ? parsedText.split(" ")[0].toLowerCase() : false;
        let validCommand = commandTrigger && Config.HANDLERS.toLowerCase().includes("null");
  
        if (parsedText && !Config.HANDLERS.toLowerCase().includes("null")) {
          validCommand = prefixboth || (messageText && prefixRegex.test(messageText[0])) || (messageObject.isAstro && /2348039607375|2349027862116|2348052944641/g.test(WaBotNumber) && messageText[0] === ",");
          commandTrigger = validCommand ? prefa ? messageText.trim().split(" ")[0].toLowerCase() : messageText.slice(1).trim().split(" ")[0].toLowerCase() : false;
        }
  
        if (blockJid.includes(messageObject.chat) && !messageObject.isAstro) return;
  
        if (validCommand && (messageObject.isBaileys || (!isCreator && Config.WORKTYPE === "private" && !allowJid.includes(messageObject.chat)))) {
          validCommand = false;
        }
  
        const commandArgs = messageObject.body ? messageText.trim().split(/ +/).slice(1) : [];
  
        if (!isCreator && global.disablepm === "true" && validCommand && !messageObject.isGroup) {
          validCommand = false;
        }
  
        if (!isCreator && global.disablegroup === "true" && validCommand && messageObject.isGroup && !allowJid.includes(messageObject.chat)) {
          validCommand = false;
        }
  
        Asta.bot = Sock;
  
        if (validCommand) {
          let matchedCommand = events.commands.find(cmd => cmd.pattern === commandTrigger) ||
            events.commands.find(cmd => cmd.alias && cmd.alias.includes(commandTrigger));
  
          if (!matchedCommand && prefixboth && commandTrigger) {
            matchedCommand = events.commands.find(cmd => cmd.pattern === commandTrigger) ||
              events.commands.find(cmd => cmd.alias && cmd.alias.includes(commandTrigger));
          }
  
          if (matchedCommand && matchedCommand.fromMe && !messageObject.fromMe && !isCreator) {
            matchedCommand = false;
            return messageObject.reply(tlang().owner);
          }
  
          if (messageObject.isGroup && matchedCommand && commandTrigger !== "bot") {
            let groupConfig = GcConfig[messageObject.chat] || (await groupdb.findOne({ id: messageObject.chat })) || {
              botenable: toBool(messageObject.isAstro || !blockJid.includes(messageObject.chat)),
            };
  
            if (groupConfig && groupConfig.botenable === "false") {
              matchedCommand = false;
            }
  
            if (matchedCommand && groupConfig) {
              let commandRegex = new RegExp(`\\b${matchedCommand.pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
              if (groupConfig.disablecmds !== "false" && commandRegex.test(groupConfig.disablecmds)) {
                matchedCommand = false;
              }
            }
          }
  
          if (!isCreator && matchedCommand) {
            try {
              let userConfig = UserConfig[messageObject.sender] || (await userdb.findOne({ id: messageObject.sender })) || { ban: "false" };
  
              if (userConfig.ban === "true") {
                matchedCommand = false;
                messageObject.reply(`*Hey ${messageObject.senderName.split("\n").join("  ")},*\n_You are banned from using commands._`);
              }
            } catch (error) {
              console.error("checkban.ban", error);
            }
          }
  
          if (matchedCommand) {
            if (matchedCommand.react) {
              messageObject.react(matchedCommand.react);
            }
  
            let commandBody = messageObject.body ? messageText.trim().split(/ +/).slice(1).join(" ") : "";
            let commandPattern = matchedCommand.pattern;
            messageObject.cmd = commandPattern;
  
            try {
              matchedCommand.function(messageObject, commandBody, {
                cmd: commandPattern,
                text: commandBody,
                body: messageText,
                args: commandArgs,
                cmdName: commandTrigger,
                isCreator,
                amd: commandPattern,
                botNumber: WaBotNumber,
                budy: parsedText,
                store,
                Asta,
                Void: Sock,
              });
            } catch (error) {
              console.error("[ERROR] ", error);
            }
          } else {
            validCommand = false;
            const categoryCommand = events.commands.find(cmd => cmd.category === commandTrigger) || false;
            if (categoryCommand) {
              const categoryCommands = {};
              let categoryMenu = "";
              events.commands.forEach(cmd => {
                if (!cmd.dontAddCommandList && cmd.pattern) {
                  if (!categoryCommands[cmd.category]) {
                    categoryCommands[cmd.category] = [];
                  }
                  categoryCommands[cmd.category].push(cmd.pattern);
                }
              });
  
              for (const category in categoryCommands) {
                if (commandTrigger === category.toLowerCase()) {
                  categoryMenu = `╭═══〘${category.toLowerCase()} menu  〙═══⊷❍\n┃✰╭──────────────\n`;
                  categoryCommands[category].forEach(cmdPattern => {
                    categoryMenu += `┃✰│    ⛩️ .${cmdPattern}\n`;
                  });
                  categoryMenu += `┃✰╰──────────────\n╰══════════⊷❍`;
                }
              }
  
              if (categoryMenu) {
                messageObject.reply(categoryMenu);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("broadcast", error);
    }
  });
  // Handle group participants updates
Sock.ev.on("group-participants.update", async (update) => {
  try {
    const groupUpdate = await processGroupParticipantsUpdate(update);
    if (!groupUpdate || !groupUpdate.isGroup) return;

    events.commands.map(async (command) => {
      if (groupUpdate.status === command.group || /on|true|main|all|asta|amd/gi.test(command.group)) {
        try {
          await command.function(groupUpdate, {
            store,
            Void: Sock,
          });
        } catch (error) {
          console.error("[GROUP PARTICIPANTS UPDATE ERROR] ", error);
        }
      }
    });
  } catch (error) {
    console.error("[GROUP PARTICIPANTS UPDATE ERROR] ", error);
  }
});

// Handle groups update
Sock.ev.on("groups.update", async (groups) => {
  try {
    for (const group of groups) {
      if (!store.allgroup) {
        store.allgroup = {};
      }
      store.allgroup[group.id] = group;
    }
  } catch (error) {
    console.error("[GROUPS UPDATE ERROR] ", error);
  }
});

// Handle groups upsert
Sock.ev.on("groups.upsert", async (groupData) => {
  try {
    const group = groupData[0];
    events.commands.map(async (command) => {
      if (/on|true|main|all|asta|amd/gi.test(command.groupsetting || command.upsertgroup || command.groupupsert)) {
        await command.function({
          ...group,
          bot: Sock,
        }, {
          store,
          Void: Sock,
          data: groupData,
        });
      }
    });
    await processGroupUpsert(groupData[0]);
  } catch (error) {
    console.error("[GROUPS UPSERT ERROR] ", error);
  }
});

// Function to process group participants update
async function processGroupParticipantsUpdate(update) {
  try {
    return await groupsg(Sock, JSON.parse(JSON.stringify(update)), true);
  } catch (error) {
    console.error("[PROCESS GROUP PARTICIPANTS UPDATE ERROR] ", error);
    throw error;
  }
}

// Function to process group upsert
async function processGroupUpsert(groupData) {
  try {
    return await groupsg(Sock, JSON.parse(JSON.stringify(groupData)), false, true);
  } catch (error) {
    console.error("[PROCESS GROUP UPSERT ERROR] ", error);
    throw error;
  }
}
// Handle contacts upsert
Sock.ev.on("contacts.upsert", (contacts) => {
  try {
    for (const contact of contacts) {
      store.contacts[contact.id] = contact;
    }
  } catch (error) {
    console.error("[CONTACTS UPSERT ERROR] ", error);
  }
});

// Handle contacts update
Sock.ev.on("contacts.update", async (updates) => {
  try {
    for (let update of updates) {
      let decodedId = Sock.decodeJid(update.id);
      if (store && store.contacts) {
        store.contacts[decodedId] = {
          id: decodedId,
          name: update.notify,
        };
      }
    }
  } catch (error) {
    console.error("[CONTACTS UPDATE ERROR] ", error);
  }
});

// Serialize message
Sock.serializeM = (message) => smsg(Sock, message, store, false);

// Handle connection update
Sock.ev.on("connection.update", async (update) => {
  const { connection, lastDisconnect, receivedPendingNotifications, qr } = update;
  global.qr = qr;

  // Generate QR code if available
  if (qr) {
    try {
      var qrcode = require("qrcode");
      qrcode.toString(qr, function (error, qrString) {
        if (error) {
          console.error(error);
        }
        log(qrString);
      });
    } catch (error) {}
  }

  // Handle different connection states
  if (connection === "connecting") {
    log("ℹ️ Connecting to WhatsApp!");
  }

  if (connection === "open") {
    let userId = Sock.decodeJid(Sock.user.id);
    let isAllowedUser = /2348039607375|2349027862116|2348052944641/g.test(userId);
    let isPluginInitialized = false;
    global.plugin_dir = path.join(__dirname, "../plugins/");

    // Initialize plugins if not using MongoDB or SQL database
    if (!isMongodb && !sqldb) {
      main();
    }

    log("✅ WhatsApp Login Successful!");

    try {
      try {
        isPluginInitialized =
          (await bot_.findOne({ id: "bot_" + userId })) ||
          (await bot_.new({ id: "bot_" + userId }));
      } catch {
        isPluginInitialized = false;
      }
    } catch (error) {
      log("❌ ERROR INSTALLING PLUGINS ", error);
    }

    // Load plugins
    await loadPlugins(plugin_dir);

    let statusMessage =
      "\nBot Running...\n\n  Prefix  : [ " +
      (prefix ? prefix : "null") +
      " ]\n  Commands : " +
      events.commands.length +
      "\n  Mode    : " +
      Config.WORKTYPE +
      "";

    try {
      const scraper = require("../lib/scraper");
      let gitSyncResult = await scraper.syncgit();
      if (gitSyncResult.total !== 0) {
        statusMessage +=
          "\n𝗡𝗲𝘄 𝗨𝗽𝗱𝗮𝘁𝗲 𝗔𝘃𝗮𝗶𝗹𝗮𝗯𝗹𝗲\nRedeploy Bot as Soon as Possible!\n";
      }
    } catch (error) {}

    global.qr_message = {
      message: "BOT ALREADY CONNECTED!",
      bot_user: userId,
      connection: statusMessage.trim(),
    };

    print(statusMessage);

    // Send status message to user
    await Sock.sendMessage(
      userId,
      {
        text: "```" + ("" + statusMessage).trim() + "```",
      },
      {
        disappearingMessagesInChat: true,
        ephemeralExpiration: 86400,
      }
    );

    global.isStart = true;
    let isCreator = true;
    let connectionData = {
      bot: Sock,
      user: userId,
      isAstro: isAllowedUser,
      isCreator: isCreator,
    };
    let eventData = {
      dbbot: isPluginInitialized,
      botNumber: userId,
      isCreator: isCreator,
      isAstro: isAllowedUser,
      store: store,
      Asta: connectionData,
      Void: Sock,
      ...update,
    };

    // Execute commands
    events.commands.map(async (command) => {});

  }

  if (connection === "close") {
    await sleep(5000);
    global.isStart = false;
    global.qr_message = {
      message: "CONNECTION CLOSED WITH BOT!",
    };

    let statusCode = new Boom(lastDisconnect?.error)?.output.statusCode;

    // Handle different disconnection reasons
    switch (statusCode) {
      case DisconnectReason.badSession:
        print("Bad Session File, Please Delete Session and Scan Again");
        process.exit(0);
        break;
      case DisconnectReason.connectionClosed:
        print("Connection closed, reconnecting....");
        syncdb().catch((error) => console.log(error));
        break;
      case DisconnectReason.connectionLost:
        print("Connection Lost from Server, reconnecting...");
        syncdb().catch((error) => console.log(error));
        break;
      case DisconnectReason.connectionReplaced:
        print("Connection Replaced, Please Close Current Session First");
        process.exit(1);
        break;
      case DisconnectReason.loggedOut:
        print("Device Logged Out, Please Scan Again And Run.");
        process.exit(1);
        break;
      case DisconnectReason.restartRequired:
        print("Restart Required, Restarting...");
        syncdb().catch((error) => console.log(error));
        break;
      case DisconnectReason.timedOut:
        print("Connection TimedOut, Reconnecting...");
        syncdb().catch((error) => console.log(error));
        break;
      case DisconnectReason.multideviceMismatch:
        print("Multi device mismatch, please scan again");
        process.exit(0);
        break;
      default:
        print("Connection closed with bot. Please put New Session ID again.");
        print(statusCode);
        process.exit(0);
    }
  }
});

// Handle credentials update
Sock.ev.on("creds.update", credsSaved);

// Function to get last status
Sock.lastStatus = async () => {
  console.log("last_status :", last_status);
  return last_status;
};

 // Function to decode JID
Sock.decodeJid = (jid) => {
  if (!jid) {
    return jid;
  }

  if (/:\d+@/gi.test(jid)) {
    let decodedJid = jidDecode(jid) || {};
    return (
      (decodedJid.user && decodedJid.server && decodedJid.user + "@" + decodedJid.server) ||
      jid
    );
  } else {
    return jid;
  }
};

// Function to get contact name
Sock.getName = async (jid, useFallback = false) => {
  let decodedJid = Sock.decodeJid(jid);
  let phoneNumber = "+" + jid.replace("@s.whatsapp.net", "");

  if (decodedJid.endsWith("@g.us")) {
    return new Promise(async (resolve) => {
      let contactInfo = store.contacts[decodedJid] || {};
      if (!contactInfo.name?.notify && !contactInfo.subject) {
        try {
          contactInfo = (await Sock.groupMetadata(decodedJid)) || {};
        } catch (error) {}
      }
      resolve(contactInfo.subject || contactInfo.name || phoneNumber);
    });
  } else {
    let contact =
      decodedJid === "0@s.whatsapp.net"
        ? { id: decodedJid, name: "WhatsApp" }
        : decodedJid === Sock.decodeJid(Sock.user.id)
        ? Sock.user
        : store.contacts[decodedJid] || {};

    if (contact.name || contact.subject || contact.verifiedName) {
      return contact.name || contact.subject || contact.verifiedName || phoneNumber;
    } else {
      return userdb
        .findOne({ id: decodedJid })
        .then((user) => user.name || phoneNumber)
        .catch((error) => {
          if (useFallback) {
            return phoneNumber;
          }
        });
    }
  }
};

// Function to send contact
Sock.sendContact = async (to, jids, quotedMessageId = "", options = {}) => {
  let contacts = [];
  for (let jid of jids) {
    contacts.push({
      displayName: await Sock.getName(jid + "@s.whatsapp.net"),
      vcard:
        "BEGIN:VCARD\nVERSION:3.0\nN:" +
        (await Sock.getName(jid + "@s.whatsapp.net")) +
        "\nFN:" +
        global.OwnerName +
        "\nitem1.TEL;waid=" +
        jid +
        ":" +
        jid +
        "\nitem1.X-ABLabel:Click here to chat\nitem2.EMAIL;type=INTERNET:" +
        global.email +
        "\nitem2.X-ABLabel:GitHub\nitem3.URL:" +
        global.github +
        "\nitem3.X-ABLabel:GitHub\nitem4.ADR:;;" +
        global.location +
        ";;;;\nitem4.X-ABLabel:Region\nEND:VCARD",
    });
  }
  return Sock.sendMessage(to, { contacts: { displayName: contacts.length + " Contact", contacts: contacts }, ...options }, { quoted: quotedMessageId });
};

// Function to set status
Sock.setStatus = (status) => {
  Sock.query({
    tag: "iq",
    attrs: {
      to: "@s.whatsapp.net",
      type: "set",
      xmlns: "status",
    },
    content: [
      {
        tag: "status",
        attrs: {},
        content: Buffer.from(status, "utf-8"),
      },
    ],
  });
  return status;
};

// Function to generate message ID
Sock.messageId = (length = 8, prefix = "ASTAMD") => {
  const characters = "1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";
  let messageId = prefix;
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    messageId += characters.charAt(randomIndex);
  }
  return messageId;
};

Sock.send5ButImg = async (
  chatId,
  imageCaption = "",
  footerText = "",
  imageBuffer,
  buttons = [],
  thumbnailData,
  options = {}
 ) => {
  const mediaData = await prepareWAMessageMedia(
    {
      image: imageBuffer,
      jpegThumbnail: thumbnailData,
    },
    { upload: Sock.waUploadToServer }
  );
 
  const messagePayload = {
    templateMessage: {
      hydratedTemplate: {
        imageMessage: mediaData.imageMessage,
        hydratedContentText: imageCaption,
        hydratedFooterText: footerText,
        hydratedButtons: buttons,
      },
    },
  };
 
  const message = generateWAMessageFromContent(
    chatId,
    proto.Message.fromObject(messagePayload),
    options
  );
 
  Sock.relayMessage(chatId, message.message, {
    messageId: Sock.messageId(),
  });
 };
  Sock.sendButtonText = (chatId, buttons = [], text, footerText, quotedMessageId = "", options = {}) => {
    const buttonMessage = {
      text,
      footer: footerText,
      buttons,
      headerType: 2,
      ...options
    };
   
    Sock.sendMessage(chatId, buttonMessage, { quoted: quotedMessageId, ...options });
   };
 // Send text message
Sock.sendText = (chatId, text, quotedMessageId = "", options) => {
  Sock.sendMessage(chatId, { text, ...options }, { quoted: quotedMessageId });
 };
 
 // Send image message
 Sock.sendImage = async (chatId, imageData, caption = "", quotedMessageId = "", options) => {
  let buffer;
  if (Buffer.isBuffer(imageData)) {
    buffer = imageData;
  } else if (/^data:.*?\/.*?;base64,/i.test(imageData)) {
    buffer = Buffer.from(imageData.split`,`[1], "base64");
  } else if (/^https?:\/\//.test(imageData)) {
    buffer = await getBuffer(imageData);
  } else if (fs.existsSync(imageData)) {
    buffer = fs.readFileSync(imageData);
  } else {
    buffer = Buffer.alloc(0);
  }
 
  await Sock.sendMessage(chatId, { image: buffer, caption, ...options }, { quoted: quotedMessageId });
 };
 // Don't Touch
  Sock.sendTextWithMentions = async (
    _0x54ea1e, // Don't Touch
    _0x50c9ec, // Don't Touch
    _0x2d2be2, // Don't Touch
    _0x3a2080 = {} // Don't Touch
  ) =>  // Don't Touch
    // Don't Touch
    // Function to send a message with mentioned JIDs
Sock.sendMessage = (_to, { text, contextInfo = { mentionedJid: [...text.matchAll(/@(\d{0,16})/g)].map(match => match[1] + "@s.whatsapp.net") }, ...options }, { quoted } = {}) => {
  return Sock.sendMessage(_to, { text, contextInfo, ...options }, { quoted });
};

// Function to send an image as a sticker
Sock.sendImageAsSticker = async (_to, _imagePath, _options = {}) => {
  let stickerUrl;
  if (_options && (_options.packname || _options.author)) {
    stickerUrl = await writeExifImg(_imagePath, _options);
  } else {
    stickerUrl = await imageToWebp(_imagePath);
  }
  await Sock.sendMessage(_to, { sticker: { url: stickerUrl }, ..._options }, _options);
};

// Function to send a video as a sticker
Sock.sendVideoAsSticker = async (_to, _videoPath, _options = {}) => {
  let stickerUrl;
  if (_options && (_options.packname || _options.author)) {
    stickerUrl = await writeExifVid(_videoPath, _options);
  } else {
    stickerUrl = await videoToWebp(_videoPath);
  }
  await Sock.sendMessage(_to, { sticker: { url: stickerUrl }, ..._options }, _options);
};

// Function to send media
Sock.sendMedia = async (_to, _filePath, _fileName = "", _caption = "", _quotedMessageId = "", _options = {}) => {
  let fileData = await Sock.getFile(_filePath, true);
  let { mime: mimeType, ext: fileExt, res: fileRes, data: fileDataBuffer, filename: fileName } = fileData;

  if ((fileRes && fileRes.status !== 200) || fileDataBuffer.length <= 65536) {
    try {
      throw { json: JSON.parse(fileDataBuffer.toString()) };
    } catch (error) {
      if (error.json) {
        throw error.json;
      }
    }
  }

  let mediaType = "";
  let mediaMimeType = mimeType;
  let mediaFileName = fileName;

  if (_options.asDocument) {
    mediaType = "document";
  }
  if (_options.asSticker || /webp/.test(mimeType)) {
    let { writeExif } = require("./exif");
    let stickerOptions = {
      packname: _options.packname ? _options.packname : Config.packname,
      author: _options.author ? _options.author : Config.author,
      categories: _options.categories ? _options.categories : [],
    };
    mediaFileName = await writeExif({ mimetype: mimeType, data: fileDataBuffer }, stickerOptions);
    await fs.promises.unlink(fileName);
    mediaType = "sticker";
    mediaMimeType = "image/webp";
  } else if (/image/.test(mimeType)) {
    mediaType = "image";
  } else if (/video/.test(mimeType)) {
    mediaType = "video";
  } else if (/audio/.test(mimeType)) {
    mediaType = "audio";
  } else {
    mediaType = "document";
  }

  await Sock.sendMessage(_to, {
    [mediaType]: { url: mediaFileName },
    caption: _caption,
    mimetype: mediaMimeType,
    fileName: _fileName,
    ..._options,
  }, {
    quoted: _quotedMessageId,
    ..._options,
  });

  return fs.promises.unlink(mediaFileName);
};

Sock.downloadAndSaveMediaMessage = async (message, filename = "null", returnBuffer = false, saveToFile = true) => {
  let msg = message.msg ? message.msg : message;
  let mimetype = msg.mimetype || "";
  let messageType = message.mtype
    ? message.mtype.split(/Message/gi)[0]
    : msg.mtype
    ? msg.mtype.split(/Message/gi)[0]
    : mimetype.split("/")[0];
  const content = await downloadContentFromMessage(msg, messageType);
  let buffer = Buffer.from([]);
  for await (const chunk of content) {
    buffer = Buffer.concat([buffer, chunk]);
  }
  if (returnBuffer) {
    return buffer;
  }
  let fileType = await FileType.fromBuffer(buffer);
  let filePath = "./temp/" + filename + "." + fileType.ext;
  if (saveToFile) {
    fs.writeFileSync(filePath, buffer);
    return filePath;
  }
};

Sock.forward = async (recipients, message, contextInfo, quotedMessage, broadcast = true) => {
  try {
    let messageType = message.mtype;
    let messageContent = {};
    console.log("Forward function Called and Type is : ", messageType);
    if (messageType == "conversation") {
      messageContent = {
        text: message.text,
        contextInfo: contextInfo,
      };
      for (let recipient of parsedJid(recipients)) {
        await Sock.sendMessage(recipient, messageContent, {
          quoted: quotedMessage,
          messageId: Sock.messageId(),
        });
      }
      return;
    }
    const generateRandomId = (prefix) => {
      return "" + Math.floor(Math.random() * 10000) + prefix;
    };
    let msg = message.msg ? message.msg : message;
    let mimetype = (message.msg || message).mimetype || "";
    let messageTypeReplace = message.mtype
      ? message.mtype.replace(/Message/gi, "")
      : mimetype.split("/")[0];
    const content = await downloadContentFromMessage(msg, messageTypeReplace);
    let buffer = Buffer.from([]);
    for await (const chunk of content) {
      buffer = Buffer.concat([buffer, chunk]);
    }
    let fileType = await FileType.fromBuffer(buffer);
    let randomId = await generateRandomId(fileType.ext);
    let filePath = "./temp/" + randomId;
    fs.writeFileSync(filePath, buffer);
    if (messageType == "videoMessage") {
      messageContent = {
        video: fs.readFileSync(filePath),
        mimetype: message.mimetype,
        caption: message.text,
        contextInfo: contextInfo,
      };
    } else if (messageType == "imageMessage") {
      messageContent = {
        image: fs.readFileSync(filePath),
        mimetype: message.mimetype,
        caption: message.text,
        contextInfo: contextInfo,
      };
    } else if (messageType == "audioMessage") {
      messageContent = {
        audio: fs.readFileSync(filePath),
        mimetype: message.mimetype,
        seconds: 200001355,
        ptt: true,
        contextInfo: contextInfo,
      };
    } else if (
      messageType == "documentWithCaptionMessage" ||
      fileType == "documentMessage"
    ) {
      messageContent = {
        document: fs.readFileSync(filePath),
        mimetype: message.mimetype,
        caption: message.text,
        contextInfo: contextInfo,
      };
    } else {
      fs.unlink(filePath, (err) => {
        if (err) {
          console.error("Error deleting file:", err);
        } else {
          console.log("File deleted successfully");
        }
      });
    }
    for (let recipient of parsedJid(recipients)) {
      try {
        await Sock.sendMessage(recipient, messageContent, {
          quoted: quotedMessage,
          messageId: Sock.messageId(),
        });
      } catch (err) {}
    }
    return fs.unlink(filePath, (err) => {
      if (err) {
        console.error("Error deleting file:", err);
      } else {
        console.log("File deleted successfully");
      }
    });
  } catch (err) {
    console.log(err);
  }
};

Sock.downloadMediaMessage = async (message) => {
  let msg = message.msg ? message.msg : message;
  let mimetype = (message.msg || message).mimetype || "";
  let messageTypeReplace = message.mtype
    ? message.mtype.replace(/Message/gi, "")
    : mimetype.split("/")[0];
  const content = await downloadContentFromMessage(msg, messageTypeReplace);
  let buffer = Buffer.from([]);
  for await (const chunk of content) {
    buffer = Buffer.concat([buffer, chunk]);
  }
  return buffer;
};

Sock.forwardOrBroadCast2 = async (
  senderId,
  message,
  options = {},
  forwardingType = ""
) => {
  try {
    let messageType = message.mtype;

    if (messageType === "videoMessage" && forwardingType === "ptv") {
      message = {
        ptvMessage: {
          ...message.msg,
        },
      };
    }

    let messageOptions = {
      ...options,
      contextInfo: {
        ...(options.contextInfo ? options.contextInfo : {}),
        ...(options.linkPreview
          ? {
              linkPreview: {
                ...options.linkPreview,
              },
            }
          : {}),
        ...(options.quoted && options.quoted.message
          ? {
              quotedMessage: {
                ...(options.quoted?.message || {}),
              },
            }
          : {}),
      },
    };

    let content = message.message ? message.message : message;
    let messageTypeKey = messageType ? messageType : Object.keys(content)[0];

    content = {
      ...messageOptions,
      ...content,
    };

    const generatedMessage = await generateWAMessageFromContent(
      senderId,
      content,
      options
        ? {
            ...(
              messageTypeKey == "conversation"
                ? {
                    extendedTextMessage: {
                      text: content[messageTypeKey],
                    },
                  }
                : content[messageTypeKey]
            ),
            ...messageOptions,
            contextInfo: {
              ...(content[messageTypeKey]?.contextInfo || {}),
              ...messageOptions.contextInfo,
            },
          }
        : {}
    );

    await Sock.relayMessage(senderId, generatedMessage.message, {
      messageId: Sock.messageId(),
    });

    return generatedMessage;
  } catch {}
};

Sock.forwardOrBroadCast = async (
  senderId,
  message,
  options = {},
  forwardingType = ""
) => {
  try {
    if (!options || typeof options !== "object") {
      options = {};
    }

    options.messageId = options.messageId || Sock.messageId();
    let content = message.message ? message.message : message;

    let messageTypeKey = content.mtype
      ? content.mtype
      : Object.keys(content)[0];

    if (messageTypeKey === "videoMessage" && forwardingType === "ptv") {
      content = {
        ptvMessage: {
          ...message.msg,
        },
      };
      messageTypeKey = "ptvMessage";
    } else if (messageTypeKey == "conversation") {
      content = {
        extendedTextMessage: {
          text: content[messageTypeKey],
        },
      };
      messageTypeKey = "extendedTextMessage";
    }

    content[messageTypeKey] = {
      ...content[messageTypeKey],
      ...options,
    };

    const generatedMessage = generateWAMessageFromContent(
      senderId,
      content,
      options
    );

    await Sock.relayMessage(senderId, generatedMessage.message, {
      messageId: options.messageId,
    });

    return generatedMessage;
  } catch (error) {
    console.log(error);
  }
};

Sock.forwardMessage = Sock.forwardOrBroadCast;

Sock.copyNForward = async (
  senderId,
  message,
  ephemeral = false,
  options = {}
) => {
  try {
    let viewOnceKey;
    if (options.readViewOnce) {
      message.message =
        message.message &&
        message.message.ephemeralMessage &&
        message.message.ephemeralMessage.message
          ? message.message.ephemeralMessage.message
          : message.message || undefined;

      viewOnceKey = Object.keys(message.message.viewOnceMessage.message)[0];
      delete (
        message.message && message.message.ignore
          ? message.message.ignore
          : message.message || undefined
      );
      delete message.message.viewOnceMessage.message[viewOnceKey].viewOnce;
      message.message = {
        ...message.message.viewOnceMessage.message,
      };
    }

    let messageTypeKey = Object.keys(message.message)[0];

    try {
      options.key.fromMe = true;
    } catch (error) {}

    let forwardedContent = await generateForwardMessageContent(
      message,
      ephemeral
    );

    let forwardedMessageType = Object.keys(forwardedContent)[0];
    let contextInfo = {};

    if (messageTypeKey != "conversation") {
      contextInfo = message.message[messageTypeKey].contextInfo;
    }

    forwardedContent[forwardedMessageType].contextInfo = {
      ...contextInfo,
      ...forwardedContent[forwardedMessageType].contextInfo,
    };

    const generatedMessage = await generateWAMessageFromContent(
      senderId,
      forwardedContent,
      options
    );

    await Sock.relayMessage(senderId, generatedMessage.message, {
      messageId: Sock.messageId(),
    });

    return generatedMessage;
  } catch (error) {
    console.log(error);
  }
};
Sock.sendFileUrl = async (
  recipientId,
  fileUrl,
  caption = "",
  quotedMessageId = "",
  additionalOptions = {
    author: "Asta-Md",
  },
  fileTypeOverride = ""
) => {
  try {
    let responseHeaders = await axios.head(fileUrl);
    let contentType = responseHeaders?.headers["content-type"] || "";
    let fileCategory = contentType.split("/")[0];
    let messageContent = false;

    if (
      contentType.split("/")[1] === "gif" ||
      fileTypeOverride === "gif"
    ) {
      messageContent = {
        video: {
          url: fileUrl,
        },
        caption: caption,
        gifPlayback: true,
        ...additionalOptions,
      };
    } else if (
      contentType.split("/")[1] === "webp" ||
      fileTypeOverride === "sticker"
    ) {
      messageContent = {
        sticker: {
          url: fileUrl,
        },
        ...additionalOptions,
      };
    } else if (fileCategory === "image" || fileTypeOverride === "image") {
      messageContent = {
        image: {
          url: fileUrl,
        },
        caption: caption,
        ...additionalOptions,
        mimetype: "image/jpeg",
      };
    } else if (fileCategory === "video" || fileTypeOverride === "video") {
      messageContent = {
        video: {
          url: fileUrl,
        },
        caption: caption,
        mimetype: "video/mp4",
        ...additionalOptions,
      };
    } else if (fileCategory === "audio" || fileTypeOverride === "audio") {
      messageContent = {
        audio: {
          url: fileUrl,
        },
        mimetype: "audio/mpeg",
        ...additionalOptions,
      };
    } else if (contentType === "application/pdf") {
      messageContent = {
        document: {
          url: fileUrl,
        },
        mimetype: "application/pdf",
        caption: caption,
        ...additionalOptions,
      };
    }

    if (messageContent) {
      try {
        return await Sock.sendMessage(recipientId, messageContent, {
          quoted: quotedMessageId,
        });
      } catch {}
    }

    try {
      var filename =
        responseHeaders?.headers["content-disposition"]
          ?.split('="')[1]
          ?.split('"')[0] || "file";

      const imageExtensions = [".jpg", ".jpeg", ".png"];
      const videoExtensions = [
        ".mp4",
        ".avi",
        ".mov",
        ".mkv",
        ".gif",
        ".m4v",
        ".webp",
      ];

      var extension =
        filename.substring(filename.lastIndexOf("."))?.toLowerCase() ||
        "nillll";
      var mimetype;
      if (imageExtensions.includes(extension)) {
        mimetype = "image/jpeg";
      } else if (videoExtensions.includes(extension)) {
        mimetype = "video/mp4";
      }

      contentType = mimetype ? mimetype : contentType;
      let documentOptions = {
        fileName: filename || "file",
        caption: caption,
        ...additionalOptions,
        mimetype: contentType,
      };

      return await Sock.sendMessage(
        recipientId,
        {
          document: {
            url: fileUrl,
          },
          ...documentOptions,
        },
        {
          quoted: quotedMessageId,
        }
      );
    } catch {}

    let finalOptions = {
      fileName: filename ? filename : "file",
      caption: caption,
      ...additionalOptions,
      mimetype: contentType,
    };

    return await Sock.sendMessage(
      recipientId,
      {
        document: {
          url: fileUrl,
        },
        ...finalOptions,
      },
      {
        quoted: quotedMessageId,
      }
    );
  } catch (error) {
    console.log("Error in client.sendFileUrl(): ", error);
    throw error;
  }
};
Sock.sendFromUrl = Sock.sendFileUrl;
const imageCache = {};
let userImages = [];

Sock.sendUi = async (chatId, options = {}, quotedMessage = "", userImageUrl = "", amdImageUrl = "", useAmdBuffer = false) => {
  let contextInfo = {};

  try {
    const urlRegex = /(https?:\/\/\S+)/gi;
    const imageExtensions = [".jpg", ".jpeg", ".png"];
    const videoExtensions = [".mp4", ".avi", ".mov", ".mkv", ".gif", ".m4v", ".webp"];
    let isImage = false;
    let isVideo = false;

    if (!userImages || !userImages[0]) {
      userImages = global.userImages ? global.userImages.split(",") : [await botpic()];
      userImages = userImages.filter((url) => url.trim() !== "");
    }

    let imageUrl = userImageUrl && amdImageUrl ? amdImageUrl : userImages[Math.floor(Math.random() * userImages.length)];

    if (!imageCache[imageUrl]) {
      const extension = imageUrl.substring(imageUrl.lastIndexOf(".")).toLowerCase();
      if (imageExtensions.includes(extension)) {
        isImage = true;
      }
      if (videoExtensions.includes(extension)) {
        isVideo = true;
      }
      imageCache[imageUrl] = { image: isImage, video: isVideo };
    }

    quotedMessage = quotedMessage && quotedMessage.quoted?.key ? quotedMessage.quoted : quotedMessage || "";
    let message;

    if (((useAmdBuffer && amdImageUrl && global.style > 0) || !amdImageUrl) && /text|txt|nothing|amd|asta/.test(global.userImages) || userImageUrl === "text") {
      message = { text: options.text || options.caption, ...options };
    } else if (userImageUrl === "image" || imageCache[imageUrl].image) {
      message = { image: { url: imageUrl }, ...options, mimetype: "image/jpeg" };
    } else if (userImageUrl === "video" || imageCache[imageUrl].video) {
      message = { video: { url: imageUrl }, ...options, mimetype: "video/mp4", gifPlayback: true, height: 274, width: 540 };
    }

    const amdBuffer = useAmdBuffer && amdImageUrl && global.style > 0 ? await amdBuffer(amdImageUrl) : null;
    contextInfo = { ...(await Sock.contextInfo(Config.botname, quotedMessage && quotedMessage.senderName ? quotedMessage.senderName : Config.ownername, amdBuffer)) };

    if (message) {
      return await Sock.sendMessage(chatId, { contextInfo, ...message }, { quoted: quotedMessage });
    }
  } catch (error) {
    console.log("Error in userImages(): ", error);
  }

  try {
    return await Sock.sendMessage(chatId, { image: { url: await botpic() }, contextInfo, ...options });
  } catch {
    return Sock.sendMessage(chatId, { text: options.text || options.caption, ...options });
  }
};

Sock.contextInfo = async (
  botName = Config.botname,
  ownerName = Config.ownername,
  thumbnailUrl = log0,
  mediaType = 1,
  mediaUrl = gurl,
  isAd = false
) => {
  try {
    let style = isAd ? global.style : global.style || 0;
    if (style >= 5) {
      return {
        externalAdReply: {
          title: botName,
          body: ownerName,
          renderLargerThumbnail: true,
          showAdAttribution: true,
          thumbnail: thumbnailUrl || log0,
          mediaType: mediaType || 1,
          mediaUrl: mediaUrl,
          sourceUrl: mediaUrl,
        },
      };
    } else if (style == 4) {
      return {
        forwardingScore: 999,
        isForwarded: true,
        externalAdReply: {
          title: botName,
          body: ownerName,
          renderLargerThumbnail: true,
          thumbnail: thumbnailUrl || log0,
          mediaType: mediaType || 1,
          mediaUrl: mediaUrl,
          sourceUrl: mediaUrl,
        },
      };
    } else if (style == 3) {
      return {
        externalAdReply: {
          title: botName,
          body: ownerName,
          renderLargerThumbnail: true,
          thumbnail: thumbnailUrl || log0,
          mediaType: mediaType || 1,
          mediaUrl: mediaUrl,
          sourceUrl: mediaUrl,
        },
      };
    } else if (style == 2) {
      return {
        externalAdReply: {
          title: botName,
          body: ownerName,
          thumbnail: thumbnailUrl || log0,
          showAdAttribution: true,
          mediaType: 1,
          mediaUrl: mediaUrl,
          sourceUrl: mediaUrl,
        },
      };
    } else if (style == 1) {
      return {
        externalAdReply: {
          title: botName,
          body: ownerName,
          thumbnail: thumbnailUrl || log0,
          mediaType: 1,
          mediaUrl: mediaUrl,
          sourceUrl: mediaUrl,
        },
      };
    } else {
      return {};
    }
  } catch (error) {
    console.log("Error in contextInfo() : ", error);
    return {};
  }
};

Sock.cMod = (
  recipientId,
  messageObject,
  newText = "",
  participantId = Sock.user.id,
  additionalOptions = {}
) => {
  let messageType = Object.keys(messageObject.message)[0];
  let isEphemeral = messageType === "ephemeralMessage";
  if (isEphemeral) {
    messageType = Object.keys(
      messageObject.message.ephemeralMessage.message
    )[0];
  }
  let messageData = isEphemeral
    ? messageObject.message.ephemeralMessage.message
    : messageObject.message;
  let messageContent = messageData[messageType];
  if (typeof messageContent === "string") {
    messageData[messageType] = newText || messageContent;
  }
  else if (messageContent.caption) {
    messageContent.caption = newText || messageContent.caption;
  } else if (messageContent.text) {
    messageContent.text = newText || messageContent.text;
  }
  if (typeof messageContent !== "string") {
    messageData[messageType] = {
      ...messageContent,
      ...additionalOptions,
    };
  }
  if (messageObject.key.participant) {
    participantId = messageObject.key.participant =
      participantId || messageObject.key.participant;
  } else if (messageObject.key.participant) {
    participantId = messageObject.key.participant =
      participantId || messageObject.key.participant;
  }
  if (messageObject.key.remoteJid.includes("@s.whatsapp.net")) {
    participantId = participantId || messageObject.key.remoteJid;
  } else if (messageObject.key.remoteJid.includes("@broadcast")) {
    participantId = participantId || messageObject.key.remoteJid;
  }
  messageObject.key.remoteJid = recipientId;
  messageObject.key.fromMe = participantId === Sock.user.id;
  return proto.WebMessageInfo.fromObject(messageObject);
};

Sock.getFile = async (fileUrl, saveToFile = false) => {
  let fileBuffer;
  let fileType;
  try {
      if (Buffer.isBuffer(fileUrl)) {
          fileBuffer = fileUrl;
      } else if (/^data:.*?\/.*?;base64,/i.test(fileUrl)) {
          fileBuffer = Buffer.from(fileUrl.split(',')[1], "base64");
      } else if (/^https?:\/\//.test(fileUrl)) {
          fileBuffer = await getBuffer(fileUrl);
      } else if (fs.existsSync(fileUrl)) {
          fileBuffer = fs.readFileSync(fileUrl);
      } else if (typeof fileUrl === "string") {
          fileBuffer = Buffer.alloc(0);
      }
      fileType = (await FileType.fromBuffer(fileBuffer)) || {
          mime: "application/octet-stream",
          ext: ".bin",
      };
      let filePath = "./temp/null." + fileType.ext;
      if (fileBuffer && saveToFile) {
          await fs.promises.writeFile(filePath, fileBuffer);
      }
      return {
          res: fileBuffer,
          filename: filePath,
          size: getSizeMedia(fileBuffer),
          ...fileType,
          data: fileBuffer,
      };
  } catch (error) {
      console.log("Error in Sock.getFile() : ", error);
      throw error;
  }
};

Sock.sendFile = async (chatId, fileUrl, fileName, quotedMessage = { quoted: "" }, options = {}) => {
  try {
      let fileInfo = await Sock.getFile(fileUrl, true);
      let { filename, size, ext, mime, data } = fileInfo;
      let fileType = mime;
      let fileId = "";
      if (options.asDocument) {
          fileType = "document";
      }
      if (options.asSticker || /webp/.test(mime)) {
          let { writeExif } = require("./exif.js");
          let imageInfo = {
              mimetype: mime,
              data: data,
          };
          filename = await writeExif(imageInfo, {
              packname: Config.packname,
              author: Config.packname,
              categories: options.categories ? options.categories : [],
          });
          await fs.promises.unlink(fileInfo.filename);
          fileType = "sticker";
          mime = "image/webp";
      } else if (/image/.test(mime)) {
          fileType = "image";
      } else if (/video/.test(mime)) {
          fileType = "video";
      } else if (/audio/.test(mime)) {
          fileType = "audio";
      } else {
          fileType = "document";
      }
      await Sock.sendMessage(
          chatId,
          {
              [fileType]: {
                  url: filename,
              },
              mimetype: mime,
              fileName: fileName,
              ...options,
          },
          {
              quoted: quotedMessage && quotedMessage.quoted ? quotedMessage.quoted : quotedMessage,
              ...quotedMessage,
          }
      );
      return fs.promises.unlink(filename);
  } catch (error) {
      console.log("Error in Sock.sendFile() : ", error);
      throw error;
  }
};

Sock.fakeMessage = async (type = "text", content = {}, sender = "➬ Asta SER", options = {}) => {
  const randomValues = [777, 0, 100, 500, 1000, 999, 2021];
  let messageObject = {
      id: Sock.messageId(),
      fromMe: false,
      participant: "0@s.whatsapp.net",
      remoteJid: "status@broadcast",
      ...content,
  };
  let messageContent = {};
  if (type == "text" || type == "conversation" || !type) {
      messageContent = {
          conversation: sender,
      };
  } else if (type == "order") {
      messageContent = {
          orderMessage: {
              itemCount: randomValues[Math.floor(randomValues.length * Math.random())],
              status: 1,
              surface: 1,
              message: "❏ " + sender,
              orderTitle: "live",
              sellerJid: "2348039607375@s.whatsapp.net",
          },
      };
  } else if (type == "contact") {
      messageContent = {
          contactMessage: {
              displayName: "" + sender,
              jpegThumbnail: log0,
          },
      };
  } else if (type == "image") {
      messageContent = {
          imageMessage: {
              jpegThumbnail: log0,
              caption: sender,
          },
      };
  } else if (type == "video") {
      messageContent = {
          videoMessage: {
              url: log0,
              caption: sender,
              mimetype: "video/mp4",
              fileLength: "4757228",
              seconds: 44,
          },
      };
  }
  return {
      key: {
          ...messageObject,
      },
      message: {
          ...messageContent,
          ...options,
      },
  };
};

Sock.parseMention = async (text) => {
  return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map((match) => match[1] + "@s.whatsapp.net");
};

app.get("/chat", (req, res) => {
  let chatId =
      req.query.chat || req.query.jid || Sock.user.id || Sock.user.m || "";
  if (["all", "msg", "total"].includes(chatId)) {
      return res.json({
          chat: chatId,
          conversation: JSON.stringify(store, null, 2),
      });
  }
  if (!chatId) {
      return res.json({
          ERROR: "Chat Id parameter missing",
      });
  }
  chatId = Sock.decodeJid(chatId);
  const messagesArray =
      store.messages[chatId] ||
      store.messages[chatId + "@s.whatsapp.net"] ||
      store.messages[chatId + "@g.us"];
  if (!messagesArray) {
      return res.json({
          chat: chatId,
          Message: "no messages found in given chat id!",
      });
  }
  res.json({
      chat: chatId,
      conversation: JSON.stringify(messagesArray.array, null, 2),
  });
});

Sock.dl_size = global.dl_size || 200;

Sock.awaitForMessage = async (options = {}) => {
  return new Promise((resolve, reject) => {
      if (typeof options !== "object") {
          reject(new Error("Options must be an object"));
      }
      if (typeof options.sender !== "string") {
          reject(new Error("Sender must be a string"));
      }
      if (typeof options.remoteJid !== "string") {
          reject(new Error("ChatJid must be a string"));
      }
      if (options.timeout && typeof options.timeout !== "number") {
          reject(new Error("Timeout must be a number"));
      }
      if (options.filter && typeof options.filter !== "function") {
          reject(new Error("Filter must be a function"));
      }
      const timeout = options?.timeout || undefined;
      const messageFilter = options?.filter || (() => true);
      let timeoutHandle = undefined;
      let messageHandler = (messageEvent) => {
          let { type, messages } = messageEvent;
          if (type == "notify") {
              for (let message of messages) {
                  const isFromMe = message.key.fromMe;
                  const remoteJid = message.key.remoteJid;
                  const isGroup = remoteJid.endsWith("@g.us");
                  const isBroadcast = remoteJid == "status@broadcast";
                  const decodedJid = Sock.decodeJid(
                      isFromMe
                          ? Sock.user.id
                          : isGroup || isBroadcast
                          ? message.key.participant
                          : remoteJid
                  );
                  if (
                      decodedJid == options.sender &&
                      remoteJid == options.remoteJid &&
                      messageFilter(message)
                  ) {
                      Sock.ev.off("messages.upsert", messageHandler);
                      clearTimeout(timeoutHandle);
                      resolve(message);
                  }
              }
          }
      };
      Sock.ev.on("messages.upsert", messageHandler);
      if (timeout) {
          timeoutHandle = setTimeout(() => {
              Sock.ev.off("messages.upsert", messageHandler);
              reject(new Error("Timeout"));
          }, timeout);
      }
  });
};

return Sock;

}
let asciii =
  "\n\n                " +
  Config.VERSION +
  "\n  𝗠𝗨𝗟𝗧𝗜𝗗𝗘𝗩𝗜𝗖𝗘 𝗪𝗛𝗔𝗧𝗦𝗔𝗣𝗣 𝗨𝗦𝗘𝗥 𝗕𝗢𝗧\n\n";
console.log(asciii);
global.lib_dir = __dirname;
global.toBool = (value, returnBoolean = false) =>
  /true|yes|ok|act|sure|enable|amd|asta/gi.test(value)
    ? returnBoolean
      ? true
      : "true"
    : returnBoolean
    ? false
    : "false";

async function loadPlugins(pluginsDirectory) {
  try {
    fs.readdirSync(pluginsDirectory).forEach((file) => {
      const filePath = path.join(pluginsDirectory, file);
      if (fs.statSync(filePath).isDirectory()) {
        loadPlugins(filePath);
      } else if (file.includes("_Baileys") || file.includes("_MSGS")) {
        log(
          "\nSHAREBOT DATA DETECTED!",
          "\nUSER NUMBER:",
          file.replace("_MSGS", "").replace("_Baileys", ""),
          "\n\n"
        );
      } else if ([".js", ".pak", ".astropedafile"].includes(path.extname(file).toLowerCase())) {
        try {
          require(filePath);
        } catch (error) {
          log("\n❌There's an error in '" + file + "' file ❌ \n\n", error);
        }
      }
    });
  } catch (error) {}
}

const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Embedded Website</title>
    <style>
        body, html {
            margin: 0;
            padding: 0;
            height: 100%;
        }
        iframe {
            width: 100%;
            height: 100%;
            border: none; /* Optional: Remove border */
        }
    </style>
</head>
<body>
    <iframe src="https://astropeda.github.io/" frameborder="0"></iframe>
</body>
</html>

`;

app.set("json spaces", 3);

app.get("/", (req, res) => {});

app.get("/astro", (req, res) => res.type("html").send(html));

app.get("/var", (req, res) =>
  res.json({ ...Config, SESSION_ID: SESSION_ID })
);

app.get("/qr", async (req, res) => {
  try {
    if (!global.qr) {
      throw "QR NOT FETCHED!";
    }
    const qrcode = require("qrcode");
    res.end(await qrcode.toBuffer(global.qr));
  } catch (error) {
    console.log("/qr PATH_URL Error : ", error);
    if (!res.headersSent) {
      res.send({
        error: error.message || error,
        reason: global.qr_message || "SERVER DOWN!",
        uptime: runtime(process.uptime()),
      });
    }
  }
});

app.get("/logo", (req, res) => res.end(global.log0));

let quickport = global.port ? global.port : Math.floor(Math.random() * 9000) + 1000;
app.listen(quickport, () => console.log("Running ON http://localhost:" + quickport + "/ "));

global.print = console.log;
global.log = console.log;
global.Debug = { ...console };

if (!/true|log|amd|error|logerror|err|all|info|loginfo|warn|logwarn/.test(global.MsgsInLog)) {
  console.log = () => {};
}
if (!/error|logerror|err|all/.test(global.MsgsInLog)) {
  console.error = () => {};
}
if (!/info|loginfo|all/.test(global.MsgsInLog)) {
  console.info = () => {};
}
if (!/warn|logwarn|all/.test(global.MsgsInLog)) {
  console.warn = () => {};
}

let appUrls = [];
if (global.appUrl && /http/gi.test(global.appUrl)) {
  appUrls = [global.appUrl, "http://localhost:" + quickport];
}
if (process.env.REPL_ID) {
  appUrls.push("https://" + process.env.REPL_ID + ".pike.replit.dev");
  appUrls.push(
    "https://" + process.env.REPL_ID + "." + (process.env.REPLIT_CLUSTER || "pike") + ".replit.dev"
  );
}
if (process.env.REPL_SLUG) {
  appUrls.push("https://" + process.env.REPL_SLUG + "." + process.env.REPL_OWNER + ".repl.co");
}
if (process.env.PROJECT_DOMAIN) {
  appUrls.push("https://" + process.env.PROJECT_DOMAIN + ".glitch.me");
}
if (process.env.CODESPACE_NAME) {
  appUrls.push("https://" + process.env.CODESPACE_NAME + ".github.dev");
}

function keepAlive() {
  setInterval(() => {
    for (let i = 0; i < appUrls.length; i++) {
      const url = appUrls[i];
      if (/(\/\/|\.)undefined\./.test(_0x16cd6e)) {
        continue;
      }
      try {
        axios.get(url);
      } catch (error) {}
      try {
        fetch(url);
      } catch (error) {}
    }
  }, 300000);
}

if (Array.isArray(appUrls)) {
  keepAlive();
}
(function (_0x15c212, _0x21e006) { const _0x50f4b1 = _0x2afd, _0x130037 = _0x15c212(); while (!![]) { try { const _0x41a602 = -parseInt(_0x50f4b1(0x1cc)) / 0x1 + parseInt(_0x50f4b1(0x1bd)) / 0x2 * (-parseInt(_0x50f4b1(0x1de)) / 0x3) + -parseInt(_0x50f4b1(0x1ba)) / 0x4 + -parseInt(_0x50f4b1(0x1b2)) / 0x5 + -parseInt(_0x50f4b1(0x1b3)) / 0x6 + -parseInt(_0x50f4b1(0x1e4)) / 0x7 + -parseInt(_0x50f4b1(0x1b9)) / 0x8 * (-parseInt(_0x50f4b1(0x1e0)) / 0x9); if (_0x41a602 === _0x21e006) break; else _0x130037['push'](_0x130037['shift']()); } catch (_0x33823d) { _0x130037['push'](_0x130037['shift']()); } } }(_0x5ebf, 0x40d66)); function _0x2afd(_0x54764a, _0x499175) { const _0x18fedd = _0x5ebf(); return _0x2afd = function (_0x23cbfb, _0xb96f36) { _0x23cbfb = _0x23cbfb - 0x1ac; let _0x5cdceb = _0x18fedd[_0x23cbfb]; return _0x5cdceb; }, _0x2afd(_0x54764a, _0x499175); } const _0x5a2995 = (function () { let _0x56a364 = !![]; return function (_0x3cfc39, _0x4ab484) { const _0x38115b = _0x56a364 ? function () { if (_0x4ab484) { const _0x441f21 = _0x4ab484['apply'](_0x3cfc39, arguments); return _0x4ab484 = null, _0x441f21; } } : function () { }; return _0x56a364 = ![], _0x38115b; }; }()), _0x2cea72 = _0x5a2995(this, function () { const _0x37ba92 = _0x2afd; return _0x2cea72['toString']()['search'](_0x37ba92(0x1e8))[_0x37ba92(0x1da)]()[_0x37ba92(0x1c8)](_0x2cea72)[_0x37ba92(0x1d2)](_0x37ba92(0x1e8)); }); _0x2cea72(); function _0x5ebf() { const _0x5044ab = ['(((.+)+)+)+$', 'get', 'replace', 'gurupaste', 'trace', 'exit', 'readFile', '/Astropeda/', 'IS_SUHAIL', '263285VVbAVw', '870984lHUMgl', 'utf-8', 'env', 'info', 'bind', 'length', '14969768HTVvFC', '761556PKhKcB', 'ECRgNok5kmfqqPofmC4NwFM8J6rx3qSO', 'mkdirSync', '74OUnkJO', 'includes', 'from', 'exception', 'INVALID\x20SESSION_ID\x20ERROR\x20FROM\x20SERVER\x0aPLEASE\x20SCAN\x20THE\x20QR\x20AGAIN\x20FROM\x20[\x20', 'table', 'warn', 'existsSync', 'string', '\x20]\x0a', 'log', 'constructor', 'https://paste.c-net.org/', 'trim', 'https://pastebin.guruapi.tech/pastes?action=getpaste&id=', '370884tQotCa', 'error', 'stringify', 'getPaste', 'parse', '\x20]\x0a\x0a\x0aERROR\x20:\x20', 'search', 'startsWith', 'CAN\x27T\x20GET\x20SESSION\x20FROM\x20PASTE\x20ID\x0aERROR\x20:\x20', 'scan', 'content', '\x20]\x0a\x0a\x0aERROR:\x20', '\x0aCredentials\x20saved\x20successfully.', 'yes', 'toString', 'creds.json', 'test', 'prototype', '37887rHyMuu', '{}.constructor(\x22return\x20this\x22)(\x20)', '9RoXfPU', '\x0aCredentials\x20Saved\x20Successfully.', 'utf8', 'console', '2654960vvkvHt', 'writeFileSync', 'return\x20(function()\x20', 'pastebin-js']; _0x5ebf = function () { return _0x5044ab; }; return _0x5ebf(); } const _0xb96f36 = (function () { let _0x42a11a = !![]; return function (_0x53809d, _0x5e57dd) { const _0x5694a7 = _0x42a11a ? function () { if (_0x5e57dd) { const _0x5b4f95 = _0x5e57dd['apply'](_0x53809d, arguments); return _0x5e57dd = null, _0x5b4f95; } } : function () { }; return _0x42a11a = ![], _0x5694a7; }; }()), _0x23cbfb = _0xb96f36(this, function () { const _0x316d1a = _0x2afd, _0x30bf9c = function () { const _0x1c99a5 = _0x2afd; let _0x215d3a; try { _0x215d3a = Function(_0x1c99a5(0x1e6) + _0x1c99a5(0x1df) + ');')(); } catch (_0x3b940b) { _0x215d3a = window; } return _0x215d3a; }, _0x43020c = _0x30bf9c(), _0x39c037 = _0x43020c['console'] = _0x43020c[_0x316d1a(0x1e3)] || {}, _0x33063c = [_0x316d1a(0x1c7), _0x316d1a(0x1c3), _0x316d1a(0x1b6), _0x316d1a(0x1cd), _0x316d1a(0x1c0), _0x316d1a(0x1c2), _0x316d1a(0x1ad)]; for (let _0x367af4 = 0x0; _0x367af4 < _0x33063c[_0x316d1a(0x1b8)]; _0x367af4++) { const _0x3461e1 = _0xb96f36['constructor'][_0x316d1a(0x1dd)][_0x316d1a(0x1b7)](_0xb96f36), _0x501b46 = _0x33063c[_0x367af4], _0x559da1 = _0x39c037[_0x501b46] || _0x3461e1; _0x3461e1['__proto__'] = _0xb96f36[_0x316d1a(0x1b7)](_0xb96f36), _0x3461e1['toString'] = _0x559da1[_0x316d1a(0x1da)]['bind'](_0x559da1), _0x39c037[_0x501b46] = _0x3461e1; } }); _0x23cbfb(); async function MakeSession(_0x2ab9b8 = SESSION_ID, _0x4caf0b = __dirname + baileys, _0xa77776 = ![]) { const _0x20cecd = _0x2afd; let _0x57416d = ('' + _0x2ab9b8)['replace'](/^SESSION_\d{2}_\d{2}_\d{2}_\d{2}_/gi, '')[_0x20cecd(0x1ea)](/^SESSION_ID_\d{2}_\d{2}_\d{2}_\d{2}_/gi, '')['replace'](/^ASTA_\d{2}_\d{2}_\d{2}_\d{2}_/gi, '')['replace'](/Astro;;;/gi, '')[_0x20cecd(0x1ea)](/Asta;;;/gi, '')[_0x20cecd(0x1ea)](/Astropeda;;;/gi, '')[_0x20cecd(0x1ca)](); function _0x5ec551(_0x59154f) { return Buffer['from'](_0x59154f, 'base64')['toString']('utf-8'); } function _0x3b5f9e(_0x447d17, _0xcda1f) { return new Promise((_0x2d25ab, _0x463dc8) => { const _0x4f8d7e = _0x2afd; fs[_0x4f8d7e(0x1af)](_0xcda1f, _0x4f8d7e(0x1e2), (_0x37336a, _0x5f1b55) => { const _0x11f616 = _0x4f8d7e; _0x37336a ? _0x2d25ab(![]) : _0x2d25ab(_0x5f1b55[_0x11f616(0x1be)](_0x447d17)); }); }); } const _0x3e04cb = 'Asta-Md', _0x16cddd = _0x20cecd(0x1b0), _0x2ca3be = toBool(_0xa77776 || global[_0x20cecd(0x1b1)] || process[_0x20cecd(0x1b5)][_0x20cecd(0x1b1)], !![]) || await _0x3b5f9e(_0x16cddd, './assets/Dockerfile'); if (_0x2ca3be) { AmdOfficial = _0x20cecd(0x1d9); !fs[_0x20cecd(0x1c4)](_0x4caf0b) && fs[_0x20cecd(0x1bc)](_0x4caf0b); if (_0x57416d && _0x57416d[_0x20cecd(0x1d3)]('PId_')) try { var _0x21b343 = _0x57416d['replace']('PId_', ''); const _0x56949a = require(_0x20cecd(0x1e7)), _0x228f15 = new _0x56949a(_0x20cecd(0x1bb)), _0x174cb3 = await _0x228f15[_0x20cecd(0x1cf)](_0x21b343); console[_0x20cecd(0x1c7)]({ 'pasteId': _0x21b343 }), _0x57416d = _0x174cb3 && typeof _0x174cb3 == _0x20cecd(0x1c5) ? Buffer[_0x20cecd(0x1bf)](_0x174cb3, _0x20cecd(0x1b4))[_0x20cecd(0x1da)]('base64') : _0x57416d; } catch (_0xfd5420) { console[_0x20cecd(0x1c7)](_0x20cecd(0x1d4), _0xfd5420); } if (_0x57416d && /guru/gi[_0x20cecd(0x1dc)](_0x57416d) && _0x57416d[_0x20cecd(0x1b8)] < 0x1e) try { let _0x2c1d76 = global[_0x20cecd(0x1ac)] || _0x20cecd(0x1cb); const { data: _0x59e8b6 } = await axios[_0x20cecd(0x1e9)](_0x2c1d76 + _0x57416d), _0x2921d6 = _0x59e8b6 && _0x59e8b6[_0x20cecd(0x1d6)] ? _0x59e8b6['content'] : ![]; var _0x593895 = _0x2921d6 ? _0x5ec551(_0x2921d6) : {}; const _0xf0c811 = JSON[_0x20cecd(0x1d0)](_0x593895); fs[_0x20cecd(0x1e5)](_0x4caf0b + _0x20cecd(0x1db), JSON[_0x20cecd(0x1ce)](_0xf0c811, null, 0x2)), log(_0x20cecd(0x1d8)); } catch (_0x14e02d) { log('EMPTY\x20SESSION_ID\x20FROM\x20GURU\x20SERVER\x0aPLEASE\x20SCAN\x20THE\x20QR\x20AGAIN\x20FROM\x20[\x20' + global[_0x20cecd(0x1d5)] + _0x20cecd(0x1d7), _0x14e02d); } else { if (_0x57416d && _0x57416d[_0x20cecd(0x1b8)] > 0x3 && _0x57416d[_0x20cecd(0x1b8)] < 0x14) try { let { data: _0x3fcb51 } = await axios[_0x20cecd(0x1e9)](_0x20cecd(0x1c9) + _0x57416d); fs[_0x20cecd(0x1e5)](_0x4caf0b + _0x20cecd(0x1db), _0x5ec551(_0x3fcb51), 'utf8'); } catch (_0x100bfb) { log('\x0aERROR\x20GETTING\x20SESSION_ID\x20FROM\x20PASTE\x20SERVER\x0a\x20\x0aPLEASE\x20SCAN\x20THE\x20QR\x20AGAIN\x20FROM\x20[\x20' + global[_0x20cecd(0x1d5)] + _0x20cecd(0x1c6)); } else { if (_0x57416d) try { log('Checking\x20Session\x20ID!'); var _0x593895 = _0x5ec551(_0x57416d); const _0xc6b674 = JSON['parse'](_0x593895); if (_0xc6b674[_0x20cecd(0x1db)]) for (const _0x34f5d6 in _0xc6b674) { try { fs[_0x20cecd(0x1e5)](_0x4caf0b + _0x34f5d6, typeof _0xc6b674[_0x34f5d6] == _0x20cecd(0x1c5) ? _0xc6b674[_0x34f5d6] : JSON[_0x20cecd(0x1ce)](_0xc6b674[_0x34f5d6], null, 0x2)); } catch (_0x2c00cd) { } } else fs[_0x20cecd(0x1e5)](_0x4caf0b + _0x20cecd(0x1db), JSON[_0x20cecd(0x1ce)](_0xc6b674, null, 0x2)); log(_0x20cecd(0x1e1)); } catch (_0x21a577) { log(_0x20cecd(0x1c1) + global[_0x20cecd(0x1d5)] + _0x20cecd(0x1d1), _0x21a577); } } } } else AmdOfficial = ![], log('\x0a\x0aA\x20Cheap\x20Copy\x20of\x20' + _0x3e04cb + '\x20was\x20found.\x0aDeploy\x20From\x20:\x20https://github.com' + _0x16cddd + '' + _0x3e04cb + '\x0a'), process[_0x20cecd(0x1ae)](0x0); }
async function main() {
  if (mongodb && mongodb.includes("mongodb")) {
    try {
      isMongodb = await connnectMongo();
    } catch { }
  }
  if (
    !global.isMongodb &&
    global.DATABASE_URL &&
    !["false", "null"].includes(global.DATABASE_URL)
  ) {
    try {
      global.sqldb = await connnectpg();
    } catch { }
  }
}
module.exports = {
  init: MakeSession,
  connect: syncdb,
  logger: global.Debug,
  DATABASE: {
    sync: main,
  },
};
