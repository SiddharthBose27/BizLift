import React from "react";

const statusStyles = {
  "In Stock": "bg-green-100 text-green-700 border border-green-200",
  "Low Stock": "bg-yellow-100 text-yellow-700 border border-yellow-200",
  "Out of Stock": "bg-red-100 text-red-700 border border-red-200",
  "Expiring Soon": "bg-purple-100 text-purple-700 border border-purple-200",
};

const StatusBadge = ({ status }) => {
  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
        statusStyles[status] ||
        "bg-gray-100 text-gray-700 border border-gray-200"
      }`}
    >
      {status}
    </span>
  );
};

export default StatusBadge;
