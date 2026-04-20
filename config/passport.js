const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const CryptoJS = require('crypto-js');
const crypto = require('crypto');
const User = require('../models/User');

module.exports = function (passport) {

  /* =========================================================
     LOCAL STRATEGY (LOGIN)
     ========================================================= */
  passport.use(
    new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
      try {
        const normalizedEmail = String(email || '').trim().toLowerCase();
        const emailHash = crypto
          .createHash('sha256')
          .update(normalizedEmail)
          .digest('hex');

        // Fast path for all new users (hash indexed lookup)
        let foundUser = await User.findOne({ emailHash });

        // Legacy fallback for old users without emailHash
        if (!foundUser) {
          const users = await User.find({}, { email: 1, password: 1, role: 1, claims: 1, name: 1, date: 1, idProof: 1 });
          for (const u of users) {
            let decryptedEmail = '';
            try {
              decryptedEmail = CryptoJS.AES.decrypt(
                u.email,
                process.env.SECRET_KEY
              ).toString(CryptoJS.enc.Utf8);
            } catch {
              decryptedEmail = '';
            }

            if (decryptedEmail.trim().toLowerCase() === normalizedEmail) {
              foundUser = u;
              break;
            }
          }
        }

        if (!foundUser) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        const isMatch = await bcrypt.compare(password, foundUser.password);

        if (!isMatch) {
          return done(null, false, { message: 'Invalid email or password' });
        }

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
