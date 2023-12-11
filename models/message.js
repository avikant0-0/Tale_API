const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  SenderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  RecieverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  MessageType: {
    type: String,
    enum: ["Text", "Image"],
  },
  Message: String,
  ImageUrl: String,
  TimeStamp: {
    type: Date,
    default: Date.now,
  },
});

const Message = mongoose.model("Message", MessageSchema);
module.exports = Message;
