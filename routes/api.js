const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const User = require('../models/User');

router.post('/proof', async (req, res) => {
  try {
    const { userId, claimType } = req.body;

    if (!userId || !claimType) {
      return res.status(400).json({ valid: false });
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ valid: false });
    }

    const claims = Array.isArray(user.claims) ? user.claims : [];
    const claim = claims.find(c => c.type === claimType && c.verified);

    if (!claim) {
      return res.json({ valid: false });
    }

    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + 15 * 1000); // 15 seconds
    const nonce = crypto.randomBytes(16).toString('hex');

    const proof = {
      userId,
      claimType,
      valid: true,
      issuedAt: issuedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      nonce
    };

    const signature = crypto
      .createHmac('sha256', process.env.PROOF_SECRET)
      .update(JSON.stringify(proof))
      .digest('hex');

    res.json({ proof, signature });

  } catch (err) {
    console.error('Proof API error:', err);
    res.status(500).json({ valid: false });
  }
});

module.exports = router;
