/**
 * Cloudflare Security Middleware
 * Ensures requests are coming through Cloudflare and extracts real user IP
 */

const cloudflareMiddleware = (req, res, next) => {
  // 1. Extract the real user IP provided by Cloudflare
  const realIp = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.ip;
  req.realIp = realIp;

  // 2. Security Check: Verify Cloudflare Ray ID exists in production
  // This helps prevent users from bypassing Cloudflare by hitting your server IP directly
  if (process.env.NODE_ENV === 'production') {
    // Allow local loopback and developer override to ease local testing under PM2.
    const hostHeader = (req.headers.host || '').toLowerCase();
    const remoteAddr = (req.socket && req.socket.remoteAddress) ? req.socket.remoteAddress : '';
    const isLoopback = hostHeader.includes('localhost') || hostHeader.includes('127.0.0.1') || remoteAddr === '::1' || remoteAddr === '127.0.0.1' || remoteAddr === '::ffff:127.0.0.1';
    const bypass = process.env.ALLOW_ORIGIN_DIRECT === 'true';

    if (!req.headers['cf-ray'] && !isLoopback && !bypass) {
      return res.status(403).json({
        success: false,
        message: 'Direct access to origin server is prohibited. Please use the official domain.'
      });
    }
  }

  // 3. Set security headers specific to Cloudflare environments
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  next();
};

module.exports = cloudflareMiddleware;
