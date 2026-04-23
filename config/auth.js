module.exports = {
  // Allow access only if logged in
  ensureAuthenticated: function (req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
    req.flash('error_msg', 'Please log in to view this resource');
    return res.redirect('/users/login');
  },

  // Redirect logged-in users away from login/register pages
  forwardAuthenticated: function (req, res, next) {
    if (!req.isAuthenticated()) {
      return next();
    }
    return res.redirect('/dashboard');
  },

  //  Allow access only for admins
  ensureAdmin: function (req, res, next) {
    if (req.isAuthenticated() && req.user && req.user.role === 'admin') {
      return next();
    }
    req.flash('error_msg', 'Access denied: Admins only');
    return res.redirect('/dashboard');
  }
};
