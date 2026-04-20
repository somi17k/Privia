require('dotenv').config();
const CryptoJS = require('crypto-js');
const crypto = require("crypto");
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');
const User = require('../models/User');
const { forwardAuthenticated, ensureAuthenticated } = require('../config/auth');
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
    return res.render('register', { title: 'Register', errors, name, email });
  }

  try {
    // ✅ Determine if this is the first user
    const userCount = await User.countDocuments();
    const role = userCount === 0 ? 'admin' : 'user'; // 🎩 First user = admin
    const normalizedEmail = email.trim().toLowerCase();

    // 🔐 Create cryptographic email claim (hash only)
    const emailHash = crypto
      .createHash('sha256')
      .update(normalizedEmail)
      .digest('hex');

    const emailClaim = {
      type: 'email_verified',
      hash: emailHash,
      verified: false,
      issuedAt: new Date()
    };

    const existingUserByHash = await User.findOne({ emailHash });

    if (existingUserByHash) {
      req.flash('error_msg', 'Email already registered');
      return res.redirect('/users/register');
    }

    const legacyUsers = await User.find({}, { email: 1 }).lean();
    const legacyDuplicate = legacyUsers.some((u) => {
      try {
        const decrypted = CryptoJS.AES.decrypt(
          u.email,
          process.env.SECRET_KEY
        ).toString(CryptoJS.enc.Utf8);

        return decrypted.trim().toLowerCase() === normalizedEmail;
      } catch {
        return false;
      }
    });

    if (legacyDuplicate) {
      req.flash('error_msg', 'Email already registered');
      return res.redirect('/users/register');
    }

    // 🔐 Encrypt email before saving
    const encryptedEmail = CryptoJS.AES.encrypt(
      normalizedEmail,
      process.env.SECRET_KEY
    ).toString();

    // ✅ Create new user
    const newUser = new User({
      name,
      email: encryptedEmail,
      emailHash,
      password,
      role,
      idProof: req.file ? req.file.filename : null,
      verificationStatus: 'pending',
      rejectionReason: null,
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

router.post('/resubmit-proof', ensureAuthenticated, upload.single("idProof"), async (req, res) => {
  try {
    if (!req.file) {
      req.flash('error_msg', 'Please upload a new identity proof');
      return res.redirect('/dashboard');
    }

    await User.updateOne(
      { _id: req.user.id },
      {
        $set: {
          idProof: req.file.filename,
          verified: false,
          verificationStatus: 'pending',
          rejectionReason: null,
          rejectedAt: null,
          'claims.$[emailClaim].verified': false
        }
      },
      {
        arrayFilters: [{ 'emailClaim.type': 'email_verified' }]
      }
    );

    req.flash('success_msg', 'New proof submitted. Waiting for admin review.');
    return res.redirect('/dashboard');
  } catch (err) {
    console.error('Resubmit proof error:', err);
    req.flash('error_msg', 'Failed to submit new proof');
    return res.redirect('/dashboard');
  }
});

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
