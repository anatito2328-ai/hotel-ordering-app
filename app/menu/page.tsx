"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ref, push, set, onValue } from "firebase/database";
import { db } from "../../lib/firebase";

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
  image?: string;
  available?: boolean;
}

function MenuContent() {
  const searchParams = useSearchParams();
  const [source, setSource] = useState("ROOM");
  const [sourceId, setSourceId] = useState("");
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("ሁሉም");

  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [isOrdering, setIsOrdering] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const s = searchParams.get("source");
    const id = searchParams.get("id");
    if (s) setSource(s.toUpperCase());
    if (id) setSourceId(id);
  }, [searchParams]);

  // ሜኑውን በቀጥታ ከFirebase (admin1 ላይ ከተመዘገበው) ማንበብ
  useEffect(() => {
    if (!db) {
      setLoadingMenu(false);
      return;
    }

    const menuRef = ref(db, "menuItems");
    const unsubscribe = onValue(
      menuRef,
      (snapshot) => {
        const data = snapshot.val() as Record<string, Omit<MenuItem, "id">> | null;
        if (data) {
          const list: MenuItem[] = Object.entries(data).map(([id, val]) => ({
            id,
            ...val,
          }));
          setMenuItems(list);
        } else {
          setMenuItems([]);
        }
        setLoadingMenu(false);
      },
      (error) => {
        console.error("Menu load error:", error);
        setLoadingMenu(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const categories = [
    "ሁሉም",
    ...Array.from(new Set(menuItems.map((item) => item.category).filter(Boolean))),
  ];

  const filteredMenu =
    selectedCategory === "ሁሉም"
      ? menuItems
      : menuItems.filter((item) => item.category === selectedCategory);

  const addToCart = (id: string) => {
    setCart((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => {
      const updated = { ...prev };
      if (updated[id] > 1) updated[id] -= 1;
      else delete updated[id];
      return updated;
    });
  };

  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);
  const totalPrice = Object.keys(cart).reduce((sum, id) => {
    const item = menuItems.find((m) => m.id === id);
    return sum + (item ? Number(item.price) * cart[id] : 0);
  }, 0);

  const handleOrder = async () => {
    if (!customerName.trim() || !phone.trim()) {
      alert("እባክዎ ስም እና ስልክ ቁጥር ያስገቡ!");
      return;
    }
    if (!db) {
      alert("ከዳታቤዝ ጋር መገናኘት አልተቻለም፤ ገጹን አድሰው ይሞክሩ!");
      return;
    }

    setIsOrdering(true);

    try {
      const ordersRef = ref(db, "orders");
      const newOrderRef = push(ordersRef);

      const orderedItems = Object.keys(cart).map((id) => {
        const item = menuItems.find((m) => m.id === id);
        return {
          id,
          name: item?.name || "ምግብ",
          price: Number(item?.price || 0),
          qty: cart[id],
        };
      });

      const targetIdentifier =
        source === "ROOM"
          ? `ክፍል ${sourceId || "ያልተጠቀሰ"}`
          : `ጠረጴዛ ${sourceId || "ያልተጠቀሰ"}`;

      await set(newOrderRef, {
        order_type: source,
        target_identifier: targetIdentifier,
        customer_name: customerName.trim(),
        phone: phone.trim(),
        special_instructions: note.trim(),
        items: orderedItems,
        total_amount: totalPrice,
        order_status: "PENDING",
        created_at: new Date().toISOString(),
      });

      setSuccess(true);
      setCart({});
      setNote("");
      setShowModal(false);
    } catch (e) {
      alert("ትዕዛዙ አልተላከም፤ እባክዎ እንደገና ይሞክሩ!");
      console.error(e);
    } finally {
      setIsOrdering(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-28">
      {/* ራስጌ */}
      <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-50 flex justify-between items-center">
        <div>
          <h1 className="text-lg font-black text-amber-500">ግራንድ ሆቴል</h1>
          <p className="text-[11px] text-slate-400">
            {source === "ROOM"
              ? `የክፍል አገልግሎት (${sourceId ? `ክፍል ${sourceId}` : "ክፍል"})`
              : `የጠረጴዛ አገልግሎት (${sourceId ? `ጠረጴዛ ${sourceId}` : "ጠረጴዛ"})`}
          </p>
        </div>
        <span className="text-xs bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full border border-amber-500/30 font-bold">
          {sourceId ? `#${sourceId}` : "እንግዳ"}
        </span>
      </header>

      {/* የተሳካ ትዕዛዝ ማረጋገጫ */}
      {success && (
        <div className="m-4 bg-green-500/20 border border-green-500/40 p-4 rounded-2xl text-center">
          <p className="text-green-400 font-black text-sm">
            ትዕዛዝዎ በተሳካ ሁኔታ ለኩሽና ተላልፏል! 🎉
          </p>
          <p className="text-xs text-slate-300 mt-1">
            ምግብዎ ተዘጋጅቶ በቅርቡ ይደርስዎታል።
          </p>
          <button
            onClick={() => setSuccess(false)}
            className="mt-3 text-xs bg-green-500 text-slate-950 px-3 py-1.5 rounded-lg font-bold cursor-pointer"
          >
            አዲስ ትዕዛዝ እዘዝ
          </button>
        </div>
      )}

      {/* የምድብ መምረጫ (Category Filter) */}
      {!loadingMenu && menuItems.length > 0 && (
        <div className="px-4 pt-4 flex gap-2 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                selectedCategory === cat
                  ? "bg-amber-500 text-slate-950"
                  : "bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* የምግብ ዝርዝር (Menu Grid) */}
      {loadingMenu ? (
        <div className="p-10 text-center text-slate-400 text-sm">
          ሜኑ በመጫን ላይ ነው...
        </div>
      ) : filteredMenu.length === 0 ? (
        <div className="m-4 p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-2">
          <p className="text-2xl">🍽️</p>
          <p className="text-slate-300 font-bold text-sm">
            በአሁኑ ሰዓት የተመዘገበ ምግብ የለም
          </p>
          <p className="text-slate-500 text-xs">
            ባለቤቱ በ /admin1 በኩል ምግቦችን ሲጨምር እዚህ በቀጥታ ይታያሉ።
          </p>
        </div>
      ) : (
        <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
          {filteredMenu.map((item) => {
            const isAvailable = item.available !== false;
            return (
              <div
                key={item.id}
                className={`bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col justify-between ${
                  !isAvailable ? "opacity-60" : ""
                }`}
              >
                <div className="relative h-28 w-full bg-slate-800">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-3xl">
                      🍽️
                    </div>
                  )}
                  {!isAvailable && (
                    <span className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                      አልቋል
                    </span>
                  )}
                </div>

                <div className="p-3 flex flex-col flex-1 justify-between">
                  <div>
                    <h3 className="font-bold text-xs line-clamp-1">{item.name}</h3>
                    {item.description && (
                      <p className="text-[10px] text-slate-400 line-clamp-2 mt-0.5">
                        {item.description}
                      </p>
                    )}
                    <p className="text-amber-500 font-black text-sm mt-1">
                      {item.price} ብር
                    </p>
                  </div>

                  <div className="mt-3">
                    {!isAvailable ? (
                      <button
                        disabled
                        className="w-full py-1.5 bg-slate-800 text-slate-500 border border-slate-700 rounded-xl text-xs font-bold cursor-not-allowed"
                      >
                        አልቋል
                      </button>
                    ) : cart[item.id] ? (
                      <div className="flex items-center justify-between bg-slate-800 rounded-xl p-1">
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="w-7 h-7 bg-slate-700 rounded-lg text-sm font-bold cursor-pointer"
                        >
                          -
                        </button>
                        <span className="text-xs font-bold text-amber-400">
                          {cart[item.id]}
                        </span>
                        <button
                          onClick={() => addToCart(item.id)}
                          className="w-7 h-7 bg-amber-500 text-slate-950 rounded-lg text-sm font-bold cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(item.id)}
                        className="w-full py-1.5 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        + እዘዝ
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ከታች የሚታይ ቅርጫት (Floating Cart Bar) */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-900/95 backdrop-blur border-t border-slate-800 flex justify-between items-center z-40">
          <div>
            <p className="text-[11px] text-slate-400">
              {totalItems} ምግቦች ተመርጠዋል
            </p>
            <p className="text-base font-black text-amber-500">
              {totalPrice} ብር
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-amber-500 text-slate-950 font-black text-xs px-5 py-3 rounded-xl shadow-lg shadow-amber-500/20 cursor-pointer"
          >
            ትዕዛዝ አረጋግጥ ➜
          </button>
        </div>
      )}

      {/* ማዘዣ ፎርም (Modal) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm">
            <h2 className="text-base font-black text-amber-500 mb-4">
              መረጃዎን ያስገቡ
            </h2>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-400">የትዕዛዝ ቦታ</label>
                <input
                  type="text"
                  disabled
                  value={
                    source === "ROOM"
                      ? `ክፍል ${sourceId || "ያልተጠቀሰ"}`
                      : `ጠረጴዛ ${sourceId || "ያልተጠቀሰ"}`
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-400 mt-1"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400">ሙሉ ስም *</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="ምሳሌ፡ ዮሐንስ አበበ"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 mt-1 outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400">ስልክ ቁጥር *</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="09..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 mt-1 outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400">
                  ልዩ ማስታወሻ (አማራጭ)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="ለምሳሌ፡ ቃሪያ እንዳይበዛበት"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 mt-1 outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-slate-800 text-slate-300 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
              >
                ሰርዝ
              </button>
              <button
                onClick={handleOrder}
                disabled={isOrdering}
                className="flex-1 bg-amber-500 text-slate-950 py-2.5 rounded-xl text-xs font-black cursor-pointer"
              >
                {isOrdering ? "እየላከ..." : "አረጋግጥ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MenuPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-slate-400 text-center">እየጫነ ነው...</div>
      }
    >
      <MenuContent />
    </Suspense>
  );
}