const Authority = require("../models/Authority");

// POST /api/authorities  (admin only) { district, state, minLat, maxLat, minLng, maxLng, emails }
async function createAuthority(req, res, next) {
  try {
    const authority = await Authority.create(req.body);
    res.status(201).json(authority);
  } catch (err) {
    next(err);
  }
}

// GET /api/authorities
async function listAuthorities(req, res, next) {
  try {
    const authorities = await Authority.find().sort({ state: 1, district: 1 });
    res.json(authorities);
  } catch (err) {
    next(err);
  }
}

module.exports = { createAuthority, listAuthorities };
