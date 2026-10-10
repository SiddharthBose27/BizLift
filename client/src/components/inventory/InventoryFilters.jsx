import React from "react";

const InventoryFilters = ({
  theme,
  searchTerm,
  setSearchTerm,
  selectedCategory,
  setSelectedCategory,
  selectedStatus,
  setSelectedStatus,
  categories,
  statuses,
  onAddItemClick,
  selectionMode,
  onToggleSelectionMode,
  selectedCount,
  onDeleteSelected,
  onEditSelected,
  onUpdateSelectedStock,
}) => {
  const isDark = theme === "dark";

  const inputClasses = `w-full px-4 py-3 rounded-2xl border outline-none transition ${
    isDark
      ? "bg-[#0b0b0b] border-[#1f1f1f] text-white placeholder:text-gray-500"
      : "bg-white border-[#e8e8e0] text-black placeholder:text-gray-400"
  }`;

  return (
    <div
      className={`rounded-[24px] p-4 mb-6 border ${
        isDark
          ? "bg-[#0b0b0b] border-[#1f1f1f]"
          : "bg-white border-[#e8e8e0] shadow-sm"
      }`}
    >
      <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
        <div className="flex flex-col md:flex-row gap-3 flex-1">
          <input
            type="text"
            placeholder="Search by item name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full md:w-1/2 ${inputClasses}`}
          />

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className={inputClasses}
          >
            <option value="All">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className={inputClasses}
          >
            <option value="All">All Statuses</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-3">
          {!selectionMode ? (
            <>
              <button
                onClick={onToggleSelectionMode}
                className="px-5 py-3 rounded-2xl font-semibold transition"
                style={{ backgroundColor: "#1f1f1f", color: "#ffffff" }}
              >
                Select Items
              </button>

              <button
                onClick={onAddItemClick}
                className="px-5 py-3 rounded-2xl font-semibold transition hover:opacity-90"
                style={{ backgroundColor: "#9ad17b", color: "#000000" }}
              >
                + Add Item
              </button>
            </>
          ) : (
            <>
              <span className="px-2 py-3 text-sm text-gray-400">
                {selectedCount} selected
              </span>

              <button
                onClick={onEditSelected}
                className="px-5 py-3 rounded-2xl font-semibold transition hover:opacity-90"
                style={{ backgroundColor: "#9ad17b", color: "#000000" }}
              >
                Edit
              </button>

              <button
                onClick={onUpdateSelectedStock}
                className="px-5 py-3 rounded-2xl font-semibold transition hover:opacity-90"
                style={{ backgroundColor: "#9ad17b", color: "#000000" }}
              >
                Update Stock
              </button>

              <button
                onClick={onDeleteSelected}
                className="px-5 py-3 rounded-2xl font-semibold transition hover:opacity-90"
                style={{ backgroundColor: "#ef4444", color: "#ffffff" }}
              >
                Delete
              </button>

              <button
                onClick={onToggleSelectionMode}
                className={`px-5 py-3 rounded-2xl font-semibold border transition ${
                  isDark
                    ? "border-[#2a2a2a] text-white"
                    : "border-[#dcded4] text-black"
                }`}
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default InventoryFilters;
