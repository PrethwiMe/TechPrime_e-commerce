// mongo data 
const dbVariables = require('../config/databse')
const { getDB } = require('../config/mongodb')
const { ObjectId } = require('mongodb');
const { any, date } = require('joi');
const { v4: uuidv4 } = require('uuid');
const { pipeline } = require('nodemailer/lib/xoauth2');
const { json } = require('express');
const Razorpay = require('razorpay');


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
          productName: "$items.productName",
          appliesTo: "$items.appliesTo",
          endDate: "$items.endDate",
          offerValue: "$items.offerValue",
          startDate: "$items.startDate",
        }
      }
    ];

    const cartItems = await db.collection(dbVariables.cartCollection).aggregate(pipeline).toArray();

    const pipe =
      [
        { $match: { userId: userId } },
        { $unwind: "$addresses" },
        { $match: { "addresses.isActive": true } },
        { $project: { _id: 0, addresses: 1 } }
      ]

    const addresses = await db.collection(dbVariables.addressCollection).aggregate(pipe).toArray()
    const data = { cartItems, addresses };
    return data;

  } catch (error) {
    return [];
  }
};
exports.addNewOrder = async (userId, data) => {

  const orderId = "ORD" + Math.floor(10000000 + Math.random() * 90000000);

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
exports.deleteCart = async (userId) => {
  const db = await getDB();
  const dlt = await db.collection(dbVariables.cartCollection).deleteOne({ userId: userId })
}
exports.showOrder = async (userId) => {
  const db = await getDB();

  const orders = await db.collection(dbVariables.orderCollection).find({ userId }).sort({ createdAt: -1 }).toArray();

  for (let order of orders) {

    if (!order.items || !Array.isArray(order.items)) {
      order.items = [];
    }

    for (let item of order.items) {
      const product = await db.collection(dbVariables.productCollection).findOne({ _id: new ObjectId(item.productId) }) || {};
      const variant = await db.collection(dbVariables.variantCollection).findOne({ _id: new ObjectId(item.variantId) }) || {};

      item.product = product;
      item.variant = variant;
    }
  }
  return orders;
};
exports.invoiceData = async (userId, orderNumber) => {
  const db = await getDB();


  const pipeline = [
    { $match: { orderId: String(orderNumber.orderId), userId: String(userId) } },
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
        as: "product"
      }
    },
    { $unwind: "$product" },

    {
      $lookup: {
        from: dbVariables.variantCollection,
        localField: "items.variantIdObj",
        foreignField: "_id",
        as: "variant"
      }
    },
    { $unwind: "$variant" },

    {
      $group: {
        _id: "$_id",
        orderId: { $first: "$orderId" },
        userId: { $first: "$userId" },
        selectedAddress: { $first: "$selectedAddress" },
        paymentMethod: { $first: "$paymentMethod" },
        subtotal: { $first: "$subtotal" },
        deliveryCharge: { $first: "$deliveryCharge" },
        total: { $first: "$total" },
        createdAt: { $first: "$createdAt" },
        status: { $first: "$status" },
        items: {
          $push: {
            productId: "$items.productId",
            variantId: "$items.variantId",
            quantity: "$items.quantity",
            price: "$items.price",
            productName: "$product.name",
            productImages: "$product.images",
            company: "$product.companyDetails",
            processor: "$variant.processor",
            ram: "$variant.ram",
            storage: "$variant.storage",
            graphics: "$variant.graphics",
            color: "$variant.color",
            display: "$variant.display",
            variantPrice: "$variant.price"
          }
        }
      }
    }
  ];

  const orders = await db.collection(dbVariables.orderCollection).aggregate(pipeline).toArray();
  //userdata
  const buyer = await db.collection(dbVariables.userCollection).findOne({ _id: new ObjectId(userId) });


  const invoice = orders[0] || null;
  if (!buyer) {
    throw new Error("User not found");
  }
  return {
    buyer,
    order: invoice,


  };
};
exports.cancelOrderModal = async (orderId) => {

  const db = await getDB();
  const update = await db.collection(dbVariables.orderCollection).updateOne({ orderId: orderId }, { $set: { status: "Cancelled" } })
  return update
}
exports.returnData = async (data) => {
  const db = await getDB();

  return updateData
}
exports.newOtp = async (otp, id, emil) => {
  const db = await getDB();
  const updateOtp = await db.collection(dbVariables.userCollection).updateOne(
    { _id: new ObjectId(id) }, { $set: { otp: otp, otpCreated: new Date(), tempmail: emil } }
  )
  return updateOtp;
}
exports.updateUser = async (data) => {
  try {
    const db = await getDB();

    const { id, firstName, lastName, phone, profileImage } = data;

    const result = await db
      .collection(dbVariables.userCollection)
      .updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            firstName,
            lastName,
            phone,
            profileImage,
            updatedAt: new Date()
          }
        }
      );

    return result;
  } catch (err) {
    console.error(" Error updating user:", err);
    throw err;
  }
};
exports.canceleachItems = async (data) => {
  try {
    let { orderId, variantId, status } = data;

    if (status == "Pending" || "Shipped") {
      status = "Cancelled"
    }
    const db = await getDB();

    const result = await db.collection(dbVariables.orderCollection).updateOne(
      { orderId: orderId }, // find the order
      { $set: { "items.$[elem].itemStatus": status } }, // set itemStatus
      {
        arrayFilters: [{ "elem.variantId": variantId }] 
      }
    );

    return result.modifiedCount > 0
      ? { success: true, message: "Item status updated successfully" }
      : { success: false, message: "No item updated" };
  } catch (error) {
    console.error("Error in canceleachItems:", error);
    return { success: false, message: "Something went wrong" };
  }
};
exports.showOrderVerify = async (dbOrderId) => {
  const db = await getDB();
  return await db.collection(dbVariables.orderCollection).findOne(
    { orderId: dbOrderId });
};
exports.orderUpdate = async (razorpayOrderId, data) => {
  const db = await getDB();

  const existing = await db.collection(dbVariables.orderCollection).findOne({
    $or: [
      { razorpayOrderId: razorpayOrderId },
      { "retryRazorpayOrderId.retryRazorpayOrderId": razorpayOrderId }
    ]
  });
  const updateFields = {
    updatedAt: new Date(),
    ...(data.paymentStatus && { paymentStatus: data.paymentStatus }),
    ...(data.razorpayPaymentId && { razorpayPaymentId: data.razorpayPaymentId }),
    ...(data.razorpaySignature && { razorpaySignature: data.razorpaySignature }),
    ...(data.status && { status: data.status }),
    items: existing.items.map(item => ({
      ...item,
      itemStatus: "Pending"
    }))
  };
  const result = await db.collection(dbVariables.orderCollection).updateOne(
    {
      $or: [
        { razorpayOrderId: razorpayOrderId },
        { "retryRazorpayOrderId.retryRazorpayOrderId": razorpayOrderId }
      ]
    },
    { $set: updateFields }
  );
  return result;
};
exports.checkCoupon = async (data) => {
  const db = await getDB()
  const response = await db.collection(dbVariables.couponCollection).findOne({ code: data })
  return response;
}
exports.getOrderByOrderId = async (userId, code) => {
  const db = await getDB();
  const order = await db.collection(dbVariables.orderCollection).findOne({ orderId: code, userId: userId })
  return order

}
exports.updateRetryPaymentOrder = async (razorpayOrderId, newRazorpayOrderId, newReceipt) => {
  try {
    const db = await getDB();

    const result = await db.collection(dbVariables.orderCollection).updateOne(
      { razorpayOrderId: razorpayOrderId },
      {
        $set: {
          retryRazorpayOrderId: newRazorpayOrderId,
          retryReceipt: newReceipt,
          updatedAt: new Date(),
        },
      }
    );

    return result;
  } catch (err) {
    console.error('Error updating retry payment order:', err);
    throw err;
  }
};
exports.returnEachItems = async (data) => {
  const { orderId, productId, variantId, itemReturn, reason } = data;
  try {
    const db = await getDB();

    const timeNow = new Date();
    const result = await db.collection(dbVariables.orderCollection).findOne(
      { orderId: orderId, "items.variantId": variantId },
      {
        projection: {
          items: { $elemMatch: { variantId: variantId } },
          orderId: 1,
          userId: 1,
          couponCode: 1,
          subtotal: 1,
          couponDiscount: 1,
          total: 1
        }
      }
    );

    if (!result) return { success: false, message: "Order or item not found" };

    let couponCode = result.couponCode || null;

    const item = result.items[0];
    const itemValue = item.discountedPrice * item.quantity;



    const refundAmount = +(itemValue ).toFixed(2);
    const returnData = {
      orderId,
      userId: result.userId,

      reason,
      returnStatus: itemReturn,
      returnDate: new Date(),
      refundAmount,
      items: item,
    };

    const returnCollection = db.collection(dbVariables.returnCollection);
    let response = await returnCollection.insertOne(returnData);
    //updating item status of order collection
    await db.collection(dbVariables.orderCollection).updateOne(
      { orderId: orderId },
      { $set: { "items.$[elem].itemReturn": "return" } },
      { arrayFilters: [{ "elem.productId": productId, "elem.variantId": variantId }] }
    );
    return { success: true, refundAmount };
  } catch (error) {
    console.error("Error in returnEachItems:", error);
    return { success: false, message: "Something went wrong" };
  }
};
exports.getWalletData = async (userId) => {
  try {
    const db = await getDB();
    const walletData = await db.collection(dbVariables.walletCollection).find({ userId: userId }).sort({ refundDate: -1 }).toArray();
    return walletData;
  } catch (error) {
    console.error("Error in getWalletData:", error);
    return null;
  }
};
exports.checkReturnItem = async (data) => {
  const { orderId, variantId } = data;
  try {
    const db = await getDB();
    const checkDuplicate = await db.collection(dbVariables.returnCollection).findOne({ orderId: orderId, "items.variantId": variantId });
    return checkDuplicate;
  } catch (error) {
    console.error("Error in checkReturnItem:", error);
    return null;
  }
}
exports.returnStatusData = async (userId, orderId) => {
  try {
    const db = await getDB();
    const returnData = await db.collection(dbVariables.returnCollection).aggregate([
      { $match: { userId: userId, orderId: orderId } },
      {
        $addFields: {
          userObjectId: { $toObjectId: "$items.productId" }
        }
      },
      {
        $lookup: {
          from: dbVariables.productCollection,
          localField: "userObjectId",
          foreignField: "_id",
          as: "userDetails"
        }
      },
      { $unwind: "$userDetails" },
      { $sort: { returnDate: -1 } }
    ]).toArray();

    return returnData;
  } catch (error) {
    console.error("Error in returnStatusData:", error);
    return null;
  }
};
exports.getWalletAmount = async (userId) => {
  try {

    const db = await getDB();
    const walletData = await db.collection(dbVariables.walletCollection).findOne({ userId: userId });
    return walletData

  } catch (error) {
    console.error("Error in getWalletAmount:", error);
    return 0;
  }

}
exports.deductWalletAmount = async (userId, amount) => {
  try {

    const db = await getDB();
    const updateData = await db.collection(dbVariables.walletCollection).updateOne(
      { userId: userId },
      { $inc: { walletAmount: -amount } }
    );
    return updateData;
  } catch (error) {
    console.error("Error in deductWalletAmount:", error);
    return null;
  }
}
exports.updateWalletHistory = async (userId, amount) => {
  const db = await getDB();
  const users = await db.collection(dbVariables.walletCollection).findOne({ userId: userId })
  if (!users) return "No wallet found"
  const updateData = await db.collection(dbVariables.walletCollection).updateOne(
    { userId: userId },
    { $push: { walletHistory: { amount: amount, date: new Date(), type: "Debit" } } }
  );
  return updateData;

}
// update wallet after cancel item
exports.updateWalletAfterCancelItem = async (userId, data) => {
  try {
      //const updateWallet = await walletUpdate.updateOne()
    let { orderId, variantId } = data;
    const db = await getDB();
    const order = await db.collection(dbVariables.orderCollection);
    const orderData = await order.findOne({ orderId: orderId, "items.variantId": variantId },
      { projection: { "items.$": 1 ,paymentMethod:1} });
    let detailsInsert = orderData.items[0];

    let amount = (detailsInsert.subtotal ) + detailsInsert.subtotal;
   
    let refundAmount = detailsInsert.subtotal;
    let productId = detailsInsert.productId;
    let rate = (detailsInsert.subtotal )+ detailsInsert.subtotal;
    let status = "Refunded"
    let details =  {
        userId,
        walletAmount: rate,
        updatedDate: new Date(),
        refundHistory: [
          {
            orderId,
            productId,
            variantId,
            status,
            refund:"credit",
            refundAmount:rate,
            date: new Date(),
           
          }]
      }
    const walletUpdate = await db.collection(dbVariables.walletCollection);
    const checkWallet = await walletUpdate.findOne({ userId: userId });
    if (!checkWallet) {
      let newWallet = await db.collection(dbVariables.walletCollection).insertOne( details )
      return newWallet;
    }
    amount = checkWallet.walletAmount + amount;
    const updateWallet = await walletUpdate.updateOne(
         { userId: userId },
    {
      $set: { walletAmount: amount, updatedDate: new Date() },
      $push:{refundHistory:{orderId,productId:detailsInsert.productId,variantId,status:"Refunded",refund:"credit",refundAmount:rate,date:new Date()}}
    }
    )
    return updateWallet;
  } catch (error) {
    console.error("Error in updateWalletAfterCancelItem:", error);
    return null;
  }
}
exports.updateReferralInDb = async (code, userId) => {
  try {
    const db = await getDB();
    let collectionIs = await db.collection(dbVariables.referalCollection);
    let checkrefer =await collectionIs.findOne({userId:userId});
    if (checkrefer) {
      
      let result =await collectionIs.updateOne({ userId:userId },{ $set: { code: code } });
    return { success: true, result };
    }else{
      let addrefer = await collectionIs.insertOne({userId:userId,count:0,code,totalEarnings:0})
          return { success: true, addrefer };

    }

  } catch (error) {
    console.error("updateReferralInDb error:", error);
    return { success: false, error };
  }
}
exports.disableCoupon = async (code) => {

  const db = await getDB()
  const changeState = await db.collection(dbVariables.couponCollection).updateOne({code:code},{$set:{isActive:false}})
  return changeState
}
exports.getCoupon = async () => {
  let db = await getDB();
  let collectionIs = await db.collection(dbVariables.couponCollection).find({isActive:true}).toArray()
return collectionIs
 }