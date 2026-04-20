const express = require('express');
const router = express.Router();
const CryptoJS = require('crypto-js');
const User = require('../models/User');
const { ensureAdmin } = require('../config/auth');

// ✅ Admin dashboard
router.get('/', ensureAdmin, async (req, res) => {
  try {
    const status = req.query.status === 'approved' || req.query.status === 'pending'
      ? req.query.status
      : 'all';
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = 10;
    const skip = (page - 1) * limit;

    const query = {};
    if (status === 'approved') query.verified = true;
    if (status === 'pending') query.verified = false;

    const [users, filteredTotal, totalUsers, approvedUsers, pendingClaimsAgg] = await Promise.all([
      User.find(query).sort({ date: -1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(query),
      User.countDocuments(),
      User.countDocuments({ verified: true }),
      User.aggregate([
        {
          $project: {
            hasVerifiedEmailClaim: {
              $gt: [
                {
                  $size: {
                    $filter: {
                      input: '$claims',
                      as: 'claim',
                      cond: {
                        $and: [
                          { $eq: ['$$claim.type', 'email_verified'] },
                          { $eq: ['$$claim.verified', true] }
                        ]
                      }
                    }
                  }
                },
                0
              ]
            }
          }
        },
        { $match: { hasVerifiedEmailClaim: false } },
        { $count: 'count' }
      ])
    ]);

    const totalPages = Math.max(Math.ceil(filteredTotal / limit), 1);
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
      users: decryptedUsers,
      filters: {
        status
      },
      pagination: {
        page,
        totalPages,
        hasPrev: page > 1,
        hasNext: page < totalPages
      },
      stats: {
        totalUsers,
        approvedUsers,
        pendingUsers: totalUsers - approvedUsers,
        pendingClaims: pendingClaimsAgg[0]?.count || 0
      }
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
          'claims.$.verified': true,
          verified: true
        }
      }
    );

    if (result.modifiedCount === 0) {
      req.flash('error_msg', 'Claim not found or already approved');
    } else {
      req.flash('success_msg', 'Claim verified and user approved successfully');
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
