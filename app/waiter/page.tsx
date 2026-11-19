"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ref, onValue, update } from "firebase/database";
import { db } from "../../lib/firebase";

interface WaiterItem {
  id: string;
  name: string;
  phone?: string;
  assigned: string[];
}

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

export default function WaiterPage() {
  const [waiters, setWaiters] = useState<WaiterItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedWaiterId, setSelectedWaiterId] = useState<string>("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showDelivered, setShowDelivered] = useState(false);

  const prevReadyCount = useRef<number | null>(null);

  const playReadyAlert = () => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new AudioCtx();
      // ሁለት ተከታታይ የማንቂያ ድምፅ (Ding-Ding)
      [0, 0.22].forEach((delay, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(idx === 0 ? 784 : 1046, ctx.currentTime + delay);
        gain.gain.setValueAtTime(0.3, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.35);
      });
    } catch {
      // Browser autoplay restriction before user interaction
    }
  };

  // ከዚህ በፊት የመረጠውን አስተናጋጅ ስም ማስታወስ
  useEffect(() => {
    const saved = localStorage.getItem("selectedWaiterId");
    if (saved) setSelectedWaiterId(saved);
  }, []);

  // Waiters እና Orders በቀጥታ ከFirebase ማንበብ
  useEffect(() => {
    if (!db) return;

    const unsubWaiters = onValue(ref(db, "waiters"), (snapshot) => {
      const data = snapshot.val() as Record<
        string,
        { name: string; phone?: string; assigned?: string[] }
      > | null;
      if (data) {
        setWaiters(
          Object.entries(data).map(([id, val]) => ({
            id,
            name: val.name,
            phone: val.phone || "",
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
        setOrders(list);
      } else {
        setOrders([]);
      }
    });

    return () => {
      unsubWaiters();
      unsubOrders();
    };
  }, []);

  const currentWaiter = waiters.find((w) => w.id === selectedWaiterId) || null;

  const myOrders = currentWaiter
    ? orders.filter((o) => currentWaiter.assigned.includes(o.target_identifier))
    : [];

  const readyOrders = myOrders.filter((o) => o.order_status === "READY");
  const activeKitchenOrders = myOrders.filter(
    (o) => o.order_status === "PENDING" || o.order_status === "PREPARING"
  );
  const deliveredOrders = myOrders.filter((o) => o.order_status === "DELIVERED");

  // ምግብ READY ሲሆን ድምፅ ማሰማት
  useEffect(() => {
    if (!currentWaiter) {
      prevReadyCount.current = null;
      return;
    }
    if (
      prevReadyCount.current !== null &&
      readyOrders.length > prevReadyCount.current &&
      soundEnabled
    ) {
      playReadyAlert();
    }
    prevReadyCount.current = readyOrders.length;
  }, [readyOrders.length, currentWaiter, soundEnabled]);

  const handleSelectWaiter = (id: string) => {
    setSelectedWaiterId(id);
    localStorage.setItem("selectedWaiterId", id);
    playReadyAlert(); // AudioContext እንዲከፈት
  };

  const handleLogoutWaiter = () => {
    setSelectedWaiterId("");
    localStorage.removeItem("selectedWaiterId");
  };

  const markAsDelivered = async (orderId: string) => {
    if (!db) return;
    await update(ref(db, `orders/${orderId}`), {
      order_status: "DELIVERED",
    });
  };

  // የአስተናጋጅ ስም መምረጫ ገጽ
  if (!currentWaiter) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold text-amber-400">🧑‍🍳 የአስተናጋጆች ገጽ</h1>
            <p className="text-slate-400 text-sm">
              ትዕዛዞችዎን ለመከታተል ስምዎን ከታች ይምረጡ
            </p>
          </div>

          {waiters.length === 0 ? (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 text-center space-y-2">
              <p className="text-slate-300 text-sm font-bold">
                እስካሁን የተመዘገበ አስተናጋጅ የለም
              </p>
              <p className="text-slate-500 text-xs">
                ባለቤቱ በ /admin1 ገብቶ አስተናጋጆችን እና ጠረጴዛዎችን መመደብ አለበት።
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {waiters.map((w) => (
                <button
                  key={w.id}
                  onClick={() => handleSelectWaiter(w.id)}
                  className="w-full p-4 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-400 rounded-xl flex items-center justify-between transition cursor-pointer"
                >
                  <div className="text-left">
                    <p className="font-bold text-white">{w.name}</p>
                    <p className="text-xs text-slate-400">
                      {w.assigned.length > 0
                        ? w.assigned.join(" • ")
                        : "ገና የተመደበ ቦታ የለም"}
                    </p>
                  </div>
                  <span className="text-amber-400 font-bold text-sm">ግባ ➜</span>
                </button>
              ))}
            </div>
          )}

          <Link
            href="/"
            className="block text-center text-xs text-slate-400 hover:text-white pt-2"
          >
            ← ወደ ዋናው ገጽ ተመለስ
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-amber-400">
              🧑‍🍳 ሰላም {currentWaiter.name}
            </h1>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {currentWaiter.assigned.length === 0 ? (
                <span className="text-xs text-red-400">
                  ምንም የተመደበ ጠረጴዛ/ክፍል የለዎትም
                </span>
              ) : (
                currentWaiter.assigned.map((loc) => (
                  <span
                    key={loc}
                    className="text-[11px] bg-slate-800 border border-slate-700 text-amber-300 px-2.5 py-0.5 rounded-full font-semibold"
                  >
                    {loc}
                  </span>
                ))
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                if (!soundEnabled) playReadyAlert();
              }}
              className={`px-3 py-2 rounded-lg text-xs font-bold cursor-pointer ${
                soundEnabled
                  ? "bg-emerald-900/70 text-emerald-300 border border-emerald-700"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {soundEnabled ? "🔊 ድምፅ በርቷል" : "🔇 ጠፍቷል"}
            </button>
            <button
              onClick={handleLogoutWaiter}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold cursor-pointer"
            >
              🔄 አስተናጋጅ ቀይር
            </button>
          </div>
        </div>

        {/* Section 1: READY ORDERS (ከኩሽና መውሰድ ያለባቸው) */}
        <section className="space-y-3">
          <h2 className="text-base font-black text-emerald-400 flex items-center gap-2">
            🔔 ለመውሰድ ዝግጁ የሆኑ ምግቦች ({readyOrders.length})
          </h2>

          {readyOrders.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center text-slate-400 text-sm">
              በአሁኑ ሰዓት ከኩሽና የሚወሰድ ዝግጁ ምግብ የለም።
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {readyOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-emerald-950/40 border-2 border-emerald-500 rounded-2xl p-5 space-y-3 shadow-lg shadow-emerald-500/10"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-black text-white">
                      📍 {order.target_identifier}
                    </span>
                    <span className="px-2.5 py-1 bg-emerald-500 text-slate-950 text-xs font-black rounded-full animate-pulse">
                      ዝግጁ ነው (READY)
                    </span>
                  </div>

                  <p className="text-xs text-slate-300">
                    👤 {order.customer_name} • 💰 {order.total_amount} ብር
                  </p>

                  <div className="bg-slate-950/70 rounded-xl p-3 space-y-1">
                    {(order.items || []).map((item, idx) => (
                      <div key={idx} className="flex justify-between text-xs">
                        <span className="text-slate-200 font-semibold">
                          {item.qty}x {item.name}
                        </span>
                        <span className="text-amber-400">
                          {item.price * item.qty} ብር
                        </span>
                      </div>
                    ))}
                  </div>

                  {order.special_instructions && (
                    <p className="text-xs text-amber-300 bg-amber-500/10 px-3 py-2 rounded-lg">
                      📝 {order.special_instructions}
                    </p>
                  )}

                  <button
                    onClick={() => markAsDelivered(order.id)}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm rounded-xl cursor-pointer transition"
                  >
                    ✅ ከኩሽና ወስጄ አደረስኩ (Delivered)
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section 2: IN KITCHEN (በኩሽና እየተዘጋጁ ያሉ) */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-amber-400">
            🍳 ኩሽና ውስጥ በመዘጋጀት ላይ ያሉ ({activeKitchenOrders.length})
          </h2>

          {activeKitchenOrders.length === 0 ? (
            <p className="text-xs text-slate-500 bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
              ኩሽና ውስጥ በሂደት ላይ ያለ ትዕዛዝ የለም።
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {activeKitchenOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">
                      {order.target_identifier}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                        order.order_status === "PREPARING"
                          ? "bg-sky-500/20 text-sky-400"
                          : "bg-amber-500/20 text-amber-400"
                      }`}
                    >
                      {order.order_status === "PREPARING"
                        ? "🔥 እየተሰራ ነው"
                        : "⏳ አዲስ ትዕዛዝ"}
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 space-y-0.5">
                    {(order.items || []).map((item, idx) => (
                      <p key={idx}>
                        • {item.qty}x {item.name}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section 3: DELIVERED HISTORY */}
        <section className="pt-2">
          <button
            onClick={() => setShowDelivered(!showDelivered)}
            className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
          >
            {showDelivered
              ? "የተጠናቀቁ ትዕዛዞችን ደብቅ ▲"
              : `የተጠናቀቁ ትዕዛዞችን እይ (${deliveredOrders.length}) ▼`}
          </button>

          {showDelivered && deliveredOrders.length > 0 && (
            <div className="mt-3 space-y-2">
              {deliveredOrders.slice(0, 15).map((order) => (
                <div
                  key={order.id}
                  className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 flex justify-between items-center text-xs text-slate-400"
                >
                  <span>
                    ✅ {order.target_identifier} — {order.customer_name}
                  </span>
                  <span className="font-bold text-slate-300">
                    {order.total_amount} ብር
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}