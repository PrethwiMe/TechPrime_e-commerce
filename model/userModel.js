
// mongo data 
const { Query } = require('mongoose');
const dbVariables = require('../config/databse')
const { getDB } = require('../config/mongodb')
const { ObjectId } = require('mongodb');
const { any } = require('joi');
const e = require('connect-flash');

exports.insertUser = async (userdata) => {

  try {
    const db = getDB();
    let insertData = db.collection(dbVariables.userCollection).insertOne(userdata)
    return insertData
  } catch (error) {
    console.error(error);
    return res.status(500).render('error', { error: 'Server error. Please try again.' });
  }

}
//find one user
exports.fetchUser = async (email) => {
  try {
    const db =await getDB();
    let data = await db.collection(dbVariables.userCollection).findOne( { email: email, isActive: true });
    console.log("fetchUser data:", data);
    return data;
  } catch (error) {
    console.log(error);
  }
};
//check user exist or not 
exports.userCheck = async (query) =>{
  try {
    const db = getDB();
    console.log(query);
    let data = await db.collection(dbVariables.userCollection).findOne(query);
    return data;
  } catch (error) {
    console.log(error);
  }
}
exports.resendotpData = (mail, otp) => {

  const db = getDB();
  let forOtp = db.collection(dbVariables.userCollection).updateOne({ email: mail }, { $set: { otp: otp, otpCreated: new Date() } })
  return forOtp
}
exports.userVerify = async (mail) => {
  const db = await getDB()
  const user = await db.collection(dbVariables.userCollection).findOne({ email: mail })
  return user;
}
exports.userActive = async (mail) => {
  const db = await getDB();
  const user = await db.collection(dbVariables.userCollection).updateOne({ email: mail }, { $set: { isActive: true } })
  return user
}
//update forgot password
exports.updatePassword = async (mail, hashedPassword) => {
  const db = getDB();
  const user = db.collection(dbVariables.userCollection).updateOne({ email: mail }, { $set: { password: hashedPassword } })
  return user;
}
//cart logic
exports.addToCartdb = async (userId, productId, variantId, productName) => {
  const db = await getDB();

  // find cart for this user
  const userCart = await db.collection(dbVariables.cartCollection).findOne({ userId });
  // find variant stock
  const variantData = await db.collection(dbVariables.variantCollection)
    .findOne({ _id: new ObjectId(variantId) });

  if (!variantData) {
    return { success: false, message: "Variant not found" };
  }

  const stock = variantData.stock;

  if (userCart) {
    // check if same product + variant already exists
    const existingItem = userCart.items.find(
      item => item.productId === productId && item.variantId === variantId
    );

    if (existingItem) {
      console.log("itemExists true, quantity:", existingItem.quantity, "stock:", stock);

      if (existingItem.quantity < stock) {
        // increase quantity by 1
        const result = await db.collection(dbVariables.cartCollection).updateOne(
          { userId, "items.productId": productId, "items.variantId": variantId },
          { $inc: { "items.$.quantity": 1 } }
        );

        return result.modifiedCount > 0
          ? { success: true, message: "Quantity updated in cart" }
          : { success: false, message: "Failed to update cart" };
      } else {
        // already at stock limit
        return { success: false, message: "Cannot add more, stock limit reached" };
      }
    } else {
      // product variant not in cart check stock before adding
      if (stock > 0) {
        const result = await db.collection(dbVariables.cartCollection).updateOne(
          { userId },
          { $push: { items: { productId, variantId, quantity: 1, productName } } }
        );
        return result.modifiedCount > 0
          ? { success: true, message: "Product added to cart" }
          : { success: false, message: "Failed to add product to cart" };
      } else {
        return { success: false, message: "Product is out of stock" };
      }
    }
  }

  // no cart  user  create new cart
  if (stock > 0) {
    const newCart = {
      userId,
      items: [{ productId, variantId, quantity: 1, productName }]
    };

    const insertResult = await db.collection(dbVariables.cartCollection).insertOne(newCart);

    return insertResult.insertedId
      ? { success: true, message: "New cart created and product added" }
      : { success: false, message: "Failed to create new cart" };
  } else {
    return { success: false, message: "Product is out of stock" };
  }
};

