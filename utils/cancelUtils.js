const { getDB } = require("../config/mongodb");
const dbVariables = require("../config/databse");
const userProfileModel = require("../model/userProfileModel");


exports.cancelOrderUtils = async (req) => {
  const userId = req.session.user?.userId;
  if (!userId) throw new Error("User not logged in");

  const { orderId, paymentMethod, items, reason } = req.body;

  const db = await getDB();
  const orderCollection = db.collection(dbVariables.orderCollection);
  const walletCollection = db.collection(dbVariables.walletCollection);

//check anything is delivered

  // cancel each item
  for (const item of items) {
    const { variantId, status } = item;

    await orderCollection.updateOne(
      { orderId, "items.variantId": variantId },
      {
        $set: {
          "items.$.itemStatus": "Cancelled",
          "items.$.cancelReason": reason || "No reason provided",
          updatedAt: new Date(),
        },
      }
    );

    console.log(`Cancelled variant ${variantId} in order ${orderId}`);

    if (paymentMethod !== "cod") {
      const orderData = await orderCollection.findOne(
        { orderId, "items.variantId": variantId },
        { projection: { "items.$": 1 } }
      );

      if (!orderData || !orderData.items?.length) continue;

      const details = orderData.items[0];
      const refundBase = details.subtotal || 0;
      const refundAmount = refundBase 

      const refundEntry = {
        orderId,
        productId: details.productId,
        variantId,
        status: "Refunded",
        refund: "credit",
        refundAmount,
        date: new Date(),
      };

      const existingWallet = await walletCollection.findOne({ userId });

      if (!existingWallet) {
        await walletCollection.insertOne({
          userId,
          walletAmount: refundAmount,
          updatedDate: new Date(),
          refundHistory: [refundEntry],
        });
      } else {
        const updatedAmount = existingWallet.walletAmount + refundAmount;
        await walletCollection.updateOne(
          { userId },
          {
            $set: { walletAmount: updatedAmount, updatedDate: new Date() },
            $push: { refundHistory: refundEntry },
          }
        );
      }

      console.log(`Refund of ₹${refundAmount} processed for ${variantId}`);
    }
  }
  return { success: true };
};
