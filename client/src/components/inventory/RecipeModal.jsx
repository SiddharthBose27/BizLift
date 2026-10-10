import React, { useEffect, useState } from "react";

const emptyIngredient = {
  inventoryItemId: "",
  itemName: "",
  quantity: "",
  unit: "",
};

const RecipeModal = ({
  isOpen,
  onClose,
  theme,
  inventoryItems,
  onRecipeSaved,
  editRecipe = null,
}) => {
  const [menuItemName, setMenuItemName] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [ingredients, setIngredients] = useState([emptyIngredient]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isEditMode = Boolean(editRecipe);
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
    if (editRecipe) {
      setMenuItemName(editRecipe.menuItemName || "");
      setSellingPrice(editRecipe.sellingPrice || "");
      setIngredients(
        editRecipe.ingredients?.length
          ? editRecipe.ingredients.map((ingredient) => ({
              inventoryItemId: ingredient.inventoryItemId,
              itemName: ingredient.itemName,
              quantity: ingredient.quantity,
              unit: ingredient.unit,
            }))
          : [emptyIngredient],
      );
    } else {
      setMenuItemName("");
      setSellingPrice("");
      setIngredients([emptyIngredient]);
    }
    setError("");
  }, [editRecipe, isOpen]);

  if (!isOpen) return null;

  const inputClasses = `w-full px-4 py-3 rounded-2xl border outline-none ${
    isDark
      ? "bg-[#111111] border-[#1f1f1f] text-white"
      : "bg-[#f9faf7] border-[#e8e8e0] text-black"
  }`;

  const handleIngredientChange = (index, field, value) => {
    const updatedIngredients = [...ingredients];

    if (field === "inventoryItemId") {
      const selectedItem = inventoryItems.find(
        (item) => String(item.id) === String(value),
      );

      updatedIngredients[index] = {
        ...updatedIngredients[index],
        inventoryItemId: value,
        itemName: selectedItem ? selectedItem.itemName : "",
        unit: selectedItem ? selectedItem.unit : "",
      };
    } else {
      updatedIngredients[index] = {
        ...updatedIngredients[index],
        [field]: value,
      };
    }

    setIngredients(updatedIngredients);
  };

  const addIngredientRow = () => {
    setIngredients((prev) => [...prev, emptyIngredient]);
  };

  const removeIngredientRow = (index) => {
    if (ingredients.length === 1) return;
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const payload = {
        menuItemName,
        sellingPrice,
        ingredients,
      };

      const url = isEditMode
        ? `/api/recipes/${editRecipe.id}`
        : "/api/recipes";

      const token = localStorage.getItem("bizlift_token");
      const method = isEditMode ? "PUT" : "POST";

      const response = await fetch(withWorkspace(url), {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.errors && result.errors.length > 0) {
          throw new Error(result.errors.join(" | "));
        }
        throw new Error(result.message || "Failed to save recipe.");
      }

      onClose();
      if (onRecipeSaved) onRecipeSaved();
    } catch (err) {
      setError(err.message || "Something went wrong while saving recipe.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div
        className={`w-full max-w-3xl rounded-[28px] shadow-xl p-6 relative border max-h-[90vh] overflow-y-auto ${
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

        <h2 className="text-2xl font-bold mb-2">
          {isEditMode ? "Edit Recipe" : "Create Recipe"}
        </h2>
        <p
          className={`text-sm mb-6 ${isDark ? "text-gray-400" : "text-gray-500"}`}
        >
          Define ingredient consumption for each menu item.
        </p>

        {error && (
          <div
            className={`mb-4 rounded-2xl px-4 py-3 text-sm ${
              isDark
                ? "bg-red-950 text-red-300 border border-red-900"
                : "bg-red-50 text-red-600 border border-red-200"
            }`}
          >
            {error.includes(" | ") ? (
              <ul className="list-disc list-inside space-y-1">
                {error.split(" | ").map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            ) : (
              error
            )}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <input
              type="text"
              placeholder="Menu Item Name"
              value={menuItemName}
              onChange={(e) => setMenuItemName(e.target.value)}
              className={inputClasses}
            />
            <input
              type="number"
              placeholder="Selling Price"
              value={sellingPrice}
              onChange={(e) => setSellingPrice(e.target.value)}
              className={inputClasses}
            />
          </div>

          <div className="space-y-4">
            {ingredients.map((ingredient, index) => (
              <div
                key={index}
                className={`grid grid-cols-1 md:grid-cols-4 gap-3 p-4 rounded-2xl border ${
                  isDark ? "border-[#1f1f1f]" : "border-[#e8e8e0]"
                }`}
              >
                <select
                  value={ingredient.inventoryItemId}
                  onChange={(e) =>
                    handleIngredientChange(
                      index,
                      "inventoryItemId",
                      e.target.value,
                    )
                  }
                  className={inputClasses}
                >
                  <option value="">Select Inventory Item</option>
                  {inventoryItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.itemName}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  placeholder="Quantity"
                  value={ingredient.quantity}
                  onChange={(e) =>
                    handleIngredientChange(index, "quantity", e.target.value)
                  }
                  className={inputClasses}
                />

                <input
                  type="text"
                  placeholder="Unit"
                  value={ingredient.unit}
                  readOnly
                  className={inputClasses}
                />

                <button
                  type="button"
                  onClick={() => removeIngredientRow(index)}
                  className="px-4 py-3 rounded-2xl font-semibold bg-red-500 text-white hover:opacity-90"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addIngredientRow}
            className="mt-4 px-5 py-2.5 rounded-2xl font-semibold text-black hover:opacity-90"
            style={{ backgroundColor: "#9ad17b" }}
          >
            + Add Ingredient
          </button>

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
              {submitting
                ? isEditMode
                  ? "Updating..."
                  : "Saving..."
                : isEditMode
                  ? "Update Recipe"
                  : "Save Recipe"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecipeModal;
