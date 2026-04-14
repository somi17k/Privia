const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const CryptoJS = require('crypto-js');
const User = require('../models/User');

module.exports = function (passport) {

  /* =========================================================
     LOCAL STRATEGY (LOGIN)
     ========================================================= */
  passport.use(
    new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
      try {
        console.log("🟡 LOGIN ATTEMPT");
        console.log("Entered email:", email);

        const users = await User.find();
        console.log("Total users in DB:", users.length);

        let foundUser = null;

        for (const u of users) {
          console.log("----");
          console.log("Raw DB email:", u.email);

          let decryptedEmail = "";
          try {
            decryptedEmail = CryptoJS.AES.decrypt(
              u.email,
              process.env.SECRET_KEY
            ).toString(CryptoJS.enc.Utf8);
          } catch (e) {
            console.log("Decryption error");
          }

          console.log("Decrypted email:", decryptedEmail);

          if (decryptedEmail === email) {
            console.log("✅ EMAIL MATCH FOUND");
            foundUser = u;
            break;
          }
        }

        if (!foundUser) {
          console.log("❌ NO USER MATCH");
          return done(null, false, { message: 'Invalid email or password' });
        }

        const isMatch = await bcrypt.compare(password, foundUser.password);
        console.log("Password match:", isMatch);

        if (!isMatch) {
          console.log("❌ PASSWORD MISMATCH");
          return done(null, false, { message: 'Invalid email or password' });
        }

        console.log("✅ LOGIN SUCCESS");
        return done(null, foundUser);

      } catch (err) {
        console.error("Passport error:", err);
        return done(err);
      }
    })
  );

  /* =========================================================
     SESSION HANDLING
     ========================================================= */

  // ✅ Store ONLY MongoDB ID in session
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // ✅ Restore FULL USER OBJECT (NO DECRYPTION HERE)
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      if (!user) return done(null, false);

      // 🔐 IMPORTANT: return raw DB user
      return done(null, user);
    } catch (err) {
      console.error('Deserialize error:', err);
      return done(err, null);
    }
  });
};
