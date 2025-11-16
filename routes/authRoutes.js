const express = require("express");
const passport = require("passport");
const router = express.Router();

// Start Google login
// Pass ?userType=ngo / donor / recipient from frontend
router.get(
  "/google",
  (req, res, next) => {
    req.session.userType = req.query.userType; // store type in session
    next();
  },
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Callback route
router.get(
  "/google/callback",
  (req, res, next) => {
    // Attach userType from session to req.query
    req.query.userType = req.session.userType;
    next();
  },
  passport.authenticate("google", { failureRedirect: "http://localhost:3000/" }),
  (req, res) => {
    res.json({
      message: "Google login successful",
      user: req.user,
    });
  }
);

module.exports = router;
