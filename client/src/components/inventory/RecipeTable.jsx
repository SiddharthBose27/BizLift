import React from "react";

const RecipeTable = ({ recipes, theme, onEditRecipe, onDeleteRecipe }) => {
  const isDark = theme === "dark";

  return (
    <div
      className={`rounded-[24px] border overflow-hidden mt-8 ${
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
        <h2 className="text-2xl font-bold">Menu Recipe Mapping</h2>
        <p className={isDark ? "text-gray-400 mt-1" : "text-gray-500 mt-1"}>
          Map menu items to inventory ingredients for automatic stock deduction.
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
              <th className="px-5 py-4 font-semibold">Selling Price</th>
              <th className="px-5 py-4 font-semibold">Ingredients</th>
              <th className="px-5 py-4 font-semibold">Actions</th>
            </tr>
          </thead>

          <tbody>
            {recipes.length > 0 ? (
              recipes.map((recipe) => (
                <tr
                  key={recipe.id}
                  className={`border-b ${
                    isDark
                      ? "border-[#1f1f1f] hover:bg-[#111111]"
                      : "border-[#e8e8e0] hover:bg-[#f9faf7]"
                  }`}
                >
                  <td className="px-5 py-4 font-medium">
                    {recipe.menuItemName}
                  </td>
                  <td className="px-5 py-4">₹{recipe.sellingPrice}</td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      {recipe.ingredients.map((ingredient, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200"
                        >
                          {ingredient.itemName} • {ingredient.quantity}{" "}
                          {ingredient.unit}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-3">
                      <button
                        onClick={() => onEditRecipe(recipe)}
                        className="text-sm font-semibold hover:opacity-80"
                        style={{ color: "#9ad17b" }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDeleteRecipe(recipe.id)}
                        className="text-sm font-semibold hover:opacity-80 text-red-400"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="px-5 py-8 text-center text-gray-500">
                  No recipes created yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecipeTable;
