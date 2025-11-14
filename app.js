
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const donorRoutes = require("./routes/donorRoutes");
const recipientRoutes = require("./routes/recipientRoutes");
const ngoRoutes = require("./routes/ngoRoutes");
const donorTransactionRoutes = require("./routes/donorTransactionRoutes");
const recipientTransactionRoutes = require("./routes/recipientTransactionRoutes");
const authRoutes = require("./routes/authRoutes");
const app = express();
const passport = require("passport");
require("passport"); // load google strategy
const session = require("express-session");

//CORS 
app.use(cors({
  origin: "*", // allows all frontends (React, Angular, etc.)
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session middleware
app.use(
  session({
    secret: "your-session-secret",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());


app.use("/auth", authRoutes);

// Local MongoDB connectionn
const MONGO_URI = "mongodb://127.0.0.1:27017/community_service";

mongoose.connect(MONGO_URI)
  .then(() => console.log(" MongoDB connected locally"))
  .catch(err => console.error(" MongoDB connection error:", err));

// Mount routes
app.use("/donor", donorRoutes);
app.use("/recipient", recipientRoutes);
app.use("/ngo", ngoRoutes);
app.use("/donorTransaction", donorTransactionRoutes);
app.use("/recipientTransaction", recipientTransactionRoutes);

// Root endpoint
app.get("/", (req, res) => {
  res.send("Community Service API running locally with CORS enabled!");
});


// Start server
const PORT = 8000;
app.listen(PORT, () => {
  console.log(` Server running locally at http://localhost:${PORT}`);
});



