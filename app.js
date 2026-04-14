const dns = require('node:dns');
// This forces your app to use Google's DNS to find MongoDB
dns.setServers(['8.8.8.8', '8.8.4.4']);
dns.setDefaultResultOrder('ipv4first');

const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const mongoose = require('mongoose');
const passport = require('passport');
const flash = require('connect-flash');
const session = require('express-session');
const path = require('path');
const cookieParser = require('cookie-parser');

require('dotenv').config();

const app = express();

// ✅ Passport Config
require('./config/passport')(passport);

// Verifier 
app.use(express.json());
app.use("/verify", require("./routes/verify"));

// QR
app.get("/scanner", (req, res) => {
  res.render("scanner");
});

// ✅ DB Config
const db = require('./config/keys').mongoURI;

// ✅ Connect to MongoDB
mongoose.connect(db, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => {
    console.error('❌ MongoDB Connection Error:');
    console.error(err);
  });

// ✅ EJS
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('layout', 'layout');
app.set('views', path.join(__dirname, 'views'));
app.set('view cache', false);

// ✅ Middleware
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use("/uploads", express.static("uploads"));

// ✅ Session (before passport + flash)
app.use(
  session({
    secret: 'secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 60 * 60 * 1000 },
  })
);

// ✅ Passport
app.use(passport.initialize());
app.use(passport.session());

// Admin routes
const adminRoutes = require('./routes/admin');
app.use('/admin', adminRoutes);

// ✅ Flash
app.use(flash());

// ✅ Global Variables
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.user = req.user || null;
  next();
});

// ✅ Routes
app.use('/', require('./routes/index.js'));
app.use('/users', require('./routes/users.js'));
app.use('/api', require('./routes/api'));
app.use("/proof", require("./routes/proof"));

// ✅ Server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));

