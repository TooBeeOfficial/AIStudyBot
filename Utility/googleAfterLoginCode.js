import crypto from "node:crypto";


function createLoginCode(user) {
  const code = crypto.randomUUID();

  loginCodes.set(code, {
    user,
    expires: Date.now() + 60 * 1000, // 1 minute
  });

  return code;
}