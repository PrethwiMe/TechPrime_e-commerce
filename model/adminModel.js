// mongo data 
const e = require('connect-flash');
const dbVariables = require('../config/databse')
const { getDB } = require('../config/mongodb')
const { ObjectId } = require('mongodb');
const { types } = require('joi');


//admin login data
exports.adminLogin = async (params) => {

  const db = getDB();
  let data = await db.collection(dbVariables.adminCollection).findOne({ email: params })
  return data

}
//user list fetch
exports.userDataFetch = async () => {
  const db = getDB();
  return await db.collection(dbVariables.userCollection).find().toArray();

}
exports.getPaginatedUsers = async (filter, sort, skip, limit) => {
  const db = getDB();

  const users = await db
    .collection(dbVariables.userCollection)
    .find(filter)
    .project({
      firstName: 1,
      lastName: 1,
      email: 1,
      phone: 1,
      isActive: 1,
      createdAt: 1
    })
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .toArray();

  const totalDocs = await db
    .collection(dbVariables.userCollection)
    .countDocuments(filter);

  return { data: users, totalDocs };
};
//controll user
exports.userControll = async (id) => {
  try {

    const db = getDB();
    const user = await db.collection(dbVariables.userCollection).findOne({ _id: new ObjectId(id) })

    if (!user) {
      throw new Error('User not found');
    };


    if (user.isActive === true) {
      console.log("true");

      // Disable the user
      let result = await db.collection(dbVariables.userCollection).updateOne(
        { _id: new ObjectId(id) },
        { $set: { isActive: "blocked" } }
      );
      console.log(result);
      return true
    } else if (user.isActive === "blocked") {
      // Enable the user
      console.log("false");
      let result = await db.collection(dbVariables.userCollection).updateOne(
        { _id: new ObjectId(id) },
        { $set: { isActive: true } }
      );
      console.log(result);
    }


  } catch (error) {
    console.log(error);
    res.send(error)

  }


};
//orders
exports.viewOrders = async () => {
  try {
    const db = await getDB();

const orderData = await db.collection(dbVariables.orderCollection).find({$or: [{ paymentStatus: "paid" },{ paymentMethod: "cod" } ]})
  .sort({ createdAt: -1 }).toArray();
    if (!orderData) throw new Error('No orders found or query failed');

    const ordersWithDetails = await Promise.all(orderData.map(async (order) => {
      const userId = order.userId; 

      let buyer = null;
      try {
        buyer = await db.collection(dbVariables.userCollection).findOne({ _id: new ObjectId(userId) });
      } catch (userError) {
        console.error(`Error fetching buyer ${userId} for order ${order._id}:`, userError);
        buyer = { name: 'Unknown', email: 'Unknown', phone: 'Unknown' };
      }
      const itemsWithDetails = await Promise.all(order.items.map(async (item) => {
        try {
          const product = await db.collection(dbVariables.productCollection).findOne({ _id: new ObjectId(item.productId) });
          const variant = await db.collection(dbVariables.variantCollection).findOne({ _id: new ObjectId(item.variantId) });

          return {
            ...item,
            productName: product ? product.name : 'Unknown Product',
            productCompany: product ? product.companyDetails : 'Unknown',
            variantDetails: variant || {},
            productImages: product && product.images ? product.images : [],
            firstImage: product && product.images && product.images.length > 0 ? product.images[0] : null
          };
        } catch (innerError) {
          console.error(`Error fetching item ${item.productId} in order ${order._id}:`, innerError);
          return {
            ...item,
            productName: 'Error',
            productCompany: 'Error',
            variantDetails: {},
            productImages: [],
            firstImage: null,
            error: innerError.message
          };
        }
      }));

      return {
        ...order,
        items: itemsWithDetails,
        totalItems: itemsWithDetails.length,
        buyer: buyer ? {
          fullName: buyer.firstName || 'Unknown',
          email: buyer.email || 'Unknown',
          phone: buyer.phone || 'Unknown'
        } : { fullName: 'Unknown', email: 'Unknown', phone: 'Unknown' }
      };
    }));

    return { ordersWithDetails };
  } catch (error) {
    console.error("Error fetching orders:", error);
    throw error;
  }
};
// update order status
exports.updateOrderStatus = async (orderId, st) => {
    try {
        const db = await getDB();

        const result = await db.collection(dbVariables.orderCollection).updateOne(
            { _id: new ObjectId(orderId) },
            { $set: { status:st } }
        );

        return result;
    } catch (err) {
        throw new Error('Failed to update order status: ' + err.message);
    }
};
//accept order
exports.returnAccept = async (id,st) => {
  console.log(id,"  ",st);
  const db = await getDB();
  const update = await db.collection(dbVariables.orderCollection)
  .updateOne({_id: new ObjectId(id)},{$set:{returnOrder:st}})

  return update;
}
//upadate item status
exports.updateItemStatus = async (params) => {
  try {
    let { orderId, variantId, itemStatus } = params;
    const db = await getDB();
    let result = await db.collection(dbVariables.orderCollection).updateOne(
      { _id: new ObjectId(orderId)  }, 
      {
        $set: {
          "items.$[elem].itemStatus": itemStatus,
        },
      },
      {
        arrayFilters: [{ "elem.variantId": variantId }],
      }
    );

    console.log("Update result:", result);

    if (result.modifiedCount === 0) {
      console.warn(" No item was updated. Check orderId/variantId match.");
    }

    const order = await db
      .collection(dbVariables.orderCollection)
      .findOne({ orderId });


    if (!order) {
      return { success: false, message: "Order not found" };
    }

    let allStatuses = order.items.map((item) => item.itemStatus || "Pending");

    console.log("All item statuses:", allStatuses);

    let newOrderStatus = "Pending";

    if (allStatuses.every((s) => s === "Delivered")) {
      newOrderStatus = "Delivered";
    } else if (allStatuses.every((s) => s === "Cancelled")) {
      newOrderStatus = "Cancelled";
    } else if (allStatuses.every((s) => s === "Shipped" || s === "Delivered")) {
      newOrderStatus = "Shipped"; 
    } else {
      newOrderStatus = "Partially Fulfilled"; 
    }

    await db.collection(dbVariables.orderCollection).updateOne(
      { orderId },
      { $set: { status: newOrderStatus } }
    );

    return { success: true, orderId, newOrderStatus };
  } catch (err) {
    console.error(" Error in updateItemStatus:", err);
    return { success: false, message: "Internal error", error: err.message };
  }
};
// add offer
exports.offerAdd = async (data) => {
  const db = getDB();

  let check = null;

  if (data.appliesTo == "category") {
    check = await db.collection(dbVariables.offerCollection).findOne({
      Active: true,
      categoryId: data.categoryId
    });
  } else if (data.appliesTo == "product") {
    check = await db.collection(dbVariables.offerCollection).findOne({
      Active: true,
      productId: data.productId
    });
  }


  if (check) {
    return { exists: true, message: `An active offer already exists for this ${data.appliesTo}. Disable to add new offer` };
  }

  const newOffer = {
    ...data,
    Active: true
  };

  const response = await db.collection(dbVariables.offerCollection).insertOne(newOffer);
  return { inserted: true, response }; 
};
exports.offerView = async (data) => {
  const db = getDB();
  const response = await db.collection(dbVariables.offerCollection).find({Active:true}).toArray();
  return response
}
exports.disableOffer = async(id,status) => {
  const db = await getDB();
  const response = await db.collection(dbVariables.offerCollection).updateOne({_id: new ObjectId(id)},{$set:{Active:status.Active}})
  return response
}
exports.viewOffers = async (id) => {
  const db = await getDB()
     check = await db.collection(dbVariables.offerCollection).findOne(id);
     return check;
}
exports.addCoupon = async (data) => {
 
  const db =await getDB();
  const result = await db.collection(dbVariables.couponCollection).insertOne(data);
  return result;
}
exports.viewCouponPage = async () => {
  const db = await getDB();
  const response = await db.collection(dbVariables.couponCollection).find({isActive:true}).toArray();
  return response;
}
exports.checkOffers = async (query) => {

  try {
    const db = await getDB();
    const offerCollection = db.collection(dbVariables.offerCollection);

    const { productId, categoriesId } = query;
    const currentDate = new Date();

    let productOffer = await offerCollection.findOne({
      productId: productId,
      Active: true,
      startDate: { $lte: currentDate },
      endDate: { $gte: currentDate },
    });

    let categoryOffer = null;
   
      categoryOffer = await offerCollection.findOne({
        categoryId: categoriesId,
        Active: true,
        startDate: { $lte: currentDate },
        endDate: { $gte: currentDate },
      });
    
    if (productOffer && categoryOffer) {
      return productOffer.offerValue >= categoryOffer.offerValue
        ? productOffer
        : categoryOffer;
    }

    return productOffer || categoryOffer || null;
  } catch (error) {
    console.error("Error checking offers:", error);
    return null;
  }
};
exports.deleteCoupon = async (couponId) => {
const db = await getDB();
console.log(couponId);
const response = await db.collection(dbVariables.couponCollection).updateOne({_id: new ObjectId(couponId)},{$set:{isActive:false}})
return response;

}
exports.editCoupon = async (couponId, data) => {

  const db = await getDB();

  data ={
    couponId,
    ...data
  }
  const response = await db.collection(dbVariables.couponCollection).updateOne(
    { _id: new ObjectId(couponId) },
    { $set: data }
  );

  return response;
}
exports.updateItemsStatus = async (orderId, status) => {
  const db = await getDB();
  const result = await db.collection(dbVariables.orderCollection).updateMany(
    { _id: new ObjectId(orderId) },
    { $set: { "items.$[].itemStatus": status } }
  );
  return result;

}
exports.processReturnProduct = async (orderId, productId, variantId, status) => {
  const db = await getDB(); 
  const result = await db.collection(dbVariables.orderCollection).updateOne(
  { orderId: orderId }, 
  { $set: { "items.$[elem].itemReturn": status } },
  { arrayFilters: [{ "elem.productId": productId, "elem.variantId": variantId }] }
);

  return result;

}
exports.refundToUserWallet = async (orderId, productId, variantId) => {
  const db = await getDB(); 

  let order = await db.collection(dbVariables.orderCollection).findOne({ orderId: orderId },{projection: { orderId:1,userId: 1, items:{$elemMatch:{  itemReturn: 'Approved'}}} } );
  if (!order) {
    throw new Error('Order not found');
    }
    console.log("order of wallet is ",order);
    order ={
      ...order,
      refunded:true,
      refundDate: new Date(),
      type: 'credit'
    }
    const refund = await db.collection(dbVariables.walletCollection).insertOne(order)
    console.log("refund update,",refund);
    return refund;


  }