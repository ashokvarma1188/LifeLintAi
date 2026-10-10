const mongoose = require("mongoose");
const EmergencyRequest = require("../models/EmergencyRequest");
const SosMessage = require("../models/SosMessage");
const { SOS_MEDIA_TYPES } = require("../middleware/uploadMiddleware");
const { sendToUsers } = require("../utils/push");

const RESPONDER_ROLES = ["hospital", "police", "firestation"];
const OPEN_STATUSES = ["pending", "accepted", "en_route"];
const RESPONDER_PAGE = { hospital: "/hospital/incoming", police: "/police/alerts", firestation: "/firestation/alerts" };

/**
 * Who may read/write an SOS thread: the civilian who raised it, and any approved
 * responder whose service the alert targets (same rule as accepting it).
 */
async function loadThread(req, res, requestId) {
  if (!mongoose.isValidObjectId(requestId)) {
    res.status(404).json({ message: "Request not found" });
    return null;
  }
  const request = await EmergencyRequest.findById(requestId).select("citizenId targets status respondedBy respondedByRole");
  if (!request) {
    res.status(404).json({ message: "Request not found" });
    return null;
  }
  const isOwner = String(request.citizenId) === String(req.user._id);
  const isResponder = RESPONDER_ROLES.includes(req.user.role) && request.targets.includes(req.user.role);
  if (!isOwner && !isResponder) {
    res.status(404).json({ message: "Request not found" });
    return null;
  }
  return { request, isOwner };
}

const toClient = (m, userId) => ({
  _id: m._id,
  senderRole: m.senderRole,
  senderName: m.senderName,
  kind: m.kind,
  text: m.text || "",
  contentType: m.file?.contentType || null,
  createdAt: m.createdAt,
  mine: String(m.senderId) === String(userId),
});

/** Tells the other side there's something new: responder → civilian, civilian → the responder who accepted. */
async function notifyOtherSide(request, isOwner, message) {
  const preview = message.kind === "photo" ? "📷 Photo" : message.kind === "voice" ? "🎤 Voice note" : message.text.slice(0, 80);
  if (isOwner) {
    if (!request.respondedBy) return;
    await sendToUsers([request.respondedBy], {
      title: "💬 New message on an SOS",
      body: preview,
      url: RESPONDER_PAGE[request.respondedByRole] || "/dashboard",
      tag: `sos-chat-${request._id}`,
    });
  } else {
    await sendToUsers([request.citizenId], {
      title: `💬 ${message.senderName || "Responder"}`,
      body: preview,
      url: "/sos-history",
      tag: `sos-chat-${request._id}`,
      urgent: true,
    });
  }
}

async function saveMessage(req, res, thread, fields) {
  const message = await SosMessage.create({
    requestId: thread.request._id,
    senderId: req.user._id,
    senderRole: thread.isOwner ? "civilian" : req.user.role,
    senderName: thread.isOwner ? req.user.name : req.user.orgName || req.user.name,
    ...fields,
  });
  notifyOtherSide(thread.request, thread.isOwner, message).catch(() => {});
  res.status(201).json({ message: toClient(message, req.user._id) });
}

const listMessages = async (req, res) => {
  try {
    const thread = await loadThread(req, res, req.params.id);
    if (!thread) return;
    const messages = await SosMessage.find({ requestId: thread.request._id }).sort({ createdAt: 1 }).limit(300);
    res.json({
      messages: messages.map((m) => toClient(m, req.user._id)),
      open: OPEN_STATUSES.includes(thread.request.status),
    });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

const postText = async (req, res) => {
  try {
    const thread = await loadThread(req, res, req.params.id);
    if (!thread) return;
    if (!OPEN_STATUSES.includes(thread.request.status)) {
      return res.status(400).json({ message: "This alert is closed — messages can no longer be sent." });
    }
    const text = String(req.body?.text || "").trim();
    if (!text) return res.status(400).json({ message: "Write a message first." });
    if (text.length > 1000) return res.status(400).json({ message: "Messages can be up to 1000 characters." });
    await saveMessage(req, res, thread, { kind: "text", text });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

const postMedia = async (req, res) => {
  try {
    const thread = await loadThread(req, res, req.params.id);
    if (!thread) return;
    if (!OPEN_STATUSES.includes(thread.request.status)) {
      return res.status(400).json({ message: "This alert is closed — messages can no longer be sent." });
    }
    const kind = req.body?.kind;
    if (!req.file || !["photo", "voice"].includes(kind)) {
      return res.status(400).json({ message: "Attach a photo or a voice note." });
    }
    const baseType = req.file.mimetype.split(";")[0];
    if (!SOS_MEDIA_TYPES[kind].includes(baseType)) {
      return res.status(400).json({ message: kind === "photo" ? "That file isn't a photo." : "That file isn't a voice note." });
    }
    await saveMessage(req, res, thread, {
      kind,
      text: String(req.body?.text || "").trim().slice(0, 300),
      file: { contentType: baseType, size: req.file.size, data: req.file.buffer },
    });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

/** Streams a photo/voice note — only to people who can see the alert it belongs to. */
const getMessageFile = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.messageId)) return res.status(404).json({ message: "Not found" });
    const message = await SosMessage.findById(req.params.messageId).select("+file.data");
    if (!message?.file?.data) return res.status(404).json({ message: "Not found" });
    const thread = await loadThread(req, res, message.requestId);
    if (!thread) return;
    res.set("Content-Type", message.file.contentType);
    res.set("Cache-Control", "private, max-age=3600");
    res.send(message.file.data);
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

module.exports = { listMessages, postText, postMedia, getMessageFile };
