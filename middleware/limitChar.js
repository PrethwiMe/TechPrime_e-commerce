// middleware/limitTextLength.js
module.exports = (req, res, next) => {
  for (let key in req.body) {
    if (typeof req.body[key] === "string" && req.body[key].length > 50) {
      return res.render("charError", {
        message: `${key} must not exceed 50 characters.`
      });
    }
  }

  for (let key in req.query) {
    if (typeof req.query[key] === "string" && req.query[key].length > 50) {
      return res.render("charError", {
        message: `${key} must not exceed 50 characters.`
      });
    }
  }

  next();
};
