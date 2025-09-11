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
        { email: email }, // Find the user by their email
        { $set: { password: hashedPassword } } // Set the new hashed password
      );
    return result; // Return the result of the update operation
  } catch (err) {
    throw new Error('Failed to update password');
  }
};