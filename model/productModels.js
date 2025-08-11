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

// all products with pagination
exports.showProducts = async ({ skip = 0, limit = 5, search = "" }) => {
  const db = getDB();

  let query = {};
  if (search && search.trim() !== "") {
    query = { name: { $regex: search, $options: "i" } };
  }

  const collection = await db
    .collection(dbVariables.productCollection)
    .find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();

  return collection;
};


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

//search product
exports.viewSearchData = async (data) => {
const search = data.trim();
let query = {};

if (search) {
  if (!isNaN(search)) {
    query = {
      $or: [
        { name: { $regex: search, $options: "i" } },
        { companyDetails: { $regex: search, $options: "i" } },
        { originalPrice: Number(search) }
      ]
    };
  } else {
    query = {
      $or: [
        { name: { $regex: search, $options: "i" } },
        { companyDetails: { $regex: search, $options: "i" } }
      ]
    };
  }
}

const db = getDB()

const products = await db.collection(dbVariables.productCollection).find(query).toArray();
return products;
}

exports.showEditProduct = async (data) => {

  const db = await getDB();
  const productData = await db.collection(dbVariables.productCollection).findOne({_id: new ObjectId(data)})
  return productData


}

exports.showVarients = async (data) => {
  const db = await getDB();
  const productData = await db.collection(dbVariables.variantCollection).findOne({_id: new ObjectId(data)})
  return productData

}

exports.showCate = async (data) => {
  const db = await getDB();
  const productData = await db.collection(dbVariables.categoriesCollection).find().toArray()
  return productData

}


exports.updateProduct = async (productId, updateData) => {
  const db = getDB();
  return db.collection(dbVariables.productCollection).updateOne(
    { _id: new ObjectId(productId) },
    { $set: updateData }
  );
};

exports.updateVariantByProductId = async (productId, variantData) => {
  const db = getDB();
  return db.collection(dbVariables.variantCollection).updateOne(
    { productId: new ObjectId(productId) },
    { $set: variantData }
  );
};
