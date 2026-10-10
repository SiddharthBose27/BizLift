import { ExperienceLayer, IntelligenceRibbon } from "../components/BizLiftExperience.jsx";
import React, { useEffect, useMemo, useState } from "react";
import InventorySummaryCards from "../components/inventory/InventorySummaryCards";
import InventoryFilters from "../components/inventory/InventoryFilters";
import InventoryTable from "../components/inventory/InventoryTable";
import AddItemModal from "../components/inventory/AddItemModal";
import StockUpdateModal from "../components/inventory/StockUpdateModal";
import TransactionHistory from "../components/inventory/TransactionHistory";
import RecipeTable from "../components/inventory/RecipeTable";
import RecipeModal from "../components/inventory/RecipeModal";
import SalesTable from "../components/inventory/SalesTable";
import SalesModal from "../components/inventory/SalesModal";

const InventoryPage = ({ theme, toggleTheme }) => {
  const [inventoryItems, setInventoryItems] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [sales, setSales] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockItem, setStockItem] = useState(null);

  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);

  const [isSalesModalOpen, setIsSalesModalOpen] = useState(false);

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);

  const isDark = theme === "dark";

  const officeId = sessionStorage.getItem("selected_office") || "";
  const vendorId = sessionStorage.getItem("selected_vendor") || "";

  const withWorkspace = (url) => {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}officeId=${encodeURIComponent(
      officeId,
    )}&vendorId=${encodeURIComponent(vendorId)}`;
  };

  const fetchInventory = async () => {
    const token = localStorage.getItem("bizlift_token");
    const response = await fetch(
      withWorkspace("/api/inventory"),
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Failed to fetch inventory");
    }

    setInventoryItems(result.data || []);
  };

  const fetchTransactions = async () => {
    const token = localStorage.getItem("bizlift_token");
    const response = await fetch(
      withWorkspace("/api/inventory/transactions"),
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Failed to fetch transactions");
    }

    setTransactions(result.data || []);
  };

  const fetchRecipes = async () => {
    const token = localStorage.getItem("bizlift_token");
    const response = await fetch(
      withWorkspace("/api/recipes"),
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Failed to fetch recipes");
    }

    setRecipes(result.data || []);
  };

  const fetchSales = async () => {
    const token = localStorage.getItem("bizlift_token");
    const response = await fetch(
      withWorkspace("/api/sales"),
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Failed to fetch sales");
    }

    setSales(result.data || []);
  };

  const fetchPageData = async () => {
    try {
      setLoading(true);
      setError("");

      await Promise.all([
        fetchInventory(),
        fetchTransactions(),
        fetchRecipes(),
        fetchSales(),
      ]);
    } catch (err) {
      setError(err.message || "Something went wrong while fetching inventory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPageData();
  }, [officeId, vendorId]);

  const handleToggleSelectionMode = () => {
    setSelectionMode((prev) => !prev);
    setSelectedItems([]);
  };

  const handleSelectItem = (itemId) => {
    setSelectedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId],
    );
  };

  const handleDeleteSelected = async () => {
    try {
      const response = await fetch(
        withWorkspace("/api/inventory"),
        {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ids: selectedItems,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Delete failed");
      }

      await fetchPageData();
      setSelectedItems([]);
      setSelectionMode(false);
    } catch (err) {
      console.error(err);
      alert("Failed to delete items");
    }
  };

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleOpenStockModal = (item) => {
    setStockItem(item);
    setIsStockModalOpen(true);
  };

  const handleCloseStockModal = () => {
    setStockItem(null);
    setIsStockModalOpen(false);
  };

  const handleOpenRecipeModal = () => {
    setEditingRecipe(null);
    setIsRecipeModalOpen(true);
  };

  const handleEditRecipe = (recipe) => {
    setEditingRecipe(recipe);
    setIsRecipeModalOpen(true);
  };

  const handleCloseRecipeModal = () => {
    setEditingRecipe(null);
    setIsRecipeModalOpen(false);
  };

  const handleDeleteRecipe = async (recipeId) => {
    try {
      const response = await fetch(
        withWorkspace(`/api/recipes/${recipeId}`),
        {
          method: "DELETE",
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to delete recipe");
      }

      await fetchPageData();
    } catch (err) {
      console.error(err);
      alert("Failed to delete recipe");
    }
  };

  const categories = [...new Set(inventoryItems.map((item) => item.category))];
  const statuses = [...new Set(inventoryItems.map((item) => item.status))];

  const filteredItems = useMemo(() => {
    return inventoryItems.filter((item) => {
      const matchesSearch = item.itemName
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      const matchesCategory =
        selectedCategory === "All" || item.category === selectedCategory;

      const matchesStatus =
        selectedStatus === "All" || item.status === selectedStatus;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [inventoryItems, searchTerm, selectedCategory, selectedStatus]);

  const summary = useMemo(() => {
    return {
      totalItems: inventoryItems.length,
      lowStock: inventoryItems.filter((item) => item.status === "Low Stock")
        .length,
      expiringSoon: inventoryItems.filter(
        (item) => item.status === "Expiring Soon",
      ).length,
      outOfStock: inventoryItems.filter(
        (item) => item.status === "Out of Stock",
      ).length,
    };
  }, [inventoryItems]);

  return (
    <div
      className={`bizlift-advanced-page bizlift-workflow-page min-h-screen px-4 md:px-8 py-8 transition ${
        isDark ? "bg-black text-white" : "bg-[#f6f7f2] text-black"
      }`}
    >
      <div className="max-w-7xl mx-auto">
        <div
          className={`bizlift-feature-card rounded-[28px] px-6 py-5 mb-8 border flex flex-col md:flex-row md:items-center md:justify-between gap-4 ${
            isDark
              ? "bg-[#0b0b0b] border-[#1f1f1f]"
              : "bg-white border-[#e8e8e0] shadow-sm"
          }`}
        >
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">Inventory</h1>
            <p className={isDark ? "text-gray-400 mt-2" : "text-gray-500 mt-2"}>
              Track stock levels, monitor item health, manage recipes, and
              prepare for billing automation.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setIsSalesModalOpen(true)}
              className="px-5 py-2.5 rounded-2xl font-semibold text-black hover:opacity-90"
              style={{ backgroundColor: "#9ad17b" }}
            >
              + Record Sale
            </button>

            <button
              onClick={handleOpenRecipeModal}
              className="px-5 py-2.5 rounded-2xl font-semibold text-black hover:opacity-90"
              style={{ backgroundColor: "#9ad17b" }}
            >
              + Create Recipe
            </button>

            <button
              onClick={toggleTheme}
              className={`px-5 py-2.5 rounded-2xl font-semibold transition ${
                isDark ? "text-black" : "text-white"
              }`}
              style={{ backgroundColor: isDark ? "#9ad17b" : "#111111" }}
            >
              {isDark ? "Light" : "Dark"}
            </button>
          </div>
        </div>

        <InventorySummaryCards summary={summary} theme={theme} />

        <InventoryFilters
          theme={theme}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          selectedStatus={selectedStatus}
          setSelectedStatus={setSelectedStatus}
          categories={categories}
          statuses={statuses}
          onAddItemClick={handleOpenAddModal}
          selectionMode={selectionMode}
          onToggleSelectionMode={handleToggleSelectionMode}
          selectedCount={selectedItems.length}
          onDeleteSelected={handleDeleteSelected}
          onEditSelected={() => {
            if (selectedItems.length !== 1) {
              alert("Select exactly one item to edit");
              return;
            }

            const item = inventoryItems.find((i) => i.id === selectedItems[0]);
            if (item) handleEditItem(item);
          }}
          onUpdateSelectedStock={() => {
            if (selectedItems.length !== 1) {
              alert("Select exactly one item to update stock");
              return;
            }

            const item = inventoryItems.find((i) => i.id === selectedItems[0]);
            if (item) handleOpenStockModal(item);
          }}
        />

        {loading ? (
          <div
            className={`bizlift-interactive-card rounded-[24px] p-8 border text-center ${
              isDark
                ? "bg-[#0b0b0b] border-[#1f1f1f] text-gray-400"
                : "bg-white border-[#e8e8e0] text-gray-500"
            }`}
          >
            Loading inventory...
          </div>
        ) : error ? (
          <div
            className={`bizlift-interactive-card rounded-[24px] p-8 border text-center ${
              isDark
                ? "bg-[#0b0b0b] border-[#1f1f1f] text-red-400"
                : "bg-white border-[#e8e8e0] text-red-500"
            }`}
          >
            {error}
          </div>
        ) : (
          <>
            <InventoryTable
              items={filteredItems}
              theme={theme}
              selectionMode={selectionMode}
              selectedItems={selectedItems}
              onSelectItem={handleSelectItem}
            />

            <RecipeTable
              recipes={recipes}
              theme={theme}
              onEditRecipe={handleEditRecipe}
              onDeleteRecipe={handleDeleteRecipe}
            />

            <SalesTable sales={sales} theme={theme} />

            <TransactionHistory transactions={transactions} theme={theme} />
          </>
        )}

        <AddItemModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          theme={theme}
          onItemAdded={fetchPageData}
          editItem={editingItem}
        />

        <StockUpdateModal
          isOpen={isStockModalOpen}
          onClose={handleCloseStockModal}
          theme={theme}
          stockItem={stockItem}
          onStockUpdated={fetchPageData}
        />

        <RecipeModal
          isOpen={isRecipeModalOpen}
          onClose={handleCloseRecipeModal}
          theme={theme}
          inventoryItems={inventoryItems}
          onRecipeSaved={fetchPageData}
          editRecipe={editingRecipe}
        />

        <SalesModal
          isOpen={isSalesModalOpen}
          onClose={() => setIsSalesModalOpen(false)}
          theme={theme}
          recipes={recipes}
          onSaleRecorded={fetchPageData}
        />
      </div>
    </div>
  );
};

export default InventoryPage;
