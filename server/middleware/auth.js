import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'beatstream_jwt_secret_token_key';

export const auth = (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader) {
      return res.status(401).json({ message: "No authentication token, authorization denied." });
    }

    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: "Token format incorrect. Use 'Bearer <token>'." });
    }

    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(401).json({ message: "Token verification failed, authorization denied." });
  }
};
