// mongo data 
const { Query, Collection } = require('mongoose');
const dbVariables = require('../config/databse')
const { getDB } = require('../config/mongodb')
const { ObjectId } = require('mongodb');
const { any, date } = require('joi');
const { v4: uuidv4 } = require('uuid');


exports.addAddress = async (data) => {
    const db = await getDB();
    const { userId, fullName, phone, line1, city, state, pincode } = data;

    const checkUser = await db.collection(dbVariables.addressCollection).findOne({ userId });

    const addressObj = {id: uuidv4(), fullName, phone, line1, city, state, pincode };

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

exports.viewAddress = async (userId) => {

    const db = await getDB();

    const address = await db.collection(dbVariables.addressCollection).findOne({userId:userId})

    return address
}

exports.updateAddress = async (userId,data) => {
const { updateId, fullName, phone, line1, city, state, pincode } = data

    const db = await getDB();
    const dataUpdate = await db.collection(dbVariables.addressCollection).updateOne(
    {userId:userId,"addresses.id":updateId},{
        $set:{
            "addresses.$.fullName":fullName,
            "addresses.$.phone":phone,
            "addresses.$.line1":line1,
            "addresses.$.city":city,
            "addresses.$.state":state,
            "addresses.$.pincode":pincode,
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

   const addresses = await db.collection(dbVariables.addressCollection).find({userId:userId}).toArray()
  const data = { cartItems, addresses };
    return data;

  } catch (error) {
    return [];
  }
};