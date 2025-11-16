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
    req.query.userType = req.session.userType; 
    next();
  },
  passport.authenticate("google", { failureRedirect: "http://localhost:3000/" }),
  (req, res) => {
    const payload = {
      message: "Google login successful",
      user: req.user,
    };

    res.send(`
      <script>
        // Send data to the main frontend window
        window.opener.postMessage(${JSON.stringify(payload)}, "http://localhost:3000");

        // Close the popup
        window.close();
      </script>
    `);
  }
);


module.exports = router;
