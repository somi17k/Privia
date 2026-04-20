const express = require('express');
const router = express.Router();
const CryptoJS = require('crypto-js');
const {
  ensureAuthenticated
} = require('../config/auth');

function getDisplayUser(req) {
  if (!req.user?.name) return null;

  try {
    return {
      name: CryptoJS.AES.decrypt(
        req.user.name,
        process.env.SECRET_KEY
      ).toString(CryptoJS.enc.Utf8) || req.user.name,
      role: req.user.role
    };
  } catch {
    return {
      name: req.user.name,
      role: req.user.role
    };
  }
}

router.get('/', (req, res) => {
  res.render('welcome', {
    title: 'Home',
    user: getDisplayUser(req)
  });
});

router.get('/about', (req, res) => {
  res.render('about', {
    title: 'About Privia',
    user: getDisplayUser(req)
  });
});

router.get('/how-it-works', (req, res) => {
  res.render('how-it-works', {
    title: 'How It Works',
    user: getDisplayUser(req)
  });
});

router.get('/security', (req, res) => {
  res.render('security', {
    title: 'Security',
    user: getDisplayUser(req)
  });
});

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
