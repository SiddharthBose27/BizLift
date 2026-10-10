import React, { useEffect, useState } from "react";

const initialFormData = {
  itemName: "",
  category: "",
  currentStock: "",
  unit: "",
  minThreshold: "",
  costPrice: "",
  sellingPrice: "",
  expiryDate: "",
  supplier: "",
};

const categoryOptions = [
  "Dairy",
  "Bakery",
  "Vegetables",
  "Beverages",
  "Snacks",
  "Grains",
  "Condiments",
  "Frozen",
  "Packaging",
  "Other",
];

const unitOptions = [
  "kg",
  "grams",
  "litres",
  "ml",
  "packs",
  "pieces",
  "trays",
  "boxes",
];

const AddItemModal = ({
  isOpen,
  onClose,
  theme,
  onItemAdded,
  editItem = null,
}) => {
  const [formData, setFormData] = useState(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isEditMode = Boolean(editItem);

  useEffect(() => {
    if (editItem) {
      setFormData({
        itemName: editItem.itemName || "",
        category: editItem.category || "",
        currentStock: editItem.currentStock ?? "",
        unit: editItem.unit || "",
        minThreshold: editItem.minThreshold ?? "",
        costPrice: editItem.costPrice ?? "",
        sellingPrice: editItem.sellingPrice ?? "",
        expiryDate: editItem.expiryDate || "",
        supplier: editItem.supplier || "",
      });
    } else {
      setFormData(initialFormData);
    }
  }, [editItem, isOpen]);

  if (!isOpen) return null;

  const isDark = theme === "dark";

  const officeId = sessionStorage.getItem("selected_office") || "";
  const vendorId = sessionStorage.getItem("selected_vendor") || "";

  const withWorkspace = (url) => {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}officeId=${encodeURIComponent(
      officeId,
    )}&vendorId=${encodeURIComponent(vendorId)}`;
  };

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
      const url = isEditMode
        ? `/api/inventory/${editItem.id}`
        : "/api/inventory";

      const method = isEditMode ? "PUT" : "POST";

      const token = localStorage.getItem("bizlift_token");
      const response = await fetch(withWorkspace(url), {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to save item.");
      }

      setFormData(initialFormData);
      onClose();
      if (onItemAdded) onItemAdded();
    } catch (err) {
      setError(err.message || "Something went wrong while saving item.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div
        className={`w-full max-w-2xl rounded-[28px] shadow-xl p-6 relative border ${
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

        <h2 className="text-2xl font-bold mb-2">
          {isEditMode ? "Edit Inventory Item" : "Add Inventory Item"}
        </h2>
        <p
          className={`text-sm mb-6 ${isDark ? "text-gray-400" : "text-gray-500"}`}
        >
          {isEditMode
            ? "Update the inventory item details."
            : "Add a new stock item to your outlet inventory."}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              name="itemName"
              placeholder="Item Name"
              value={formData.itemName}
              onChange={handleChange}
              className={inputClasses}
            />

            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className={inputClasses}
            >
              <option value="">Select Category</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <input
              type="number"
              name="currentStock"
              placeholder="Current Stock"
              value={formData.currentStock}
              onChange={handleChange}
              className={inputClasses}
            />

            <select
              name="unit"
              value={formData.unit}
              onChange={handleChange}
              className={inputClasses}
            >
              <option value="">Select Unit</option>
              {unitOptions.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>

            <input
              type="number"
              name="minThreshold"
              placeholder="Min Threshold"
              value={formData.minThreshold}
              onChange={handleChange}
              className={inputClasses}
            />

            <input
              type="number"
              name="costPrice"
              placeholder="Cost Price"
              value={formData.costPrice}
              onChange={handleChange}
              className={inputClasses}
            />

            <input
              type="number"
              name="sellingPrice"
              placeholder="Selling Price"
              value={formData.sellingPrice}
              onChange={handleChange}
              className={inputClasses}
            />

            <input
              type="date"
              name="expiryDate"
              value={formData.expiryDate}
              onChange={handleChange}
              className={inputClasses}
            />

            <input
              type="text"
              name="supplier"
              placeholder="Supplier Name"
              value={formData.supplier}
              onChange={handleChange}
              className={`${inputClasses} md:col-span-2`}
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
              {submitting
                ? isEditMode
                  ? "Updating..."
                  : "Saving..."
                : isEditMode
                  ? "Update Item"
                  : "Save Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddItemModal;
