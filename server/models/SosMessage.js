const mongoose = require("mongoose");

/**
 * One entry in an SOS's chat thread between the civilian and the responders:
 * a text message, a photo of the scene, or a short voice note. Media is stored
 * inline (small, capped by the upload middleware) and only served to people
 * allowed to see the alert.
 */
const sosMessageSchema = new mongoose.Schema(
  {
    requestId: { type: mongoose.Schema.Types.ObjectId, ref: "EmergencyRequest", required: true, index: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    senderRole: { type: String, enum: ["civilian", "hospital", "police", "firestation"], required: true },
    senderName: { type: String },
    kind: { type: String, enum: ["text", "photo", "voice"], default: "text" },
    text: { type: String, maxlength: 1000 },
    file: {
      contentType: { type: String },
      size: { type: Number },
      data: { type: Buffer, select: false },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SosMessage", sosMessageSchema);
