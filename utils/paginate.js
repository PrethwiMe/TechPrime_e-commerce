// utils/paginate.js
const paginate = ({ totalDocs, page = 1, limit = 5 }) => {
  const totalPages = Math.ceil(totalDocs / limit);
  const skip = (page - 1) * limit;

  return { skip, limit, page, totalPages };
};

module.exports = paginate;
