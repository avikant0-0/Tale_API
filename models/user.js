const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  Name: {
    type: String,
    required: true,
  },
  Gmail: {
    type: String,
    required: true,
    unique: true,
  },
  Password: {
    type: String,
    required: true,
  },
  Images: {
    type: String,
    required: true,
    default:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRtumzEtjiykxux5s1uh79ACRrUqxvgY-xgYA&usqp=CAU",
  },
  RecievedFriendRequests: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      // unique object id of user will be stored in the FriendRequests array
    },
  ],
  Friends: [
    {
      type: mongoose.Schema.Types.Mixed, // this allows any kind of data in the array
    },
  ],
  SentFriendRequests: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
});

const User = mongoose.model("User", UserSchema);
module.exports = User;
