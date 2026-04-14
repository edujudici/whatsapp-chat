import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import makeWASocket, { 
  DisconnectReason, 
  useMultiFileAuthState, 
  fetchLatestBaileysVersion,
  proto
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import pino from "pino";
import QRCode from "qrcode";
import fs from "fs";

// Logger
const logger = pino({ level: "silent" });

const SESSIONS_PATH = path.join(process.cwd(), "sessions");
if (!fs.existsSync(SESSIONS_PATH)) {
  fs.mkdirSync(SESSIONS_PATH);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // WhatsApp State
  let sock: any = null;
  let qrCode: string | null = null;
  let connectionStatus: "STOPPED" | "SCAN_QR_CODE" | "WORKING" | "CONNECTING" = "STOPPED";
  let userInfo: any = null;

  // Simple In-Memory Store
  const chats: Record<string, any> = {};
  const messages: Record<string, any[]> = {};

  async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState(path.join(SESSIONS_PATH, "default"));
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
      version,
      printQRInTerminal: true,
      auth: state,
      logger,
      browser: ["WhatsApp MVP", "Chrome", "1.0.0"],
    });

    sock.ev.on("connection.update", async (update: any) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        qrCode = await QRCode.toDataURL(qr);
        connectionStatus = "SCAN_QR_CODE";
      }

      if (connection === "close") {
        const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log("connection closed due to ", lastDisconnect?.error, ", reconnecting ", shouldReconnect);
        connectionStatus = "STOPPED";
        qrCode = null;
        if (shouldReconnect) {
          connectToWhatsApp();
        }
      } else if (connection === "open") {
        console.log("opened connection");
        connectionStatus = "WORKING";
        qrCode = null;
        userInfo = sock.user;
      }
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("chats.upsert", (newChats: any) => {
      newChats.forEach((chat: any) => {
        chats[chat.id] = { ...chats[chat.id], ...chat };
      });
    });

    sock.ev.on("chats.update", (updates: any) => {
      updates.forEach((update: any) => {
        if (chats[update.id]) {
          chats[update.id] = { ...chats[update.id], ...update };
        }
      });
    });

    sock.ev.on("messages.upsert", (m: any) => {
      const msg = m.messages[0];
      if (!msg.key.remoteJid) return;
      
      const chatId = msg.key.remoteJid;
      if (!messages[chatId]) messages[chatId] = [];
      
      messages[chatId].push(msg);
      if (messages[chatId].length > 50) messages[chatId].shift();

      // Update last message in chat
      if (chats[chatId]) {
        chats[chatId].lastMessage = {
          body: msg.message?.conversation || msg.message?.extendedTextMessage?.text || "[Media]",
          timestamp: msg.messageTimestamp
        };
      }
    });
  }

  // API Routes
  app.get("/api/whatsapp/status", (req, res) => {
    res.json({
      status: connectionStatus,
      qr: qrCode,
      user: userInfo,
    });
  });

  app.post("/api/whatsapp/start", async (req, res) => {
    if (connectionStatus === "STOPPED") {
      connectionStatus = "CONNECTING";
      connectToWhatsApp();
      res.json({ message: "Starting connection..." });
    } else {
      res.json({ message: "Already starting or connected" });
    }
  });

  app.post("/api/whatsapp/stop", async (req, res) => {
    if (sock) {
      try {
        await sock.logout();
      } catch (e) {}
      sock = null;
      connectionStatus = "STOPPED";
      userInfo = null;
      fs.rmSync(path.join(SESSIONS_PATH, "default"), { recursive: true, force: true });
      res.json({ message: "Stopped and logged out" });
    } else {
      res.json({ message: "Not connected" });
    }
  });

  app.get("/api/whatsapp/chats", (req, res) => {
    const chatList = Object.values(chats).map(chat => ({
      id: chat.id,
      name: chat.name || chat.id.split("@")[0],
      unreadCount: chat.unreadCount || 0,
      lastMessage: chat.lastMessage
    }));
    res.json(chatList);
  });

  app.get("/api/whatsapp/messages", (req, res) => {
    const { chatId } = req.query;
    if (!chatId) return res.status(400).json({ error: "chatId required" });

    const chatMessages = messages[chatId as string] || [];
    const formatted = chatMessages.map(m => ({
      id: m.key.id,
      body: m.message?.conversation || m.message?.extendedTextMessage?.text || "[Media/Unsupported]",
      fromMe: m.key.fromMe,
      timestamp: m.messageTimestamp
    }));
    res.json(formatted);
  });

  app.post("/api/whatsapp/messages/text", async (req, res) => {
    const { chatId, text } = req.body;
    if (!sock) return res.status(400).json({ error: "Not connected" });

    try {
      const result = await sock.sendMessage(chatId, { text });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
