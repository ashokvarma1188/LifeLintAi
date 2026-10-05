const mongoose = require("mongoose");
const SupportTicket = require("../models/SupportTicket");
const { isCivilian } = require("../constants/roles");

const summarize = (ticket) => {
  const messages = ticket.messages || [];
  const last = messages[messages.length - 1];
  return {
    _id: ticket._id,
    subject: ticket.subject,
    status: ticket.status,
    createdBy: ticket.createdBy,
    messageCount: messages.length,
    lastMessage: last ? { text: last.text, senderRole: last.senderRole, createdAt: last.createdAt } : null,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
  };
};

/** Only a civilian can open a new ticket — org accounts go through Org Profile/admin directly. */
const createTicket = async (req, res) => {
  try {
    if (!isCivilian(req.user.role)) {
      return res.status(403).json({ message: "Only civilian accounts can raise a support ticket" });
    }

    const subject = String(req.body.subject || "").trim();
    const message = String(req.body.message || "").trim();
    if (!subject) return res.status(400).json({ message: "Give your ticket a subject" });
    if (!message) return res.status(400).json({ message: "Describe what you need help with" });

    const ticket = await SupportTicket.create({
      createdBy: req.user._id,
      subject,
      messages: [{ senderId: req.user._id, senderRole: "civilian", text: message }],
    });

    res.status(201).json({ message: "Support ticket submitted", ticket: summarize(ticket) });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

/** The civilian's own tickets, most recently active first. */
const myTickets = async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ createdBy: req.user._id }).sort({ updatedAt: -1 });
    res.json({ tickets: tickets.map(summarize) });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

/** Every ticket, for admin — most recently active first. */
const listAllTickets = async (req, res) => {
  try {
    const tickets = await SupportTicket.find({})
      .populate("createdBy", "name email phone")
      .sort({ updatedAt: -1 });
    res.json({ tickets: tickets.map((t) => ({ ...summarize(t), createdBy: t.createdBy })) });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

/** Only the ticket's own creator, or an admin, can view/act on it. */
const loadAccessibleTicket = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) return null;

  const ticket = await SupportTicket.findById(id)
    .populate("createdBy", "name email phone")
    .populate("messages.senderId", "name");
  if (!ticket) return null;

  const isOwner = String(ticket.createdBy._id) === String(req.user._id);
  if (!isOwner && req.user.role !== "admin") return null;

  return ticket;
};

const getTicket = async (req, res) => {
  try {
    const ticket = await loadAccessibleTicket(req, res);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });
    res.json({ ticket });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

/** Replying also reopens a closed ticket — simplest way to let either side pick a resolved thread back up. */
const replyToTicket = async (req, res) => {
  try {
    const ticket = await loadAccessibleTicket(req, res);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    const text = String(req.body.message || "").trim();
    if (!text) return res.status(400).json({ message: "Message can't be empty" });

    ticket.messages.push({
      senderId: req.user._id,
      senderRole: req.user.role === "admin" ? "admin" : "civilian",
      text,
    });
    ticket.status = "open";
    await ticket.save();

    res.json({ message: "Reply sent", ticket });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

const closeTicket = async (req, res) => {
  try {
    const ticket = await loadAccessibleTicket(req, res);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    ticket.status = "closed";
    await ticket.save();

    res.json({ message: "Ticket closed", ticket: summarize(ticket) });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

module.exports = { createTicket, myTickets, listAllTickets, getTicket, replyToTicket, closeTicket };
