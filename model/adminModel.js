// mongo data 
const dbVariables = require('../config/databse')
const { getDB, connectDB } = require('../config/mongodb')
const { ObjectId } = require('mongodb');
const paginate = require('../utils/paginate');

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
        { $set: { isActive: false } }
      );
      console.log(result);
      return true
    } else if (user.isActive === false) {
      // Enable the user
      console.log("true");
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

    const orderData = await db.collection(dbVariables.orderCollection).find().toArray();
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

