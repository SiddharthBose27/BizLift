import React from "react";

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

const SalesTable = ({ sales, theme }) => {
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
        <h2 className="text-2xl font-bold">Recent Sales</h2>
        <p className={isDark ? "text-gray-400 mt-1" : "text-gray-500 mt-1"}>
          Recorded menu sales with automatic ingredient deductions.
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
              <th className="px-5 py-4 font-semibold">Menu Item</th>
              <th className="px-5 py-4 font-semibold">Qty Sold</th>
              <th className="px-5 py-4 font-semibold">Selling Price</th>
              <th className="px-5 py-4 font-semibold">Total Amount</th>
              <th className="px-5 py-4 font-semibold">Auto Deductions</th>
              <th className="px-5 py-4 font-semibold">Timestamp</th>
            </tr>
          </thead>

          <tbody>
            {sales.length > 0 ? (
              sales.map((sale) => (
                <tr
                  key={sale.id}
                  className={`border-b ${
                    isDark
                      ? "border-[#1f1f1f] hover:bg-[#111111]"
                      : "border-[#e8e8e0] hover:bg-[#f9faf7]"
                  }`}
                >
                  <td className="px-5 py-4 font-medium">{sale.menuItemName}</td>
                  <td className="px-5 py-4">{sale.quantitySold}</td>
                  <td className="px-5 py-4">₹{sale.sellingPrice}</td>
                  <td className="px-5 py-4">₹{sale.totalAmount}</td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      {sale.deductions?.map((deduction, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200"
                        >
                          {deduction.itemName} • -{deduction.deductedQuantity}{" "}
                          {deduction.unit}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {formatTimestamp(sale.createdAt)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="px-5 py-8 text-center text-gray-500">
                  No sales recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SalesTable;
