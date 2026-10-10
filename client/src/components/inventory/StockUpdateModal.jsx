import React, { useEffect, useState } from "react";

const initialFormData = {
  updateType: "add",
  quantity: "",
  reason: "",
};

const StockUpdateModal = ({
  isOpen,
  onClose,
  theme,
  stockItem,
  onStockUpdated,
}) => {
  const [formData, setFormData] = useState(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isDark = theme === "dark";

  const officeId = sessionStorage.getItem("selected_office") || "";
  const vendorId = sessionStorage.getItem("selected_vendor") || "";

  const withWorkspace = (url) => {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}officeId=${encodeURIComponent(
      officeId,
    )}&vendorId=${encodeURIComponent(vendorId)}`;
  };

  useEffect(() => {
    if (isOpen) {
      setFormData(initialFormData);
      setError("");
    }
  }, [isOpen]);

  if (!isOpen || !stockItem) return null;

  const inputClasses = `w-full px-4 py-3 rounded-2xl border outline-none ${
    isDark
      ? "bg-[#111111] border-[#1f1f1f] text-white"
      : "bg-[#f9faf7] border-[#e8e8e0] text-black"
  }`;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleClose = () => {
    setFormData(initialFormData);
    setError("");
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const token = localStorage.getItem("bizlift_token");
      const response = await fetch(
        withWorkspace(
          `/api/inventory/${stockItem.id}/stock`,
        ),
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            updateType: formData.updateType,
            quantity: formData.quantity,
            reason: formData.reason,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to update stock.");
      }

      onClose();
      if (onStockUpdated) onStockUpdated();
    } catch (err) {
      setError(err.message || "Something went wrong while updating stock.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div
        className={`w-full max-w-xl rounded-[28px] shadow-xl p-6 relative border ${
          isDark
            ? "bg-[#0b0b0b] border-[#1f1f1f] text-white"
            : "bg-white border-[#e8e8e0] text-black"
        }`}
      >
        <button
          onClick={handleClose}
          className={`absolute top-4 right-4 text-xl ${
            isDark
              ? "text-gray-400 hover:text-white"
              : "text-gray-500 hover:text-black"
          }`}
        >
          ×
        </button>

        <h2 className="text-2xl font-bold mb-2">Update Stock</h2>
        <p
          className={`text-sm mb-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}
        >
          {stockItem.itemName} • Current Stock: {stockItem.currentStock}{" "}
          {stockItem.unit}
        </p>

        {error && (
          <div
            className={`mb-4 rounded-2xl px-4 py-3 text-sm ${
              isDark
                ? "bg-red-950 text-red-300 border border-red-900"
                : "bg-red-50 text-red-600 border border-red-200"
            }`}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4">
            <select
              name="updateType"
              value={formData.updateType}
              onChange={handleChange}
              className={inputClasses}
            >
              <option value="add">Add Stock</option>
              <option value="reduce">Reduce Stock</option>
              <option value="set">Set Exact Stock</option>
            </select>

            <input
              type="number"
              name="quantity"
              placeholder="Quantity"
              value={formData.quantity}
              onChange={handleChange}
              className={inputClasses}
            />

            <input
              type="text"
              name="reason"
              placeholder="Reason (optional)"
              value={formData.reason}
              onChange={handleChange}
              className={inputClasses}
            />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={handleClose}
              className={`px-5 py-2.5 rounded-2xl border ${
                isDark
                  ? "border-[#2a2a2a] text-gray-300 hover:bg-[#111111]"
                  : "border-[#dcded4] text-gray-700 hover:bg-[#f7f8f3]"
              }`}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-2xl text-black font-semibold transition hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: "#9ad17b" }}
            >
              {submitting ? "Updating..." : "Update Stock"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StockUpdateModal;
