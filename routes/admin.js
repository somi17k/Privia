const express = require('express');
const router = express.Router();
const User = require('../models/User');

// ✅ Ensure admin middleware
function ensureAdmin(req, res, next) {
  console.log("SESSION USER:", req.user);

  if (req.isAuthenticated() && req.user.role === 'admin') {
    console.log("✅ ADMIN ACCESS GRANTED");
    return next();
  }

  console.log("❌ NOT ADMIN");
  return res.redirect('/dashboard');
}

// ✅ Admin dashboard
router.get('/', ensureAdmin, async (req, res) => {
  try {
    const users = await User.find();
console.log("CURRENT USER:", req.user);
    console.log("📋 ADMIN DASHBOARD USERS:");
    users.forEach(u => {
      console.log(u._id.toString(), "verified =", u.verified);
    });

    res.render('admin', { users });
  } catch (err) {
    console.error(err);
    res.send('Error loading admin dashboard');
  }
});

// ✅ Admin verifies a claim
router.post('/verify/:userId/:claimType', ensureAdmin, async (req, res) => {
  try {
    const { userId, claimType } = req.params;

    await User.updateOne(
      { _id: userId, 'claims.type': claimType },
      {
        $set: {
          'claims.$.verified': true,
          verified: true
        }
      }
    );

    res.redirect('/admin');
  } catch (err) {
    console.error(err);
    res.redirect('/admin');
  }
});

// ✅ Admin approves user manually
router.post('/approve-user/:userId', ensureAdmin, async (req, res) => {
  try {
    const userId = req.params.userId;

    console.log("🔥 ADMIN VERIFYING USER:", userId);

    await User.updateOne(
      { _id: userId, "claims.type": "email_verified" },
      {
        $set: {
          verified: true,
          "claims.$.verified": true
        }
      }
    );

    console.log("✅ USER + CLAIM VERIFIED");

    res.redirect('/admin');
  } catch (err) {
    console.error(err);
    res.redirect('/admin');
  }
});

module.exports = router;
