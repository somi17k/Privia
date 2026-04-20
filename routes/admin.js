const express = require('express');
const router = express.Router();
const CryptoJS = require('crypto-js');
const User = require('../models/User');
const { ensureAdmin } = require('../config/auth');

// ✅ Admin dashboard
router.get('/', ensureAdmin, async (req, res) => {
  try {
    const users = await User.find().lean();
    const decryptedUsers = users.map((u) => {
      let name;
      try {
        name = CryptoJS.AES.decrypt(
          u.name,
          process.env.SECRET_KEY
        ).toString(CryptoJS.enc.Utf8) || u.name;
      } catch {
        name = u.name;
      }

      return {
        _id: u._id,
        name,
        idProof: u.idProof || null,
        verified: Boolean(u.verified),
        date: u.date,
        claims: Array.isArray(u.claims) ? u.claims : []
      };
    });

    res.render('admin', {
      title: 'Admin Dashboard',
      users: decryptedUsers
    });
  } catch (err) {
    console.error(err);
    res.send('Error loading admin dashboard');
  }
});

// ✅ Admin verifies a claim
router.post('/verify/:userId/:claimType', ensureAdmin, async (req, res) => {
  try {
    const { userId, claimType } = req.params;
    const result = await User.updateOne(
      { _id: userId, 'claims.type': claimType },
      {
        $set: {
          'claims.$.verified': true
        }
      }
    );

    if (result.modifiedCount === 0) {
      req.flash('error_msg', 'Claim not found or already verified');
    } else {
      req.flash('success_msg', 'Claim verified successfully');
    }

    res.redirect('/admin');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Verification failed');
    res.redirect('/admin');
  }
});

// ✅ Admin approves user manually
router.post('/approve-user/:userId', ensureAdmin, async (req, res) => {
  try {
    const userId = req.params.userId;
    await User.updateOne(
      { _id: userId },
      {
        $set: {
          verified: true
        }
      }
    );
    req.flash('success_msg', 'User approved successfully');

    res.redirect('/admin');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'User approval failed');
    res.redirect('/admin');
  }
});

module.exports = router;
