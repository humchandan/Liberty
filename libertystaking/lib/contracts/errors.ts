export const CONTRACT_ERRORS = {
  InvalidAddress: "Invalid wallet address provided",
  DeadlineExpired: "Transaction deadline has expired",
  UnsupportedToken: "Token not supported (use INRT or USDT)",
  InvalidAmount: "Amount must be a multiple of order size",
  InsufficientOrders: "Not enough orders available in current epoch",
  ExceedsUserLimit: "You've reached the maximum orders per epoch",
  InsufficientTreasury: "Treasury has insufficient funds",
  InvalidReferrer: "Invalid referrer address",
  ReferrerAlreadySet: "Referrer already set for your account",
  NotYourOrder: "You don't own this order",
  AlreadyProcessed: "Order already claimed or refunded",
  NotEligible: "Not eligible for this action yet",
  NoBonus: "No referral bonus available to claim",
  BonusHalted: "Referral bonus limit reached",
  InvalidBatchSize: "Batch size must be between 1-50",
  InvalidOrderId: "Invalid order ID",
  NotOverdue: "Order not overdue yet",
  ActiveOrdersExist: "Cannot withdraw: active orders exist",
  NoFundsToWithdraw: "No funds available to withdraw"
};

/*  Usage in your catch block:
catch (error: any) {
  const errorName = error.message.match(/error (\w+)/)?.[1];
  const friendlyMessage = CONTRACT_ERRORS[errorName as keyof typeof CONTRACT_ERRORS] 
    || error.message;
  showError(friendlyMessage);
}
*/
