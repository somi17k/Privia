const express = require('express');
const router = express.Router();
const CryptoJS = require('crypto-js');
const {
  ensureAuthenticated
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
        ).toString(CryptoJS.enc.Utf8) || req.user.name,
        role: req.user.role
      };
    } catch {
      user = {
        name: req.user.name,
        role: req.user.role
      };
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
      date: req.user.date,
      role: req.user.role
    }
  });
});

module.exports = router;
