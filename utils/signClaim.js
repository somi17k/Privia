const crypto = require("crypto");
const { privateKey } = require("./cryptoKeys");

function signClaim(claimData) {
  const payload = JSON.stringify(claimData);

  const signature = crypto.sign(
    "sha256",
    Buffer.from(payload),
    privateKey
  );

  return {
    ...claimData,
    signature: signature.toString("base64")
  };
}

module.exports = signClaim;
