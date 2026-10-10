import React from "react";
import StatusBadge from "./StatusBadge";

const InventoryTable = ({
  items,
  theme,
  selectionMode,
  selectedItems,
  onSelectItem,
}) => {
  const isDark = theme === "dark";

  return (
    <div
      className={`rounded-[24px] border overflow-hidden ${
        isDark
          ? "bg-[#0b0b0b] border-[#1f1f1f]"
          : "bg-white border-[#e8e8e0] shadow-sm"
      }`}
    >
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
              {selectionMode && (
                <th className="px-5 py-4 font-semibold">Select</th>
              )}
              <th className="px-5 py-4 font-semibold">Item Name</th>
              <th className="px-5 py-4 font-semibold">Category</th>
              <th className="px-5 py-4 font-semibold">Current Stock</th>
              <th className="px-5 py-4 font-semibold">Unit</th>
              <th className="px-5 py-4 font-semibold">Min Threshold</th>
              <th className="px-5 py-4 font-semibold">Cost Price</th>
              <th className="px-5 py-4 font-semibold">Selling Price</th>
              <th className="px-5 py-4 font-semibold">Expiry Date</th>
              <th className="px-5 py-4 font-semibold">Supplier</th>
              <th className="px-5 py-4 font-semibold">Last Updated</th>
              <th className="px-5 py-4 font-semibold">Status</th>
            </tr>
          </thead>

          <tbody>
            {items.length > 0 ? (
              items.map((item) => (
                <tr
                  key={item.id}
                  className={`border-b transition ${
                    isDark
                      ? "border-[#1f1f1f] hover:bg-[#111111]"
                      : "border-[#e8e8e0] hover:bg-[#f9faf7]"
                  }`}
                >
                  {selectionMode && (
                    <td className="px-5 py-4">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={() => onSelectItem(item.id)}
                        className="w-4 h-4 accent-green-500"
                      />
                    </td>
                  )}

                  <td className="px-5 py-4 font-medium">{item.itemName}</td>
                  <td className="px-5 py-4">{item.category}</td>
                  <td className="px-5 py-4">{item.currentStock}</td>
                  <td className="px-5 py-4">{item.unit}</td>
                  <td className="px-5 py-4">{item.minThreshold}</td>
                  <td className="px-5 py-4">₹{item.costPrice}</td>
                  <td className="px-5 py-4">₹{item.sellingPrice}</td>
                  <td className="px-5 py-4">
                    {item.expiryDate ? item.expiryDate : "—"}
                  </td>
                  <td className="px-5 py-4">{item.supplier}</td>
                  <td className="px-5 py-4">{item.lastUpdated}</td>
                  <td className="px-5 py-4">
                    <StatusBadge status={item.status} />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={selectionMode ? 12 : 11}
                  className="px-5 py-8 text-center text-gray-500"
                >
                  No inventory items found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InventoryTable;
