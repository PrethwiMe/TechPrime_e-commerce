const { ObjectId } = require('mongodb');
const { getDB } = require('../config/mongodb');
const dbVariables = require('../config/databse');
const paginate = require('../utils/paginate');
const { name } = require('ejs');
const { pipeline } = require('nodemailer/lib/xoauth2');

//  Insert product
exports.insertProduct = async (productData) => {
  const db = getDB();
  const result = await db.collection(dbVariables.productCollection).insertOne(productData);
  return result;
};

// Insert variant  productId
exports.insertVariant = async (variantData) => {
  const db = await getDB();
  variantData.productId = new ObjectId(variantData.productId); 
  const result = await db.collection(dbVariables.variantCollection).insertOne(variantData);
  return result;
};

// Update product variantId

exports.updateProductVarientsData= async (productId, variantIds) => {
  const db = getDB()
  return await db.collection(dbVariables.productCollection).updateOne(
    { _id: productId },
    { $set: { variantIds: variantIds } }
  );
}


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

  const pipeline = [{
    $match:{_id:new ObjectId(data)}
  },
{
  $lookup:{
    from:dbVariables.variantCollection,
    localField:"variantIds",
    foreignField:"_id",
    as:"fullProduct"
  }
}]

  const productData = await db.collection(dbVariables.productCollection).aggregate(pipeline).toArray()
  
  return productData
}

exports.showVarients = async (data) => {
  const db = await getDB();
  const productData = await db.collection(dbVariables.variantCollection).findOne({_id: new ObjectId(data)})
  return productData

}
//categories
exports.showCate = async () => {
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

exports.updateVariantByProductId = async (productId,variantId, variantData) => {
  const db = getDB();
  return db.collection(dbVariables.variantCollection).updateOne(
    { productId:new ObjectId( productId ), _id:variantId},
    { $set: variantData }
  );
};

exports.showEditCategory = async (categoryId) =>{

  const db = await getDB();
  const category = await db
    .collection(dbVariables.categoriesCollection)
    .findOne({ _id: new ObjectId(categoryId) })
    return category
}

exports.updateCategory = (data) => {
  const db = getDB();
  const statusOF = db.collection(dbVariables.categoriesCollection).updateOne({_id: new ObjectId(data._id)},{$set:{name:data.name,description : data.description}})
  return statusOF
}
//serach product

function getSortQuery(sortType) {
  switch (sortType) {
    case 'low-high': return { finalPrice: 1 };
    case 'high-low': return { finalPrice: -1 };
    case 'newest': return { createdAt: -1 };
    default: return {}; 
  }
}

exports.allProductsDisplay = async () =>{

  const db =await getDB().collection(dbVariables.productCollection);
let  data = await db.find({isActive:true}).toArray()
return data
}

//search
exports.getFilteredProducts = async (query) => {
  const db = getDB();
  return await db.collection(dbVariables.productCollection).aggregate([
    { $match: query },
    {
      $lookup: {
        from: dbVariables.variantCollection,
        localField: "variantIds",
        foreignField: "_id",
        as: "fullProduct"
      }
    }
  ]).toArray();
};


//categoris is active still needed to improve when in disable

exports.getAllCategoriesForUser = async () => {
  const db = await getDB();
  const categories = await db
    .collection(dbVariables.categoriesCollection)
    .find({isActive:true})
    .sort({ _id: -1 })
    .toArray();
  return categories;
};

exports.viewProducts = async (data) => {

  let db =await getDB();
console.log(data);

  const pipeline = [{
    $match:{_id:new ObjectId(data) }}
  ,{
    $lookup:{
      from:dbVariables.variantCollection,
      localField: "variantIds",
        foreignField: "_id",
        as: "combProduct"
    }
  }]

  const dummy = await db.collection(dbVariables.productCollection).aggregate(pipeline).toArray();

  return dummy
}


exports.viewAllProducts = async () => {

  let db =await getDB();

   const totalDocs = await db.collection(dbVariables.productCollection).countDocuments();
  const pipeline = [{
    $lookup:{
      from:dbVariables.variantCollection,
      localField: "variantIds",
        foreignField: "_id",
        as: "combProduct"
    }
  }]
  const products = await db.collection(dbVariables.productCollection).aggregate(pipeline).toArray();
    return { totalDocs, products };
}