exports.viewCartData = async (userId) => {
  const db = await getDB();

  const query = [
    { $match: { userId: userId } },
    { $unwind: "$items" },

    // Convert string IDs to ObjectId for lookups
    {
      $addFields: {
        "items.productIdObj": { $toObjectId: "$items.productId" },
        "items.variantIdObj": { $toObjectId: "$items.variantId" }
      }
    },

    // Lookup product details
    {
      $lookup: {
        from: dbVariables.productCollection,
        localField: "items.productIdObj",
        foreignField: "_id",
        as: "productDetails"
      }
    },
    { $unwind: "$productDetails" },

    // Prepare categoryIdObj safely (string or ObjectId)
    {
      $addFields: {
        "productDetails.categoryIdObj": {
          $cond: [
            { $eq: [{ $type: "$productDetails.categoriesId" }, "string"] },
            { $toObjectId: "$productDetails.categoriesId" },
            "$productDetails.categoriesId"
          ]
        }
      }
    },

    // Lookup category details
    {
      $lookup: {
        from: dbVariables.categoryCollection || "categories",
        localField: "productDetails.categoryIdObj",
        foreignField: "_id",
        as: "categoryDetails"
      }
    },
    { $unwind: { path: "$categoryDetails", preserveNullAndEmptyArrays: true } },

    // Lookup variant details
    {
      $lookup: {
        from: dbVariables.variantCollection,
        localField: "items.variantIdObj",
        foreignField: "_id",
        as: "variantDetails"
      }
    },
    { $unwind: "$variantDetails" },

    // Compute effective price
    {
      $addFields: {
        effectivePrice: {
          $ifNull: ["$variantDetails.discountPrice", "$variantDetails.price"]
        }
      }
    },

    // Compute item totals
    {
      $addFields: {
        itemOriginal: { $multiply: ["$items.quantity", "$variantDetails.price"] },
        itemSubtotal: { $multiply: ["$items.quantity", "$effectivePrice"] },
        itemDiscount: {
          $multiply: [
            "$items.quantity",
            { $subtract: ["$variantDetails.price", "$effectivePrice"] }
          ]
        }
      }
    },

    // Project clean output, nest category inside product
    {
      $project: {
        _id: 0,
        userId: 1,
        quantity: "$items.quantity",
        product: {
          _id: "$productDetails._id",
          name: "$productDetails.name",
          description: "$productDetails.description",
          images: "$productDetails.images",
          companyDetails: "$productDetails.companyDetails",
          category: {
            _id: "$categoryDetails._id",
            name: "$categoryDetails.name",
            description: "$categoryDetails.description",
            isActive: "$categoryDetails.isActive"
          }
        },
        variant: {
          _id: "$variantDetails._id",
          processor: "$variantDetails.processor",
          price: "$variantDetails.price",
          ram: "$variantDetails.ram",
          storage: "$variantDetails.storage",
          graphicsCard: "$variantDetails.graphics",
          stock: "$variantDetails.stock",
          color: "$variantDetails.color"
        },
        itemOriginal: 1,
        itemDiscount: 1,
        itemSubtotal: 1
      }
    },

    // Group all items by user
    {
      $group: {
        _id: "$userId",
        items: { $push: "$$ROOT" },
        cartOriginal: { $sum: "$itemOriginal" },
        cartDiscount: { $sum: "$itemDiscount" },
        cartSubtotal: { $sum: "$itemSubtotal" }
      }
    }
  ];

  const data = await db
    .collection(dbVariables.cartCollection)
    .aggregate(query)
    .toArray();

  return data[0] || null; // return null if no cart
};

//contol cart function
exports.controllCart = async (userId, productId, variantId, op) => {
  const db = await getDB();
  const updateValue = op === "increment" ? 1 : -1;

  // Find cart
  const cart = await db.collection(dbVariables.cartCollection).findOne({
    userId,
    "items.productId": productId,
    "items.variantId": variantId
  });
  if (!cart) return null;

  const item = cart.items.find(
    i => i.productId === productId && i.variantId === variantId
  );
  if (!item) return null;

  let newQuantity = item.quantity + updateValue;
  if (newQuantity < 1) newQuantity = 1;
  if (newQuantity > 10) newQuantity = 10;

  // Update in DB
  await db.collection(dbVariables.cartCollection).updateOne(
    {
      userId,
      "items.productId": productId,
      "items.variantId": variantId
    },
    { $set: { "items.$.quantity": newQuantity } }
  );

 
  return {
    productId,
    variantId,
    quantity: newQuantity,
    itemSubtotal: newQuantity * item.price, 
  };
};
exports.removeProduct = async (productId, variantId, userId) => {
  const db = getDB();
  const productData = await db.collection(dbVariables.cartCollection).updateOne({ userId: userId }, { $pull: { items: { productId: productId, variantId: variantId } } })
  return productData
}
exports.addToWhishList = async (userId, productId, productName) => {
  const data = { userId, productId, productName }//obj
  const db =await getDB();

const userCheck = await db.collection(dbVariables.whishList).findOne({userId:userId,productId:productId})

if (userCheck) return "data is there"
  const whishlist = await db.collection(dbVariables.whishList).insertOne(data)
  return whishlist;
}
exports.viewWishList = async (userId) => {
  const db = await getDB();

  const wishListItems = await db.collection(dbVariables.whishList)
    .find({ userId: userId })
    .toArray();

  const productIds = wishListItems
    .map(item => ObjectId.isValid(item.productId) ? new ObjectId(item.productId) : null)
    .filter(id => id !== null);

  const products = await db.collection(dbVariables.productCollection)
    .find({ _id: { $in: productIds } })
    .toArray();
  const wishlistWithVariants = await Promise.all(products.map(async product => {
    let variant = null;
    if (product.variantIds.length) {
      variant = await db.collection(dbVariables.variantCollection)
        .findOne({ _id: new ObjectId(product.variantIds[0]) });
    }
    return { product, variant };
  }));

  return wishlistWithVariants;
};
exports.userDataEmailVerification = async (id) => {
  try {
    const db = getDB();
    let data = await db
      .collection(dbVariables.userCollection)
      .findOne(
        { _id: new ObjectId(id), isActive: true },
        { projection: { password: 1, firstName: 1, email: 1, phone: 1, role: 1,referralCode:1,lastName:1,otp:1,otpCreated:1 } }
      );
    return data;
  } catch (error) {
    console.log(error);
  }
};
exports.updateEmail = async (id,email) => {
  const db = await getDB();
  const update = await db.collection(dbVariables.userCollection).updateOne({_id:new ObjectId(id)},{$set:{email:email}});
  return update;
}

exports.updateOfferInCart = async (userId, productId, offerdata) => {
  try {
    const db = await getDB();
    const update = await db
      .collection(dbVariables.cartCollection)
      .updateOne(
        { userId: userId, "items.productId": productId },
        {
          $set: {
            "items.$.appliesTo": offerdata.appliesTo,
            "items.$.offerValue": offerdata.offerValue,
            "items.$.startDate": offerdata.startDate,
            "items.$.endDate": offerdata.endDate
          }
        }
      );

    return update;
  } catch (error) {
    console.log("Error in updateOfferInCart:", error);
  }
};
