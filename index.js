const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const cors = require("cors");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const crypto = require("crypto");
dotenv.config();

const app = express();
app.use(cors());
const port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(passport.initialize());

mongoose
  .connect(process.env.URLToConnect)
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(port, () => {
      console.log(`http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.log("Error occured while connecting to MongoDB", err);
  });

const User = require("./models/user.js");
const Message = require("./models/message");

app.get("/", (req, res) => {
  res.send("started");
});

//function to create a new token

const createToken = (UserId) => {
  //Set token payload
  const payload = {
    UserId: UserId,
  };

  //generate the token with a secret key and expiration time
  const token = jwt.sign(payload, "HFOIJDF@#(#", { expiresIn: "1h" });

  return token;
};

//endpoint for registration of new user
app.post("/register", (req, res) => {
  console.log(req.body);
  const { Name, Gmail, Password } = req.body;
  const NewUser = new User({ Name, Gmail, Password });

  NewUser.save()
    .then(() => {
      res.status(200).json({ Message: "User Successfully Registered!" });
    })
    .catch((err) => {
      console.log("Some Error Registering User:", err);
      res.status(500).json({ Message: "Error registering the user!" });
    });
});

//endpoint for login of new user

app.post("/login", (req, res) => {
  const { Gmail, Password } = req.body;
  console.log(req.body);

  User.findOne({ Gmail })
    .then((User) => {
      console.log(User);
      if (!User) {
        return res.json({ Message: "No such user exists!" });
      }

      if (User.Password !== Password) {
        return res.json({ Message: "Incorrect Password , try again!" });
      } else {
        const Token = JSON.stringify(User._id);
        return res.status(200).json({ Token });
      }

      // const Token = createToken(User._id);
    })
    .catch((err) => {
      console.log("Problem in finding user/password", err);
      res.status(500).json({ Message: "Internal Server Error" });
    });
});

//End point to access all the user except the use who who's currently logged in!

app.get("/user/:UserId", (req, res) => {
  let LoggedInUserId = req.params.UserId;
  LoggedInUserId = LoggedInUserId.slice(1, -1);
  console.log("UseriD");
  User.find({ _id: { $ne: LoggedInUserId } })
    .then((Users) => {
      console.log(Users);
      res.status(200).json(Users);
    })
    .catch((err) => console.log("Some Error In Fetching Users:", err));
});

//Endpoint to send friendRequest

app.post("/friendrequests", async (req, res) => {
  let { CurrentUserId, SelectedUserId } = req.body;
  CurrentUserId = CurrentUserId.slice(1, -1);
  try {
    //Update the recipent's RecievedFriendReqquest Array
    await User.findByIdAndUpdate(SelectedUserId, {
      $push: { RecievedFriendRequests: CurrentUserId },
    });

    //Update the sender's SentFriendRequests array

    await User.findByIdAndUpdate(CurrentUserId, {
      $push: { SentFriendRequests: SelectedUserId },
    });
    res.sendStatus(200);
  } catch (err) {
    res.sendStatus(500);
    console.log("ErrorInfriendrequest:", err);
  }
});

//Endpoint to recieve friend requests

app.get("/recievefriendrequest/:UserId", async (req, res) => {
  try {
    let { UserId } = req.params;

    //fetching user document based in Id

    UserId = UserId.slice(1, -1);
    console.log(UserId);
    const MainUser = await User.findById(UserId)
      .populate("RecievedFriendRequests", "Name Gmail Images")
      .lean();

    const RecievedFriendRequests = MainUser.RecievedFriendRequests;
    console.log(RecievedFriendRequests);
    res.status(200).json(RecievedFriendRequests);
  } catch (err) {
    console.log("Error In RecieveFriendRequestEndpoint:", err);
    res.status(500);
  }
});

//Endpoint to recieve Accept the friend request of a particular person

function generateUniqueString(str1, str2) {
  // Concatenate the two strings with a separator
  let input = str1 + "|" + str2;
  // Create a hash object
  let hash = crypto.createHash("md5");
  // Update the hash with the input
  hash.update(input);
  // Return the hash digest in hexadecimal format
  return hash.digest("hex");
}
app.post("/acceptfriendrequests", async (req, res) => {
  try {
    let { SenderId, RecieverId } = req.body;

    //Retrieve The documents of senders and the reciever
    RecieverId = RecieverId.slice(1, -1);
    const Sender = await User.findById(SenderId);
    const Reciever = await User.findById(RecieverId);
    let uniqueString = generateUniqueString(SenderId, RecieverId);
    console.log("ACCEPTFRIENDSREQUEST", SenderId, RecieverId, uniqueString);
    const array1 = [RecieverId, uniqueString];
    const array2 = [SenderId, uniqueString];
    Sender.Friends.push(array1);
    Reciever.Friends.push(array2);

    Reciever.RecievedFriendRequests = Reciever.RecievedFriendRequests.filter(
      (request) => request.toString() !== SenderId.toString()
    );

    Sender.SentFriendRequests = Sender.SentFriendRequests.filter(
      (request) => request.toString() !== RecieverId.toString()
    );

    await Sender.save();
    await Reciever.save();

    res.status(200).json({ Message: "Friend Request Accepted Successfully" });
  } catch (err) {
    console.log("Error In acceptfriendrequest:", err);
  }
});

app.get("/friends/:UserId", async (req, res) => {
  try {
    let { UserId } = req.params;
    console.log("SomeChanges");
    UserId = UserId.slice(1, -1);
    console.log(UserId);
    const user = await User.findById(UserId);
    const friends = user.Friends;
    const friendsDetails = [];
    for (let friend of friends) {
      // Find the friend document by friend id
      const friendDoc = await User.findById(friend[0]);

      // Check if the friend exists
      if (friendDoc) {
        // Push the friend details to the array
        friendsDetails.push({
          Name: friendDoc.Name,
          Gmail: friendDoc.Gmail,
          Images: friendDoc.Images,
          _id: friendDoc._id,
          encrytionstring: friend[1],
        });
      }
      // console.log(friend[0]);
    }
    console.log(friendsDetails);
    // console.log(friends);
    // return res.json(acceptedFriends);
    res.status(200).json({ friendsDetails });
  } catch (err) {
    console.log("Error in fetching friends:", err);
    res.status(500).json({ Message: "Some Internal Error" });
  }
});

app.get("/othersender/:UserId", async (req, res) => {
  try {
    const { UserId } = req.params;
    console.log(UserId);
    //fetch the user data from the UserId
    const RecieverId = await User.findById(UserId);
    console.log("othersender", RecieverId);
    res.json(RecieverId);
  } catch (err) {
    console.log("Error to get details of user for ChatRoom Header", err);
    res.status(500).json({ Message: "Internal   Server Error" });
  }
});

//endpoint to post Messages and store it in the backend

app.post("/messageslol", async (req, res) => {
  try {
    let { SenderId, RecieverId, MessageType, MessageText } = req.body;
    SenderId = SenderId.slice(1, -1);
    console.log(req.body);
    const newMessage = new Message({
      SenderId,
      RecieverId,
      MessageType,
      Message: MessageText,
      TimeStamp: new Date(),
      ImageUrl: MessageType === "Image" ? req.body.ImageUrl : null,
    });

    await newMessage.save();
    res.status(200).json({ Message: "MessageSentSuccessfully" });
    console.log("MessageSent");
  } catch (err) {
    console.log("Error in /messages", err);
    res.status(500).json({ Message: "Internal Server Error" });
  }
});

//Endpoint to get Messages of sender and reciever

app.get("/fetchmessages/:SenderId/:RecieverId", async (req, res) => {
  try {
    let { SenderId, RecieverId } = req.params;
    SenderId = SenderId.slice(1, -1);
    const messages = await Message.find({
      $or: [
        { SenderId: SenderId, RecieverId: RecieverId },
        { SenderId: RecieverId, RecieverId: SenderId },
      ],
    }).populate("SenderId", "_id Name");

    // console.log(messages);
    res.json(messages);
  } catch (err) {
    console.log("Error in fetching messages", err);
    res.status(500).json({ Message: "Error Internal Prob IDK" });
  }
});

//Chat Gpt fix for displaying images
app.use("/files", express.static(__dirname + "/api/files"));

//Endpoint to delete the messages!

app.post("/DeleteMessages", async (req, res) => {
  try {
    const { SelectedMessages } = req.body;
    console.log(SelectedMessages);
    if (!Array.isArray(SelectedMessages) || SelectedMessages.length === 0) {
      return res.json({ Messages: "Invalid Req body" });
    }

    await Message.deleteMany({ _id: { $in: SelectedMessages } });
    res.json({ Messages: "Message Deleted Successfully" });
    console.log("Message Delte");
  } catch (error) {
    console.log("error in /deltemessages", error);
    res.json({ Message: "Error in deletion of messages" });
  }
});

//to decide the state of sent request function

app.get("/friend-request/sent/:UserId", async (req, res) => {
  try {
    const { UserId } = req.params;
    const UserId1 = UserId.slice(1, -1);
    const user = await User.findById(UserId1)
      .populate("SentFriendRequests", "Name Gmail Image")
      .lean();

    const SentFriendRequests = user.SentFriendRequests;
    res.json(SentFriendRequests);
  } catch (error) {
    console.log(error);
    res.status(500).json({ Message: "Error in deciding state" });
  }
});

app.get("/friendss/:UserId", async (req, res) => {
  try {
    const { UserId } = req.params;
    const UserId1 = UserId.slice(1, -1);
    const user = await User.findById(UserId1)
      .populate("Friends")
      .then((user) => {
        if (!user) {
          return res.status(404).json({ Message: "User Not Found" });
        }

        const FriendIds = user.Friends.map((req) => req._id);

        res.status(200).json(FriendIds);
      });
  } catch (error) {
    console.log(error);
    res.status(500).json({ Message: "Error in deciding state" });
  }
});

app.post("/updateprofilepic", async (req, res) => {
  // console.log(req.body);
  const { id, ImageUrl } = req.body;
  console.log(id, ImageUrl);
  const user = await User.findById(id);
  user.Images = ImageUrl;
  await user.save();
  res.status(200).json({ success: true, message: "Name updated successfully" });
});
