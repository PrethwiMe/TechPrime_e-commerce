// mongo data 
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
exports.deleteCart = async (userId) =>{
  const db = await getDB();
  const dlt = await db.collection(dbVariables.cartCollection).deleteOne({userId:userId})
}
exports.showOrder = async (userId) => {
  const db = await getDB();

  const orders = await db.collection(dbVariables.orderCollection).find({ userId }) .sort({ createdAt: -1 }) .toArray();

  for (let order of orders) {
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
    { $match: { orderId: String(orderNumber.orderId),userId: String(userId) }},
    { $unwind: "$items" },

    { $addFields: {
        "items.productIdObj": { $toObjectId: "$items.productId" },
        "items.variantIdObj": { $toObjectId: "$items.variantId" }
      }
    },

    {$lookup: {
        from: dbVariables.productCollection,
        localField: "items.productIdObj",
        foreignField: "_id",
        as: "product"
      }
    },
    { $unwind: "$product" },

    {$lookup: {
        from: dbVariables.variantCollection,
        localField: "items.variantIdObj",
        foreignField: "_id",
        as: "variant"
      }
    },
    { $unwind: "$variant" },

    {$group: {
        _id: "$_id",
        orderId: { $first: "$orderId" },
        userId: { $first: "$userId" },
        selectedAddress: { $first: "$selectedAddress" },
        paymentMethod: { $first: "$paymentMethod" },
        subtotal: { $first: "$subtotal" },
        tax: { $first: "$tax" },
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
  const update = await db.collection(dbVariables.orderCollection).updateOne({orderId:orderId},{$set:{status:"Cancelled"}})
return update
}
exports.cancellAllOrder = async (ids) => {
  const db = await getDB()

const result = await Promise.all(ids.map(async (id)=>{
   
    const databse= await db.collection(dbVariables.orderCollection).updateOne({orderId:id,status:"Pending"},{$set:{status:"Cancelled"}})
    return databse

}))
return result
}
exports.returnData = async (data) => {
  const db = await getDB();
  const {orderId,reason,returnStatus} = data; 
  const updateData = await db.collection(dbVariables.orderCollection).updateOne({orderId:orderId},{$set:{returnReason:reason,returnOrder:returnStatus}});
  return updateData
}
exports.newOtp = async (otp,id,emil) =>{
  const db = await getDB();
  const updateOtp = await db.collection(dbVariables.userCollection).updateOne(
    {_id:new ObjectId(id)},{$set:{otp:otp,otpCreated:new Date(),tempmail:emil}}
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
    console.error("❌ Error updating user:", err);
    throw err;
  }
};
exports.canceleachItems = async (data) => {
  try {
    let { orderId, variantId, status } = data;

    if (status == "Pending" || "Shipped") {
      status = "cancelled"
    }
    const db = await getDB();

    const result = await db.collection(dbVariables.orderCollection).updateOne(
      { orderId: orderId }, // find the order
      { $set: { "items.$[elem].itemStatus": status } }, // set itemStatus
      {
        arrayFilters: [{ "elem.variantId": variantId }] // only update matching variant
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
exports.showOrderVerify = async (id) => {
  const db = await getDB();
  const order = await db.collection(dbVariables.orderCollection).findOne({razorpayOrderId:id})
  return order
}
exports.orderUpdate = async (razorpayOrderId, data) => {
  const db = await getDB();

  // Destructure fields from req.body
  const { selectedAddress,paymentMethod,items,subtotal,tax,deliveryCharge,total,couponCode,razorpayPaymentId,razorpayOrderId: rOrderId,razorpaySignature} = data;

  const updateOrder = await db.collection(dbVariables.orderCollection).updateOne({ razorpayOrderId }, 
      {$set: { selectedAddress,paymentMethod,items,subtotal,tax,deliveryCharge,total,couponCode,razorpayPaymentId,
          razorpayOrderId: rOrderId,razorpaySignature,paymentStatus: "paid", status: "Pending", updatedAt: new Date()}}
    );

  return updateOrder;
};
