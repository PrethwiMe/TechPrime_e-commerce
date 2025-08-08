const { ObjectId } = require('mongodb');
const { getDB } = require('../config/mongodb');
const dbVariables = require('../config/databse');

//  Insert product
exports.insertProduct = async (productData) => {
  const db = getDB();
  const result = await db.collection(dbVariables.productCollection).insertOne(productData);
  return result;
};

// Insert variant  productId
exports.insertVariant = async (variantData) => {
  const db = await getDB();
  variantData.productId = new ObjectId(variantData.productId); // Ensure productId is ObjectId
  const result = await db.collection(dbVariables.variantCollection).insertOne(variantData);
  return result;
};

// Update product variantId
exports.updateProductVariantId = async (productId, variantId) => {
  const db = await getDB();
  const result = await db.collection(dbVariables.productCollection).updateOne(
    { _id: new ObjectId(productId) },
    { $set: { variantId: new ObjectId(variantId) } }
  );
  return result;
};

// Fetch all categories
exports.getAllCategories = async () => {
  const db = await getDB();
  const categories = await db
    .collection(dbVariables.categoriesCollection)
    .find()
    .sort({ _id: -1 })
    .toArray();
  return categories;
};

// Insert category
exports.insetCategories = async (data) => {
  const db = getDB();
  const result = await db.collection(dbVariables.categoriesCollection).insertOne(data);
  return result;
};

//category status
exports.statusOfCategory = async (categoryId) => {
  const db = await getDB();
  const category = await db
    .collection(dbVariables.categoriesCollection)
    .findOne({ _id: new ObjectId(categoryId) });

  if (!category) return null;

  const newStatus = !category.isActive;

  const updateResult = await db
    .collection(dbVariables.categoriesCollection)
    .updateOne(
      { _id: new ObjectId(categoryId) },
      { $set: { isActive: newStatus } }
    );

  return updateResult;
};

//all products
exports.showProducts = async(data) => {
  const db = getDB();
  const collection =await db.collection(dbVariables.productCollection).find().sort({createdAt:-1}).toArray();

  return collection;
}

exports.showVarients = async(data) => {
  const db = getDB();
  const variant =await db.collection(dbVariables.variantCollection).find().sort({createdAt:-1}).toArray();
  return variant;
}

exports.toggleProduct = async (id,state) => {
  const db = getDB();
  console.log("next state",state);
  console.log(id);
  const collection =await db.collection(dbVariables.productCollection).updateOne({_id:new ObjectId(id)},{$set:{isActive:state}})
  return collection;
}