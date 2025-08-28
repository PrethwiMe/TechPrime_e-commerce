
// mongo data 
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

exports.addToCartdb = async (userId, productID,variantId) => {
  const db = await getDB();

  const userCart = await db.collection(dbVariables.cartCollection).findOne({ userId });
  if (userCart && userCart.items) {
    const productExists = userCart.items.some(item => {
      return item.productId.productId == productID.productId;
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
              quantity: 1
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
          productId: productID,
          quantity: 1,
          variantId:variantId
        }
      ]
    };
    const insertResult = await db.collection(dbVariables.cartCollection).insertOne(newCart);
    return insertResult.insertedId
      ? { success: true, message: "New cart created and product added" }
      : { success: false, message: "Failed to create new cart" };
  }
};
