// mongo data 
const { Query, Collection, get } = require('mongoose');
const dbVariables = require('../config/databse')
const { getDB } = require('../config/mongodb')
const { ObjectId } = require('mongodb');
const { any, date } = require('joi');
const { v4: uuidv4 } = require('uuid');
const { pipeline } = require('nodemailer/lib/xoauth2');


exports.addAddress = async (data) => {
  const db = await getDB();
  const { userId, fullName, phone, line1, city, state, pincode } = data;

  const checkUser = await db.collection(dbVariables.addressCollection).findOne({ userId });

  const addressObj = { id: uuidv4(), fullName, phone, line1, city, state, pincode, isActive: true };

  if (checkUser) {
    const addData = await db.collection(dbVariables.addressCollection).updateOne(
      { userId },
      { $push: { addresses: addressObj } }
    );
    return addData;
  } else {
    const addData = await db.collection(dbVariables.addressCollection).insertOne({
      userId,
      addresses: [addressObj],
    });
    return addData;
  }
};
exports.deleteAddress = async (data) => {
  const db = await getDB();
  const addressId = data.id || data;

  const userDoc = await db.collection(dbVariables.addressCollection).updateOne({ "addresses.id": addressId }, { $set: { "addresses.$.isActive": false } });
  return userDoc
};
exports.viewAddress = async (userId) => {
  const db = await getDB();

  const userDoc = await db.collection(dbVariables.addressCollection).findOne(
    { userId: userId },
    {
      projection: {
        addresses: {
          $filter: {
            input: "$addresses",
            as: "addr",
            cond: { $eq: ["$$addr.isActive", true] }
          }
        }
      }
    }
  );
  return userDoc ? userDoc.addresses : [];
};
exports.updateAddress = async (userId, data) => {
  const { updateId, fullName, phone, line1, city, state, pincode } = data

  const db = await getDB();
  const dataUpdate = await db.collection(dbVariables.addressCollection).updateOne(
    { userId: userId, "addresses.id": updateId }, {
    $set: {
      "addresses.$.fullName": fullName,
      "addresses.$.phone": phone,
      "addresses.$.line1": line1,
      "addresses.$.city": city,
      "addresses.$.state": state,
      "addresses.$.pincode": pincode,
    }
  }
  )
  return dataUpdate
}
exports.updatePassword = async (email, hashedPassword) => {
  const db = await getDB();
  try {
    const result = await db
      .collection(dbVariables.userCollection)
      .updateOne(
        { email: email },
        { $set: { password: hashedPassword } }
      );
    return result;
  } catch (err) {
    throw new Error('Failed to update password');
  }
};
exports.checkOutView = async (userId) => {
  try {

    const db = await getDB();


    const cart = await db.collection(dbVariables.cartCollection).findOne({ userId: userId });

    if (!cart) {
      return [];
    }


    const pipeline = [
      { $match: { userId: userId } },
      { $unwind: "$items" },
      {
        $addFields: {
          "items.productId": { $toObjectId: "$items.productId" },
          "items.variantId": { $toObjectId: "$items.variantId" }
        }
      },
      {
        $lookup: {
          from: dbVariables.productCollection,
          localField: "items.productId",
          foreignField: "_id",
          as: "product"
        }
      },
      { $unwind: "$product" },
      {
        $lookup: {
          from: dbVariables.variantCollection,
          localField: "items.variantId",
          foreignField: "_id",
          as: "variant"
        }
      },
      { $unwind: "$variant" },
      {
        $project: {
          _id: 0,
          product: 1,
          variant: 1,
          quantity: "$items.quantity",
          productName: "$items.productName"
        }
      }
    ];


    const cartItems = await db.collection(dbVariables.cartCollection).aggregate(pipeline).toArray();


    const pipe =
      [
        { $match: { userId: userId } },
        { $unwind: "$addresses" },
        { $match: { "addresses.isActive": true } },
        {$project :{ _id:0,addresses:1 } }
      ]

      const addresses= await db.collection(dbVariables.addressCollection).aggregate(pipe).toArray()
    const data = { cartItems, addresses };
    return data;

  } catch (error) {
    return [];
  }
};
exports.addNewOrder = async (userId, data) => {
    
   const orderId ="ORD"+ Math.floor(10000000 + Math.random() * 90000000);

  const db = await getDB();

  const orderDoc = {
    orderId,
    userId,
    ...data, 
    createdAt: new Date(),
    status: "Pending"
  };

  const addData = await db.collection(dbVariables.orderCollection).insertOne(orderDoc);
  return addData;
};
exports.showOrder = async (userId) => {
  const db = await getDB();

  // Fetch all orders for the user
  const orders = await db.collection(dbVariables.orderCollection)
    .find({ userId })
    .toArray();

  for (let order of orders) {
    for (let item of order.items) {
      const product = await db.collection(dbVariables.productCollection)
        .findOne({ _id: new ObjectId(item.productId) }) || {};
      const variant = await db.collection(dbVariables.variantCollection)
        .findOne({ _id: new ObjectId(item.variantId) }) || {};

      item.product = product;
      item.variant = variant;
    }
  }
  // Return full orders array with populated data
  return orders;
};