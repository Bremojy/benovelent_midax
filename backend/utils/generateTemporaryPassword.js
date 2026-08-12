const crypto = require("crypto");

function generateTemporaryPassword(prefix = "MIDAX@") {
  const value = crypto.randomInt(10000000, 100000000);
  return `${prefix}${value}`;
}

module.exports = generateTemporaryPassword;
