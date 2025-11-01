module.exports = (req, res, next) => {
  // Allow Google auth routes
  if (req.path.startsWith("/auth/google")) {
    return next();
  }

  // Allow CSV export route
  if (req.path === "/admin/sales/export/csv" && req.method === "POST") {

    return next();
  }

  // Check body fields for length
  for (let key in req.body) {
    if (typeof req.body[key] === "string" && req.body[key].length > 50) {
      return res.render("charError", {
        message: `${key} must not exceed 50 characters.`
      });
    }
  }

  next();
};
