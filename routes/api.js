const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const User = require('../models/User');
const Proof = require('../models/Proof');
const PROOF_TTL_MS = 30 * 1000;

function ensureAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  return res.status(401).json({ valid: false, reason: 'unauthorized' });
}

router.post('/proof', ensureAuth, async (req, res) => {
  try {
    const claimType = typeof req.body?.claimType === 'string' && req.body.claimType.trim()
      ? req.body.claimType.trim()
      : 'email_verified';
    const shouldRegenerate = req.body?.regenerate === true || req.body?.regenerate === '1' || req.body?.regenerate === 'true';

    const user = await User.findById(req.user.id).lean();
    if (!user) {
      return res.status(404).json({ valid: false, reason: 'user not found' });
    }

    const claims = Array.isArray(user.claims) ? user.claims : [];
    const claim = claims.find(c => c.type === claimType && c.verified);

    if (!claim) {
      return res.status(403).json({ valid: false, reason: 'claim not verified' });
    }

    if (!user.verified) {
      return res.status(403).json({ valid: false, reason: 'user not approved' });
    }

    if (!shouldRegenerate) {
      const existingProof = await Proof.findOne({
        userId: user._id,
        expiresAt: { $gt: new Date() }
      }).sort({ expiresAt: -1 }).lean();

      if (existingProof) {
        const expiresAtIso = new Date(existingProof.expiresAt).toISOString();
        return res.json({
          valid: true,
          code: existingProof.code,
          expiresAt: expiresAtIso,
          proof: {
            code: existingProof.code,
            claimType,
            expiresAt: expiresAtIso
          }
        });
      }
    }

    const code = `PRIVIA-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const expiresAt = new Date(Date.now() + PROOF_TTL_MS);

    await Proof.deleteMany({ userId: user._id });
    await Proof.create({
      code,
      userId: user._id,
      expiresAt
    });

    const expiresAtIso = expiresAt.toISOString();
    return res.json({
      valid: true,
      code,
      expiresAt: expiresAtIso,
      proof: {
        code,
        claimType,
        expiresAt: expiresAtIso
      }
    });

  } catch (err) {
    console.error('Proof API error:', err);
    res.status(500).json({ valid: false, reason: 'server error' });
  }
});

router.post('/verify-proof', async (req, res) => {
  try {
    const inputCode = typeof req.body?.code === 'string' ? req.body.code : '';
    const code = inputCode.trim().toUpperCase();

    if (!code) {
      return res.json({ valid: false });
    }

    const proof = await Proof.findOne({ code }).populate('userId');
    if (!proof || !proof.userId) {
      return res.json({ valid: false });
    }

    const expiresAt = new Date(proof.expiresAt);
    if (new Date() > expiresAt) {
      await Proof.deleteOne({ _id: proof._id });
      return res.json({ valid: false, reason: 'expired' });
    }

    if (!proof.userId.verified) {
      return res.json({ valid: false, reason: 'user not approved' });
    }

    await Proof.deleteOne({ _id: proof._id });

    return res.json({
      valid: true,
      user: {
        name: proof.userId.name
      }
    });
  } catch (err) {
    console.error('Verify proof API error:', err);
    return res.status(500).json({ valid: false });
  }
});

module.exports = router;
