const crypto = require("crypto");

function verifyClaim(claim) {
  const { signature, ...unsignedClaim } = claim;

  // ⏳ Check expiry
  if (new Date() > new Date(claim.expiresAt)) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", process.env.PROOF_SECRET)
    .update(JSON.stringify(unsignedClaim))
    .digest("base64");

  return signature === expectedSignature;
}

module.exports = verifyClaim;