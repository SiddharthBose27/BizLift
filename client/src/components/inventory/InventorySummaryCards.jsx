import React from "react";

const InventorySummaryCards = ({ summary, theme }) => {
  const isDark = theme === "dark";

  const cards = [
    {
      title: "Total Items",
      value: summary.totalItems,
      sub: "Tracked currently",
    },
    { title: "Low Stock", value: summary.lowStock, sub: "Needs replenishment" },
    {
      title: "Expiring Soon",
      value: summary.expiringSoon,
      sub: "Action recommended",
    },
    {
      title: "Out of Stock",
      value: summary.outOfStock,
      sub: "Immediate attention",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
      {cards.map((card) => (
        <div
          key={card.title}
          className={`rounded-[24px] p-5 border transition ${
            isDark
              ? "bg-[#0b0b0b] border-[#1f1f1f]"
              : "bg-white border-[#e8e8e0] shadow-sm"
          }`}
        >
          <p
            className={`text-sm mb-3 ${isDark ? "text-gray-400" : "text-gray-500"}`}
          >
            {card.title}
          </p>
          <h3 className="text-3xl font-bold mb-2">{card.value}</h3>
          <p style={{ color: "#9ad17b" }} className="text-sm font-medium">
            {card.sub}
          </p>
        </div>
      ))}
    </div>
  );
};

export default InventorySummaryCards;
