const passport = require("koa-passport");
const LocalStrategy = require("passport-local");
const JwtStrategy = require("passport-jwt");
const GooglePlusTokenStrategy = require('passport-google-plus-token');
const FacebookTokenStrategy = require('passport-facebook-token');
const User = require("../models/user");

const SECRET = "RlJkWFiPtm0AdBiGMiHObXkWtWVTEpAgd7hstB6de6z5QGuBdnnBSnAejYHwdKsTdm7Wf8Wm5Q730jZ5" +
    "KYhI3NUhBoHR7aKJ6ijz";
const localOpts = {
  usernameField: "email",
  session: false
};
const jwtOpts = {
  jwtFromRequest: JwtStrategy
    .ExtractJwt
    .fromAuthHeader(),
  secretOrKey: SECRET
};
const socialConfig = {
  facebook: {
    clientID: "2036747339881300",
    clientSecret: "16b71354d32ddea6d3f1c68fa9be2910"
  },
  google: {
    clientID: "318537181220-ei690ljtl97vfjlocj9v4vrh53qk9q76.apps.googleusercontent.com",
    clientSecret: "4VUPxK47V9nOY_ndE-9_qmUu"
  }
}

module.exports = {
  passport: () => {
    const localLogin = new LocalStrategy(localOpts, async(email = "", password = "", done) => {
      try {
        const user = await User.findOne({
          email: email.toLowerCase()
        });

        if (!user) {
          return done(null, false);
        }

        const isValid = await user.comparePassword(password);

        return done(null, isValid
          ? user
          : {});
      } catch (err) {
        return done(err);
      }
    });

    const jwtLogin = new JwtStrategy.Strategy(jwtOpts, (payload, done) => done(null, payload));

    // Google OAuth Strategy
    passport.use('googleToken', new GooglePlusTokenStrategy({
      clientID: socialConfig.google.clientID,
      clientSecret: socialConfig.google.clientSecret
    }, async(accessToken, refreshToken, profile, done) => {
      try {
        const existingUser = await User.findOne({"googleID": profile.id});
        if (existingUser) {
          return done(null, existingUser);
        }

        const existingNonGoogleUser = await User.findOne({"email": profile.emails[0].value.toLowerCase()});

        if (existingNonGoogleUser) {
          let firstName = !profile.name.givenName || !/[A-Z]/.test(profile.name.givenName) ? existingNonGoogleUser.name.first : profile.name.givenName;
          let lastName = !profile.name.familyName || !/[A-Z]/.test(profile.name.familyName) ? existingNonGoogleUser.name.last : profile.name.familyName;
          let { role } = existingNonGoogleUser;
          if (role === 'guest') {
            role === 'user';
          }
          await User.findByIdAndUpdate(existingNonGoogleUser._id, {
            method: 'google',
            name: {
              first: firstName,
              last: lastName
            },
            googleID: profile.id,
            role
          }, {new: true}, (err, doc) => {
            if (err) {
              console.log(err);
            } else {
              existingNongoogleUser = Object.assign({}, doc);
            }
          });
          done(null, existingNonGoogleUser);
        } else {
          let firstName = profile.name.familyName ? profile.name.givenName : profile.name.givenName;
          let lastName = profile.name.familyName ? profile.name.familyName : " ";
          const newUser = new User({
            method: 'google',
            name: {
              first: firstName,
              last: lastName
            },
            googleID: profile.id,
            email: profile.emails[0].value.toLowerCase(),
            role: 'user'
          });
          await newUser.save();
          done(null, newUser);
        }
      } catch (error) {
        done(error, false, error.message);
      }
    }));

    // Facebook OAuth Strategy
    passport.use('facebookToken', new FacebookTokenStrategy({
      clientID: socialConfig.facebook.clientID,
      clientSecret: socialConfig.facebook.clientSecret
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        const existingUser = await User.findOne({"facebookID": profile.id});
        if (existingUser) {
          return done(null, existingUser);
        }
        
        let existingNonFacebookUser = await User.findOne({"email": profile.emails[0].value.toLowerCase()});

        if (existingNonFacebookUser) {
          let firstName = !profile.name.givenName || !/[A-Z]/.test(profile.name.givenName) ? existingNonGoogleUser.name.first : profile.name.givenName;
          let lastName = !profile.name.familyName || !/[A-Z]/.test(profile.name.familyName) ? existingNonGoogleUser.name.last : profile.name.familyName;
          let { role } = existingNonFacebookUser;
          if (role === 'guest') {
            role === 'user';
          }
          await User.findOneAndUpdate(existingNonFacebookUser._id, {
            method: 'facebook',
            name: {
              first: firstName,
              last: lastName
            },
            facebookID: profile.id,
            role
          }, {new: true}, (err, doc) => {
            if (err) {
              console.log(err);
            } else {
              existingNonFacebookUser = Object.assign({}, doc);
            }
          });
          done(null, existingNonFacebookUser);
        } else {
          let firstName = profile.name.familyName ? profile.name.givenName : profile.name.givenName;
          let lastName = profile.name.familyName ? profile.name.familyName : " ";
          const newUser = new User({
            method: 'facebook',
            name: {
              first: firstName,
              last: lastName
            },
            facebookID: profile.id,
            email: profile.emails[0].value.toLowerCase(),
            role: 'user'
          });
          await newUser.save();
          done(null, newUser);
        }
      } catch(error) {
        done(error, false, error.message);
      }
    }));

    passport.use(jwtLogin);
    passport.use(localLogin);
    return passport;
  },
  opts: {
    secret: SECRET,
    expiration: 604800
  },
  socialConfig
};