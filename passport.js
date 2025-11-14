const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const NGO = require("../models/NGO");
const Donor = require("../models/Donor");
const Recipient = require("../models/Recipient");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
      passReqToCallback: true, // get req to access userType
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const userType = req.query.userType; // ngo / donor / recipient
        let UserModel;

        if (userType === "ngo") UserModel = NGO;
        else if (userType === "donor") UserModel = Donor;
        else if (userType === "recipient") UserModel = Recipient;
        else return done(null, false, { message: "Invalid user type" });

        // Check if user exists
        let user = await UserModel.findOne({ email: profile.emails[0].value });

        // If not, create user
        if (!user) {
          user = new UserModel({
            username: profile.displayName,
            email: profile.emails[0].value,
            password: "google-oauth", 
          });
          await user.save();
        }

        return done(null, { id: user._id, type: userType, profile: user });
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser(async (user, done) => {
  let UserModel;
  if (user.type === "ngo") UserModel = require("../models/NGO");
  else if (user.type === "donor") UserModel = require("../models/Donor");
  else if (user.type === "recipient") UserModel = require("../models/Recipient");

  const u = await UserModel.findById(user.id);
  done(null, u);
});

module.exports = passport;
