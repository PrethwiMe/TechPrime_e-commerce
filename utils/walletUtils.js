const userProfileModel = require("../model/userProfileModel");

exports.handleWalletPayment = async (userId, total) => {
  try {
    //  wallet amount
    const wallet = await userProfileModel.getWalletAmount(userId);
    if (!wallet) return { success: false, message: "Insufficient wallet balance" };

    if (wallet.walletAmount < total) {
      return { success: false, message: "Insufficient wallet balance" };
    }

    // decreas wallet amount
    const deductWallet = await userProfileModel.deductWalletAmount(userId, total);
    if (!deductWallet) return { success: false, message: "Failed to deduct wallet amount" };

    // Update wallet history
    const updateWallet = await userProfileModel.updateWalletHistory(userId, total);
    if (!updateWallet) return { success: false, message: "Failed to update wallet history" };

    return { success: true };
  } catch (error) {
    console.error("walletUtils error:", error);
    return { success: false, message: "Wallet processing failed" };
  }
};
