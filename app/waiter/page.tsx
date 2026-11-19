"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ref, onValue, update, remove } from "firebase/database";
import { db } from "../../lib/firebase";

interface OrderItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

interface Order {
  id: string;
  order_type: string;
  target_identifier: string;
  customer_name: string;
  phone: string;
  special_instructions?: string;
  items: OrderItem[];
  total_amount: number;
  order_status: "PENDING" | "PREPARING" | "READY" | "DELIVERED";
  created_at: string;
}

interface WaiterItem {
  id: string;
  name: string;
  assigned: string[];
}

export default function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [waiters, setWaiters] = useState<WaiterItem[]>([]);
  const [filter, setFilter] = useState<"ACTIVE" | "PENDING" | "PREPARING" | "READY" | "DELIVERED">("ACTIVE");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const prevPendingCount = useRef<number | null>(null);

  const playNewOrderSound = () => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch {
      // Autoplay restriction
    }
  };

  useEffect(() => {
    if (!db) return;

    const unsubWaiters = onValue(ref(db, "waiters"), (snapshot) => {
      const data = snapshot.val() as Record<
        string,
        { name: string; assigned?: string[] }
      > | null;
      if (data) {
        setWaiters(
          Object.entries(data).map(([id, val]) => ({
            id,
            name: val.name,
            assigned: Array.isArray(val.assigned) ? val.assigned : [],
          }))
        );
      } else {
        setWaiters([]);
      }
    });

    const unsubOrders = onValue(ref(db, "orders"), (snapshot) => {
      const data = snapshot.val() as Record<string, Omit<Order, "id">> | null;
      if (data) {
        const list = Object.entries(data)
          .map(([id, val]) => ({ id, ...val }))
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );

        const pendingCount = list.filter((o) => o.order_status === "PENDING").length;
        if (
          prevPendingCount.current !== null &&
          pendingCount > prevPendingCount.current &&
          soundEnabled
        ) {
          playNewOrderSound();
        }
        prevPendingCount.current = pendingCount;
        setOrders(list);
      } else {
        prevPendingCount.current = 0;
        setOrders([]);
      }
    });

    return () => {
      unsubWaiters();
      unsubOrders();
    };
  }, [soundEnabled]);

  const getAssignedWaiter = (targetIdentifier: string) => {
    const waiter = waiters.find((w) => w.assigned.includes(targetIdentifier));
    return waiter ? waiter.name : null;
  };

  const updateOrderStatus = async (
    orderId: string,
    status: Order["order_status"]
  ) => {
    if (!db) return;
    await update(ref(db, `orders/${orderId}`), { order_status: status });
  };

  const deleteOrder = async (orderId: string) => {
    if (!db) return;
    await remove(ref(db, `orders/${orderId}`));
  };

  const filteredOrders = orders.filter((o) => {
    if (filter === "ACTIVE") return o.order_status !== "DELIVERED";
    return o.order_status === filter;
  });

  const pendingCount = orders.filter((o) => o.order_status === "PENDING").length;
  const preparingCount = orders.filter((o) => o.order_status === "PREPARING").length;
  const readyCount = orders.filter((o) => o.order_status === "READY").length;

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-amber-400">
              👨‍🍳 የኩሽና መቆጣጠሪያ (Kitchen KDS)
            </h1>
            <p className="text-slate-400 text-sm">
              አዲስ ትዕዛዞችን ይቀበሉ፣ ያዘጋጁ እና ለተመደበው አስተናጋጅ ያሳውቁ
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                if (!soundEnabled) playNewOrderSound();
              }}
              className={`px-3 py-2 rounded-lg text-xs font-bold cursor-pointer ${
                soundEnabled
                  ? "bg-emerald-900/70 text-emerald-300 border border-emerald-700"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {soundEnabled ? "🔊 ድምፅ በርቷል" : "🔇 ድምፅ ጠፍቷል"}
            </button>
            <Link
              href="/"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold"
            >
              🏠 ዋና ገጽ
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { key: "ACTIVE", label: `በስራ ላይ (${pendingCount + preparingCount + readyCount})` },
            { key: "PENDING", label: `⏳ አዲስ (${pendingCount})` },
            { key: "PREPARING", label: `🔥 እየተሰራ (${preparingCount})` },
            { key: "READY", label: `🔔 ዝግጁ (${readyCount})` },
            { key: "DELIVERED", label: `✅ የተጠናቀቀ` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as typeof filter)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition ${
                filter === tab.key
                  ? "bg-amber-500 text-slate-950"
                  : "bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Orders Grid */}
        {filteredOrders.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center text-slate-400">
            <p className="text-3xl mb-2">🍳</p>
            <p className="font-bold">በዚህ ክፍል ውስጥ ምንም ትዕዛዝ የለም</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrders.map((order) => {
              const waiterName = getAssignedWaiter(order.target_identifier);
              return (
                <div
                  key={order.id}
                  className={`rounded-2xl border p-5 flex flex-col justify-between space-y-4 ${
                    order.order_status === "PENDING"
                      ? "bg-slate-900 border-amber-500/70 shadow-lg shadow-amber-500/10"
                      : order.order_status === "PREPARING"
                      ? "bg-slate-900 border-sky-500/70"
                      : order.order_status === "READY"
                      ? "bg-emerald-950/30 border-emerald-500/70"
                      : "bg-slate-900/50 border-slate-800 opacity-75"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h2 className="text-lg font-black text-white">
                          {order.target_identifier}
                        </h2>
                        <p className="text-xs text-slate-400">
                          👤 {order.customer_name} • 📞 {order.phone}
                        </p>
                      </div>
                      <span
                        className={`text-[10px] font-black px-2.5 py-1 rounded-full shrink-0 ${
                          order.order_status === "PENDING"
                            ? "bg-amber-500/20 text-amber-400"
                            : order.order_status === "PREPARING"
                            ? "bg-sky-500/20 text-sky-400"
                            : order.order_status === "READY"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {order.order_status}
                      </span>
                    </div>

                    {/* የተመደበ አስተናጋጅ ማሳያ */}
                    <div className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 flex items-center justify-between text-xs">
                      <span className="text-slate-400">🧑‍🍳 አስተናጋጅ:</span>
                      <span
                        className={`font-bold ${
                          waiterName ? "text-amber-400" : "text-slate-500"
                        }`}
                      >
                        {waiterName || "ያልተመደበ"}
                      </span>
                    </div>

                    {/* Items */}
                    <div className="bg-slate-950/60 rounded-xl p-3 space-y-1.5">
                      {(order.items || []).map((item, idx) => (
                        <div key={idx} className="flex justify-between text-xs">
                          <span className="font-bold text-slate-100">
                            {item.qty}x {item.name}
                          </span>
                          <span className="text-slate-400">
                            {item.price * item.qty} ብር
                          </span>
                        </div>
                      ))}
                      <div className="border-t border-slate-800 pt-1.5 mt-1.5 flex justify-between text-xs font-black">
                        <span className="text-slate-300">ጠቅላላ</span>
                        <span className="text-amber-400">
                          {order.total_amount} ብር
                        </span>
                      </div>
                    </div>

                    {order.special_instructions && (
                      <p className="text-xs text-amber-200 bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5">
                        📝 {order.special_instructions}
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-1">
                    {order.order_status === "PENDING" && (
                      <button
                        onClick={() => updateOrderStatus(order.id, "PREPARING")}
                        className="flex-1 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs rounded-xl cursor-pointer transition"
                      >
                        🔥 ማብሰል ጀምር
                      </button>
                    )}

                    {order.order_status === "PREPARING" && (
                      <button
                        onClick={() => updateOrderStatus(order.id, "READY")}
                        className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl cursor-pointer transition"
                      >
                        🔔 ዝግጁ ነው (አስተናጋጅ ጥራ)
                      </button>
                    )}

                    {order.order_status === "READY" && (
                      <button
                        onClick={() => updateOrderStatus(order.id, "DELIVERED")}
                        className="flex-1 py-2.5 bg-slate-800 hover:bg-emerald-600 text-emerald-300 hover:text-white font-bold text-xs rounded-xl cursor-pointer transition"
                      >
                        ✅ ተወስዷል (Delivered)
                      </button>
                    )}

                    {order.order_status === "DELIVERED" && (
                      <button
                        onClick={() => deleteOrder(order.id)}
                        className="flex-1 py-2 bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white font-bold text-xs rounded-xl cursor-pointer transition"
                      >
                        🗑️ ከዝርዝር አጥፋ
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}