import React, { useEffect, useState } from "react";

const SalesModal = ({ isOpen, onClose, theme, recipes, onSaleRecorded }) => {
  const [recipeId, setRecipeId] = useState("");
  const [quantitySold, setQuantitySold] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isDark = theme === "dark";

  const officeId = sessionStorage.getItem("selected_office") || "";
  const vendorId = sessionStorage.getItem("selected_vendor") || "";

  const salesUrl = `/api/sales?officeId=${encodeURIComponent(
    officeId,
  )}&vendorId=${encodeURIComponent(vendorId)}`;

  useEffect(() => {
    if (isOpen) {
      setRecipeId("");
      setQuantitySold("");
      setError("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const inputClasses = `w-full px-4 py-3 rounded-2xl border outline-none ${
    isDark
      ? "bg-[#111111] border-[#1f1f1f] text-white"
      : "bg-[#f9faf7] border-[#e8e8e0] text-black"
  }`;

  const selectedRecipe = recipes.find(
    (recipe) => String(recipe.id) === String(recipeId),
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const token = localStorage.getItem("bizlift_token");
      const response = await fetch(salesUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipeId,
          quantitySold,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409 && data?.code === "INSUFFICIENT_INVENTORY") {
          const shortageLines = (data.shortages || []).map((item) => {
            const required = item.requiredQty ?? 0;
            const available = item.availableQty ?? 0;
            const unit = item.unit || "";

            return `${item.ingredientName}: required ${required}${
              unit ? ` ${unit}` : ""
            }, available ${available}${unit ? ` ${unit}` : ""}`;
          });

          throw new Error(
            [
              `Cannot record sale for ${data.recipeName || "selected recipe"}.`,
              ...shortageLines,
            ].join("\n"),
          );
        }

        throw new Error(data?.message || "Failed to record sale.");
      }

      onClose();
      if (onSaleRecorded) onSaleRecorded();
    } catch (err) {
      setError(err.message || "Something went wrong while recording sale.");
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
          onClick={onClose}
          className={`absolute top-4 right-4 text-xl ${
            isDark
              ? "text-gray-400 hover:text-white"
              : "text-gray-500 hover:text-black"
          }`}
        >
          ×
        </button>

        <h2 className="text-2xl font-bold mb-2">Record Sale</h2>
        <p
          className={`text-sm mb-6 ${isDark ? "text-gray-400" : "text-gray-500"}`}
        >
          Record a menu sale and auto-deduct recipe ingredients from inventory.
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
              value={recipeId}
              onChange={(e) => setRecipeId(e.target.value)}
              className={inputClasses}
            >
              <option value="">Select Menu Item Recipe</option>
              {recipes.map((recipe) => (
                <option key={recipe.id} value={recipe.id}>
                  {recipe.menuItemName}
                </option>
              ))}
            </select>

            <input
              type="number"
              placeholder="Quantity Sold"
              value={quantitySold}
              onChange={(e) => setQuantitySold(e.target.value)}
              className={inputClasses}
            />

            {selectedRecipe && (
              <div
                className={`rounded-2xl p-4 border ${
                  isDark
                    ? "border-[#1f1f1f] bg-[#111111]"
                    : "border-[#e8e8e0] bg-[#f9faf7]"
                }`}
              >
                <p className="font-semibold mb-2">
                  Recipe Preview: {selectedRecipe.menuItemName}
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedRecipe.ingredients.map((ingredient, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200"
                    >
                      {ingredient.itemName} • {ingredient.quantity}{" "}
                      {ingredient.unit}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
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
              {submitting ? "Recording..." : "Record Sale"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SalesModal;
