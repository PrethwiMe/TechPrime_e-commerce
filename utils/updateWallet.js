
// userId,walletAmount,updatedDate
// refund history[{orderId,productId,variantId,status,refund,refundAmount,date}]

exports.updateAmount = async (data, variantId) => {
  const { orderId, userId } = data;
const { getDB } = require('../config/mongodb.js')
const dbVariables = require('../config/databse')

  const db =  getDB();
  
  const walletCollection = await db.collection(dbVariables.walletCollection);
  const orderCollection = await db.collection(dbVariables.orderCollection);

  // Fetch order
  const order = await orderCollection.findOne({ orderId });
  if (!order) throw new Error("Order not found");

  const item = order.items.find(
    (i) => i.variantId.toString() === variantId.toString()
  );
  if (!item) throw new Error("Item not found in this order");

  const refundAmount = item.subtotal;

  // Fetch wallet
  const wallet = await walletCollection.findOne({ userId });

  if (wallet) {
    const already = wallet.refundHistory?.some(
      (h) =>
        h.orderId === orderId &&
        h.variantId.toString() === variantId.toString()
    );
    if (already) throw new Error("Item already refunded");
  }

  const refundData = {
    orderId,
    productId: item.productId,
    variantId: item.variantId,
    refundAmount,
    status: "Refunded",
    refund: "credit",
    date: new Date()
  };

  if (!wallet) {
    await walletCollection.insertOne({
      userId,
      walletAmount: refundAmount,
      updatedDate: new Date(),
      refundHistory: [refundData]
    });
  } else {
    await walletCollection.updateOne(
      { userId },
      {
        $inc: { walletAmount: refundAmount },
        $push: { refundHistory: refundData },
        $set: { updatedDate: new Date() }
      }
    );
  }

  return { success: true };
};
