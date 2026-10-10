import { useEffect, useMemo, useRef, useState } from "react";
import { ExperienceLayer, IntelligenceRibbon } from "../components/BizLiftExperience.jsx";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api.js";

const API = "/api";
const money = (n) => `₹${Number(n || 0).toFixed(2)}`;

export default function POSPage({ theme, toggleTheme }) {
  const dark = theme === "dark";
  const [recipes, setRecipes] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [sales, setSales] = useState([]);
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState("Walk-in Customer");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [taxRate, setTaxRate] = useState(0);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const pendingCheckoutKey = useRef(null);

  const load = async () => {
    const [r, i, s] = await Promise.all([
      apiFetch(`${API}/recipes`),
      apiFetch(`${API}/inventory`),
      apiFetch(`${API}/sales`),
    ]);
    const data = await r.json();
    const inv = await i.json();
    const sale = await s.json();
    if (!r.ok) throw new Error(data.message || "Could not load menu");
    setRecipes(data.data || []);
    setInventory(inv.data || []);
    setSales(sale.data || []);
  };

  useEffect(() => {
    load().catch((e) => setMessage(e.message));
  }, []);

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0),
    [cart]
  );
  const tax = (subtotal * Number(taxRate || 0)) / 100;
  const total = subtotal + tax;

  const canMake = (recipe, qty = 1) =>
    (recipe.ingredients || []).every((ingredient) => {
      const item = inventory.find(
        (i) => String(i.id) === String(ingredient.inventoryItemId)
      );
      return (
        item &&
        Number(item.currentStock || 0) >=
          Number(ingredient.quantity || 0) * qty
      );
    });

  const add = (recipe) => {
    if (!canMake(recipe, 1)) {
      setMessage(
        `${recipe.menuItemName || recipe.name} is 86 — insufficient ingredient stock.`
      );
      return;
    }

    setCart((previous) => {
      const found = previous.find(
        (item) => String(item.recipeId) === String(recipe.id)
      );
      if (found) {
        return previous.map((item) =>
          String(item.recipeId) === String(recipe.id)
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...previous,
        {
          recipeId: recipe.id,
          name: recipe.menuItemName || recipe.name,
          price: Number(recipe.sellingPrice || 0),
          quantity: 1,
        },
      ];
    });
  };

  const change = (id, delta) => {
    setCart((previous) => {
      const current = previous.find((item) => String(item.recipeId) === String(id));
      if (!current) return previous;
      const nextQuantity = current.quantity + delta;
      if (nextQuantity <= 0) {
        return previous.filter((item) => String(item.recipeId) !== String(id));
      }
      const recipe = recipes.find((item) => String(item.id) === String(id));
      if (delta > 0 && recipe && !canMake(recipe, nextQuantity)) {
        setMessage(`Only ${current.quantity} unit(s) of ${current.name} can be fulfilled with current stock.`);
        return previous;
      }
      return previous.map((item) =>
        String(item.recipeId) === String(id)
          ? { ...item, quantity: nextQuantity }
          : item
      );
    });
  };

  const checkout = async () => {
    if (!cart.length) {
      setMessage("Add at least one menu item.");
      return;
    }

    setBusy(true);
    setMessage("");
    if (!pendingCheckoutKey.current) {
      pendingCheckoutKey.current = globalThis.crypto?.randomUUID?.() || `checkout_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    }
    try {
      const response = await apiFetch(`${API}/sales/orders`, {
        method: "POST",
        headers: { "Idempotency-Key": pendingCheckoutKey.current },
        body: JSON.stringify({
          items: cart.map((item) => ({
            recipeId: item.recipeId,
            quantity: item.quantity,
          })),
          customerName,
          paymentMethod,
          taxRate,
          channel: "counter",
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.message ||
            data.shortages?.map((x) => x.ingredientName).join(", ") ||
            "Checkout failed"
        );
      }
      setMessage(
        `Bill ${data.receiptNumber} created — ${money(
          data.grandTotal
        )}. Inventory updated automatically.`
      );
      setCart([]);
      pendingCheckoutKey.current = null;
      await load();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  const cancelOrder = async (orderId, receiptNumber) => {
    if (!confirm("Cancel this order and restore its deducted stock?")) return;
    try {
      const response = await apiFetch(`${API}/sales/orders/${orderId}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason: "POS cancellation" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Cancellation failed");
      setMessage(`Order ${receiptNumber || orderId} cancelled and stock restored.`);
      await load();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const orders = [
    ...new Map(
      sales
        .filter((sale) => sale.orderId)
        .map((sale) => [sale.orderId, sale])
    ).values(),
  ].slice(0, 12);

  return (
    <div
      className={
        dark ? "bizlift-advanced-page bizlift-workflow-page min-h-screen bg-black text-white" : "bizlift-advanced-page bizlift-workflow-page min-h-screen bg-[#f6f7f2] text-black"
      }
    >
      <div
        className={`border-b px-6 py-4 ${
          dark ? "border-white/10 bg-[#080808]" : "border-[#e8e8e0] bg-white"
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div>
            <Link to="/dashboard" className="font-semibold">
              ← Dashboard
            </Link>
            <h1 className="text-2xl font-bold mt-2">POS & Billing</h1>
          </div>
          <button
            onClick={toggleTheme}
            className="rounded-2xl px-4 py-2 font-semibold"
            style={{ backgroundColor: "#9ad17b", color: "#000" }}
          >
            {dark ? "Light" : "Dark"}
          </button>
        </div>
      </div>

      <main className="relative max-w-7xl mx-auto p-6 grid lg:grid-cols-[1fr_380px] gap-6 overflow-hidden">
        <ExperienceLayer variant="pos" />
        <div className="pointer-events-none absolute left-0 right-0 top-0 flex justify-center"><IntelligenceRibbon label="POS LIVE" value="Inventory-aware checkout enabled" /></div>
        <section
          className="bizlift-feature-card rounded-[28px] border p-6"
          style={{
            background: dark ? "#0b0b0b" : "#fff",
            borderColor: dark ? "#1f1f1f" : "#e8e8e0",
          }}
        >
          <div className="flex justify-between items-center mb-5">
            <div>
              <h2 className="text-xl font-bold">Menu</h2>
              <p className="text-sm opacity-60">
                Select a dish; recipe ingredients are checked before checkout.
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {recipes.map((recipe) => (
              <button
                key={recipe.id}
                onClick={() => add(recipe)}
                className="bizlift-interactive-card text-left rounded-2xl border p-4 hover:-translate-y-0.5 transition"
                style={{ borderColor: dark ? "#242424" : "#e8e8e0" }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold">
                    {recipe.menuItemName || recipe.name}
                  </div>
                  {canMake(recipe) ? (
                    <span className="text-[10px] rounded-full px-2 py-1 bg-[#9ad17b]/20 text-[#6b8f56]">
                      Available
                    </span>
                  ) : (
                    <span className="text-[10px] rounded-full px-2 py-1 bg-red-500/15 text-red-400">
                      86
                    </span>
                  )}
                </div>
                <div className="mt-2 text-[#6b8f56] font-bold">
                  {money(recipe.sellingPrice)}
                </div>
                <div className="mt-2 text-xs opacity-50">
                  {(recipe.ingredients || []).length} ingredients
                </div>
              </button>
            ))}
          </div>
        </section>

        <aside
          className="bizlift-feature-card rounded-[28px] border p-6 h-fit sticky top-4"
          style={{
            background: dark ? "#0b0b0b" : "#fff",
            borderColor: dark ? "#1f1f1f" : "#e8e8e0",
          }}
        >
          <h2 className="text-xl font-bold">Current Bill</h2>
          <div className="mt-4 space-y-3">
            {cart.length ? (
              cart.map((item) => (
                <div key={item.recipeId} className="flex justify-between gap-3">
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs opacity-50">
                      {money(item.price)} each
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => change(item.recipeId, -1)}
                      className="w-7 h-7 rounded-full border"
                    >
                      −
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      onClick={() => change(item.recipeId, 1)}
                      className="w-7 h-7 rounded-full border"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm opacity-50">No items added.</p>
            )}
          </div>

          <div className="mt-6 space-y-3">
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Customer name"
              className="w-full rounded-2xl border px-4 py-3 bg-transparent"
            />
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full rounded-2xl border px-4 py-3 bg-transparent"
            >
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
              <option value="other">Other</option>
            </select>
            <input
              type="number"
              min="0"
              step="0.01"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              placeholder="Tax %"
              className="w-full rounded-2xl border px-4 py-3 bg-transparent"
            />
          </div>

          <div className="mt-6 border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>{money(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Tax</span>
              <span>{money(tax)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold">
              <span>Total</span>
              <span>{money(total)}</span>
            </div>
          </div>

          {message && <div className="mt-4 rounded-2xl border p-3 text-sm">{message}</div>}

          <button
            disabled={busy || !cart.length}
            onClick={checkout}
            className="w-full mt-5 rounded-2xl px-5 py-3 font-semibold text-black disabled:opacity-50"
            style={{ backgroundColor: "#9ad17b" }}
          >
            {busy ? "Generating bill..." : "Generate Bill & Deduct Stock"}
          </button>
        </aside>

        <section
          className="lg:col-span-2 rounded-[28px] border p-6"
          style={{
            background: dark ? "#0b0b0b" : "#fff",
            borderColor: dark ? "#1f1f1f" : "#e8e8e0",
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Order History</h2>
              <p className="text-sm opacity-60">
                Completed and cancelled bills with stock-safe cancellation.
              </p>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-3 py-3 text-left">Receipt</th>
                  <th className="px-3 py-3 text-left">Customer</th>
                  <th className="px-3 py-3 text-left">Total</th>
                  <th className="px-3 py-3 text-left">Status</th>
                  <th className="px-3 py-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const cancelled =
                    String(order.status || "completed").toLowerCase() === "cancelled";
                  return (
                    <tr
                      key={order.orderId}
                      className="border-b border-white/10"
                    >
                      <td className="px-3 py-3">
                        {order.receiptNumber || order.orderId}
                      </td>
                      <td className="px-3 py-3">{order.customerName}</td>
                      <td className="px-3 py-3 font-semibold">
                        {money(order.grandTotal || order.totalAmount)}
                      </td>
                      <td className="px-3 py-3 capitalize">
                        {order.status || "completed"}
                      </td>
                      <td className="px-3 py-3">
                        {!cancelled && (
                          <button
                            onClick={() =>
                              cancelOrder(order.orderId, order.receiptNumber)
                            }
                            className="rounded-lg border px-3 py-2 text-xs"
                          >
                            Cancel & Restore Stock
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!orders.length && (
                  <tr>
                    <td colSpan="5" className="px-3 py-6 text-center opacity-50">
                      No orders yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
