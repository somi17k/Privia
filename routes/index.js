const express = require('express');
const router = express.Router();
const CryptoJS = require('crypto-js');
const User = require('../models/User');
const {
  ensureAuthenticated,
  forwardAuthenticated,
  ensureAdmin
} = require('../config/auth');

/* HOME / WELCOME PAGE */

router.get('/', (req, res) => {
  let user = null;

  if (req.user?.name) {
    try {
      user = {
        name: CryptoJS.AES.decrypt(
          req.user.name,
          process.env.SECRET_KEY
        ).toString(CryptoJS.enc.Utf8) || req.user.name
      };
    } catch {
      user = { name: req.user.name };
    }
  }

  res.render('welcome', {
    title: 'Home',
    user
  });
});

/*Dashboard*/

router.get('/dashboard', ensureAuthenticated, (req, res) => {
  let name = 'User';

  if (typeof req.user.name === 'string') {
    try {
      name =
        CryptoJS.AES.decrypt(
          req.user.name,
          process.env.SECRET_KEY
        ).toString(CryptoJS.enc.Utf8) || req.user.name;
    } catch {
      name = req.user.name;
    }
  }

  const claims = Array.isArray(req.user.claims) ? req.user.claims : [];
  const emailClaim = claims.find(c => c.type === 'email_verified');

  res.render('dashboard', {
    title: 'Dashboard',
    user: {
      name,
      email: emailClaim ? 'Email on file' : 'Not provided',
      verified: emailClaim?.verified || false,
      date: req.user.date
    }
  });
});

router.get('/admin', ensureAdmin, async (req, res) => {
  try {
    const users = await User.find().lean();

    const decryptedUsers = users.map(u => {
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
        date: u.date,
        claims: Array.isArray(u.claims) ? u.claims : []
      };
    });

    res.render('admin', {
      title: 'Admin Dashboard',
      users: decryptedUsers
    });

  } catch (err) {
    console.error('Admin dashboard error:', err);
    res.status(500).send('Server Error');
  }
});
//  Admin verifies a specific claim

router.post('/admin/verify/:userId/:claimType', ensureAdmin, async (req, res) => {
  try {
    const { userId, claimType } = req.params;

    const result = await User.updateOne(
      { _id: userId, 'claims.type': claimType },
      { $set: { 'claims.$.verified': true } }
    );

    if (result.modifiedCount === 0) {
      req.flash('error_msg', 'Claim not found or already verified');
    } else {
      req.flash('success_msg', 'Claim verified successfully');
    }

    res.redirect('/admin');
  } catch (err) {
    console.error('Verification error:', err);
    req.flash('error_msg', 'Verification failed');
    res.redirect('/admin');
  }
});

module.exports = router;
