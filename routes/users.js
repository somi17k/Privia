require('dotenv').config();
const CryptoJS = require('crypto-js');
const crypto = require("crypto");
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');
const User = require('../models/User');
const { forwardAuthenticated } = require('../config/auth');
const multer = require("multer");
const path = require("path");
// 🔵 Multer storage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// ✅ Login Page
router.get('/login', forwardAuthenticated, (req, res) => {
  console.log('🟠 Rendering LOGIN page');
  res.render('login', { title: 'Login' });
});

// ✅ Register Page
router.get('/register', forwardAuthenticated, (req, res) => {
  res.render('register', { title: 'Register' });
});


// ✅ Register Route with Encryption & Automatic Admin Role
router.post('/register', upload.single("idProof"), async (req, res) => {
  const { name, email, password, password2 } = req.body;
  let errors = [];

  if (!name || !email || !password || !password2) errors.push({ msg: 'Please enter all fields' });
  if (password !== password2) errors.push({ msg: 'Passwords do not match' });
  if (password.length < 6) errors.push({ msg: 'Password must be at least 6 characters' });

  if (errors.length > 0) {
    return res.render('register', { errors, name, email, password, password2 });
  }

  try {
    // ✅ Determine if this is the first user
    const userCount = await User.countDocuments();
    const role = userCount === 0 ? 'admin' : 'user'; // 🎩 First user = admin
    // 🔐 Create cryptographic email claim (hash only)
    const emailHash = crypto
      .createHash('sha256')
      .update(email.toLowerCase())
      .digest('hex');

    const emailClaim = {
      type: 'email_verified',
      hash: emailHash,
      verified: false,
      issuedAt: new Date()
    };
    // 🔒 Prevent duplicate email registrations (claim-based)
    const existingUser = await User.findOne({
      claims: {
        $elemMatch: {
          type: 'email_verified',
          hash: emailHash
        }
      }
    });

    if (existingUser) {
      req.flash('error_msg', 'Email already registered');
      return res.redirect('/users/register');
    }
    // 🔐 Encrypt email before saving
    const encryptedEmail = CryptoJS.AES.encrypt(
      email,
      process.env.SECRET_KEY
    ).toString();

    // ✅ Create new user
    const newUser = new User({
      name,
      email: encryptedEmail,
      password,
      role,
      idProof: req.file ? req.file.filename : null,
      claims: [emailClaim]
    });

    const salt = await bcrypt.genSalt(10);
    newUser.password = await bcrypt.hash(password, salt);
    await newUser.save();

    req.flash('success_msg', 'You are now registered and can log in');
    res.redirect('/users/login');

  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).send('Server Error');
  }
});

// ✅ Login Route
router.post('/login',
  passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/users/login',
    failureFlash: true
  })
);

// ✅ Logout Route (Flash-safe)
router.get('/logout', (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/users/login');
  }

  const successMessage = 'You have successfully logged out';

  req.logout(err => {
    if (err) return next(err);

    req.session.regenerate(() => {
      req.flash('success_msg', successMessage);
      res.redirect('/users/login');
    });
  });
});

module.exports = router;
