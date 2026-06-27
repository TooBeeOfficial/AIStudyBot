import jwt from "jsonwebtoken";

export function Auth(req, res, next) {
  const token = req.cookies["token"];
  console.log(token);
  if (!token) {
    return res.status(401).json({ error: "No token" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}
