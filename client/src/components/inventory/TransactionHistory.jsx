import React from "react";

const typeStyles = {
  create: "bg-blue-100 text-blue-700 border border-blue-200",
  edit: "bg-gray-100 text-gray-700 border border-gray-200",
  add: "bg-green-100 text-green-700 border border-green-200",
  reduce: "bg-yellow-100 text-yellow-700 border border-yellow-200",
  set: "bg-purple-100 text-purple-700 border border-purple-200",
  delete: "bg-red-100 text-red-700 border border-red-200",
  sale_deduction: "bg-orange-100 text-orange-700 border border-orange-200",
  manual_adjustment: "bg-indigo-100 text-indigo-700 border border-indigo-200",
};

const formatTimestamp = (timestamp) => {
  if (!timestamp) return "—";

  const date = new Date(timestamp);

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const prettyType = (type) => {
  switch (type) {
    case "create":
      return "Created";
    case "edit":
      return "Edited";
    case "add":
      return "Stock Added";
    case "reduce":
      return "Stock Reduced";
    case "set":
      return "Stock Set";
    case "delete":
      return "Deleted";
    case "sale_deduction":
      return "Sale Deduction";
    case "manual_adjustment":
      return "Manual Update";
    default:
      return type
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
  }
};

const TransactionHistory = ({ transactions, theme }) => {
  const isDark = theme === "dark";

  return (
    <div
      className={`rounded-[24px] border mt-8 overflow-hidden ${
        isDark
          ? "bg-[#0b0b0b] border-[#1f1f1f]"
          : "bg-white border-[#e8e8e0] shadow-sm"
      }`}
    >
      <div
        className={`px-6 py-5 border-b ${
          isDark ? "border-[#1f1f1f]" : "border-[#e8e8e0]"
        }`}
      >
        <h2 className="text-2xl font-bold">Recent Inventory Activity</h2>
        <p className={isDark ? "text-gray-400 mt-1" : "text-gray-500 mt-1"}>
          Track all stock movements and inventory changes.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-left">
          <thead
            className={`border-b ${
              isDark
                ? "bg-[#111111] border-[#1f1f1f]"
                : "bg-[#f6f7f2] border-[#e8e8e0]"
            }`}
          >
            <tr>
              <th className="px-5 py-4 font-semibold">Item</th>
              <th className="px-5 py-4 font-semibold">Action</th>
              <th className="px-5 py-4 font-semibold">Quantity</th>
              <th className="px-5 py-4 font-semibold">Reason</th>
              <th className="px-5 py-4 font-semibold">Previous Stock</th>
              <th className="px-5 py-4 font-semibold">New Stock</th>
              <th className="px-5 py-4 font-semibold">Timestamp</th>
            </tr>
          </thead>

          <tbody>
            {transactions.length > 0 ? (
              transactions.map((transaction) => (
                <tr
                  key={transaction.id}
                  className={`border-b ${
                    isDark
                      ? "border-[#1f1f1f] hover:bg-[#111111]"
                      : "border-[#e8e8e0] hover:bg-[#f9faf7]"
                  }`}
                >
                  <td className="px-5 py-4 font-medium">
                    {transaction.itemName}
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                        typeStyles[transaction.type] ||
                        "bg-gray-100 text-gray-700 border border-gray-200"
                      }`}
                    >
                      {prettyType(transaction.type)}
                    </span>
                  </td>

                  <td className="px-5 py-4">{transaction.quantity}</td>
                  <td className="px-5 py-4">{transaction.reason}</td>
                  <td className="px-5 py-4">
                    {transaction.beforeStock ?? transaction.previousStock}
                  </td>
                  <td className="px-5 py-4">
                    {transaction.afterStock ?? transaction.newStock}
                  </td>
                  <td className="px-5 py-4">
                    {formatTimestamp(transaction.createdAt || transaction.timestamp)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="px-5 py-8 text-center text-gray-500">
                  No inventory activity found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransactionHistory;
