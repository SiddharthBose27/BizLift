const recipeData = [
  {
    id: 1,
    menuItemName: "Cold Coffee",
    sellingPrice: 120,
    ingredients: [
      {
        inventoryItemId: 1,
        itemName: "Milk",
        quantity: 0.2,
        unit: "litres",
      },
      {
        inventoryItemId: 5,
        itemName: "Cold Coffee Mix",
        quantity: 0.05,
        unit: "packs",
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export default recipeData;
