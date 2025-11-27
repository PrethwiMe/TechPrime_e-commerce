const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { getDB } = require('./mongodb');
const dbVariables = require('./databse');
const userModel = require('../model/userModel')
const { ObjectId } = require('mongodb');


passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const db = getDB();
    const user = await db.collection(dbVariables.userCollection).findOne({ _id: new ObjectId(id) });
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,        // from Google Cloud Console
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback"
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const db = getDB();
        const usersCollection = db.collection(dbVariables.userCollection);

        let user = await usersCollection.findOne({ email: profile.emails[0].value });

        if (!user) {
          const newUser = {
            firstName: profile.name.givenName || '',
            lastName: profile.name.familyName || '',
            email: profile.emails[0].value,
            password: null,
            isActive: true,
            createdAt: new Date(),
            googleId: profile.id
          };
          const result = await usersCollection.insertOne(newUser);
          user = result.ops ? result.ops[0] : newUser; // For older driver versions
        }

        done(null, user);


      } catch (err) {
        done(err, null);
      }
    }
  )
);

module.exports = passport;
