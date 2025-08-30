
// mongo data 
const { Query } = require('mongoose');
const dbVariables = require('../config/databse')
const { getDB } = require('../config/mongodb')
const { ObjectId } = require('mongodb');

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
    const db = getDB();
    let data = await db
      .collection(dbVariables.userCollection)
      .findOne(
        { email: email, isActive: true },
        { projection: { password: 1, firstName: 1, email: 1, phone: 1, role: 1 } }
      );
    return data;
  } catch (error) {
    console.log(error);
  }
};

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
exports.addToCartdb = async (userId, productID, variantId,productName) => {
  const db = await getDB();

  const userCart = await db.collection(dbVariables.cartCollection).findOne({ userId });

  if (userCart && userCart.items) {
    const productExists = userCart.items.some(item => {
      return item.productId == productID; 
    });

    if (productExists) {
      const result = await db.collection(dbVariables.cartCollection).updateOne(
        { userId, "items.productId": productID }, 
        { $inc: { "items.$.quantity": 1 } }
      );
      return result.modifiedCount > 0
        ? { success: true, message: "Quantity updated in cart" }
        : { success: false, message: "Failed to update cart" };
    } else {
      const result = await db.collection(dbVariables.cartCollection).updateOne(
        { userId },
        {
          $push: {
            items: {
              productId: productID, 
              variantId,            
              quantity: 1,
              productName
            }
          }
        }
      );
      return result.modifiedCount > 0
        ? { success: true, message: "Product added to cart" }
        : { success: false, message: "Failed to add product to cart" };
    }
  } else {
    const newCart = {
      userId,
      items: [
        {
          productId: productID, // 👈 string
          variantId,
          quantity: 1,
          productName
        }
      ]
    };
    const insertResult = await db.collection(dbVariables.cartCollection).insertOne(newCart);
    return insertResult.insertedId
      ? { success: true, message: "New cart created and product added" }
      : { success: false, message: "Failed to create new cart" };
  }
};

exports.viewCartData = async (userId) => {
  const db = await getDB();

  const query = [
    { $match: { userId: userId } }, // filter by user
    { $unwind: "$items" },
    {
      $addFields: {
        "items.productIdObj": { $toObjectId: "$items.productId" },
        "items.variantIdObj": { $toObjectId: "$items.variantId" }
      }
    },
    {
      $lookup: {
        from: dbVariables.productCollection,
        localField: "items.productIdObj",
        foreignField: "_id",
        as: "productDetails"
      }
    },
    { $unwind: "$productDetails" },
    {
      $lookup: {
        from: dbVariables.variantCollection,
        localField: "items.variantIdObj",
        foreignField: "_id",
        as: "variantDetails"
      }
    },
    { $unwind: "$variantDetails" },
    {
      $addFields: {
        effectivePrice: {
          $ifNull: ["$variantDetails.discountPrice", "$variantDetails.price"]
        }
      }
    },
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
          companyDetails: "$productDetails.companyDetails"
        },
        variant: {
          _id: "$variantDetails._id",   // <-- keep variantId
          processor: "$variantDetails.processor",
          price: "$variantDetails.price",
          ram: "$variantDetails.ram",
          storage: "$variantDetails.storage",
          graphicsCard:"$variantDetails.graphics",
          stock: "$variantDetails.stock",
          color:"$variantDetails.color",
        },
        itemOriginal: 1,
        itemDiscount: 1,
        itemSubtotal: 1
      }
    },
    {
      $group: {
        _id: "$userId",
        items: { $push: "$$ROOT" }, // each variant becomes separate entry
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
