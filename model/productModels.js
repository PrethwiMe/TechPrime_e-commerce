const { ObjectId } = require('mongodb');
const { getDB } = require('../config/mongodb');
const dbVariables = require('../config/databse')
//const { ObjectId } = require('mongodb');
// Insert new product
exports.insertProduct = async (productData) => {
  const db = getDB();
  const result = await db.collection(dbVariables.productCollection).insertOne(productData);
  return result;
};

// Insert variant productId
exports.insertVariant = async (variantData) => {
  const db =await getDB();
  variantData.productId = new ObjectId(variantData.productId);
  const result = await db.collection(dbVariables.variantCollection).insertOne(variantData);
  return result;
};

// Fetch categories from DB
exports.getAllCategories = async () => {
  const db =await getDB();
  const categories = await db.collection(dbVariables.categoriesCollection).find().sort({ _id: -1 }).toArray();
  return categories;
};
//add categories
exports.insetCategories = async (data) => {

    const db = getDB();
  const categories = await db.collection(dbVariables.categoriesCollection).insertOne(data)
  return categories;
  
}
//update categories
exports.statusOfCategory = async (categoryId) => {
  const db = await getDB();
  const category = await db.collection(dbVariables.categoriesCollection).findOne({ _id: new ObjectId(categoryId) });

  if (!category) return null;

  const newStatus = !category.isActive;

  const updateResult = await db.collection(dbVariables.categoriesCollection).updateOne(
    { _id: new ObjectId(categoryId) },
    { $set: { isActive: newStatus } }
  );

  return updateResult;
};

