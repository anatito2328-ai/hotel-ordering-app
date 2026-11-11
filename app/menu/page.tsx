"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ref, push, set } from "firebase/database";
import { db } from "../../lib/firebase";

const menuItems = [
  { id: "1", name: "ልዩ የበሬ ጥብስ", price: 650, category: "ምግብ", img: "https://images.unsplash.com/photo-1544025162-d76694265947?w=400" },
  { id: "2", name: "የዶሮ ጥብስ / ወጥ", price: 700, category: "ምግብ", img: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400" },
  { id: "3", name: "ስፔሻል በርገር", price: 500, category: "ፈጣን ምግብ", img: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400" },
  { id: "4", name: "ፒዛ ማርገሪታ", price: 800, category: "ፈጣን ምግብ", img: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400" },
  { id: "5", name: "ስፔሻል ቡና & ሻይ", price: 120, category: "መጠጥ", img: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400" },
  { id: "6", name: "ትኩስ ፍሬሽ ጁስ", price: 180, category: "መጠጥ", img: "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=400" }
];

function MenuContent() {
  const searchParams = useSearchParams();
  const [source, setSource] = useState("ROOM");
  const [sourceId, setSourceId] = useState("");
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
    return sum + (item ? item.price * cart[id] : 0);
  }, 0);

  const handleOrder = async () => {
    if (!customerName || !phone) {
      alert("እባክዎ ስም እና ስልክ ቁጥር ያስገቡ!");
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
          name: item?.name,
          price: item?.price,
          qty: cart[id],
        };
      });

      const targetIdentifier = source === "ROOM" ? `ክፍል ${sourceId || "ያልተጠቀሰ"}` : `ጠረጴዛ ${sourceId || "ያልተጠቀሰ"}`;

      await set(newOrderRef, {
        order_type: source,
        target_identifier: targetIdentifier,
        customer_name: customerName,
        phone: phone,
        special_instructions: note,
        items: orderedItems,
        total_amount: totalPrice,
        order_status: "PENDING",
        created_at: new Date().toISOString(),
      });

      setSuccess(true);
      setCart({});
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
            {source === "ROOM" ? `የክፍል አገልግሎት (${sourceId ? `ክፍል ${sourceId}` : "ክፍል"})` : `የጠረጴዛ አገልግሎት (${sourceId ? `ጠረጴዛ ${sourceId}` : "ጠረጴዛ"})`}
          </p>
        </div>
        <span className="text-xs bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full border border-amber-500/30 font-bold">
          {sourceId ? `#${sourceId}` : "እንግዳ"}
        </span>
      </header>

      {/* የተሳካ ትዕዛዝ ማረጋገጫ */}
      {success && (
        <div className="m-4 bg-green-500/20 border border-green-500/40 p-4 rounded-2xl text-center">
          <p className="text-green-400 font-black text-sm">ትዕዛዝዎ በተሳካ ሁኔታ ለኩሽና ተላልፏል! 🎉</p>
          <p className="text-xs text-slate-300 mt-1">ምግብዎ ተዘጋጅቶ በቅርቡ ይደርስዎታል።</p>
          <button
            onClick={() => setSuccess(false)}
            className="mt-3 text-xs bg-green-500 text-slate-950 px-3 py-1.5 rounded-lg font-bold"
          >
            አዲስ ትዕዛዝ እዘዝ
          </button>
        </div>
      )}

      {/* የምግብ ዝርዝር (Menu Grid) */}
      <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
        {menuItems.map((item) => (
          <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col justify-between">
            <img src={item.img} alt={item.name} className="h-28 w-full object-cover" />
            <div className="p-3">
              <h3 className="font-bold text-xs line-clamp-1">{item.name}</h3>
              <p className="text-amber-500 font-black text-sm mt-1">{item.price} ብር</p>
              
              <div className="mt-3">
                {cart[item.id] ? (
                  <div className="flex items-center justify-between bg-slate-800 rounded-xl p-1">
                    <button onClick={() => removeFromCart(item.id)} className="w-7 h-7 bg-slate-700 rounded-lg text-sm font-bold">-</button>
                    <span className="text-xs font-bold text-amber-400">{cart[item.id]}</span>
                    <button onClick={() => addToCart(item.id)} className="w-7 h-7 bg-amber-500 text-slate-950 rounded-lg text-sm font-bold">+</button>
                  </div>
                ) : (
                  <button
                    onClick={() => addToCart(item.id)}
                    className="w-full py-1.5 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold transition"
                  >
                    + እዘዝ
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ከታች የሚታይ ቅርጫት (Floating Cart Bar) */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-900/95 backdrop-blur border-t border-slate-800 flex justify-between items-center z-40">
          <div>
            <p className="text-[11px] text-slate-400">{totalItems} ምግቦች ተመርጠዋል</p>
            <p className="text-base font-black text-amber-500">{totalPrice} ብር</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-amber-500 text-slate-950 font-black text-xs px-5 py-3 rounded-xl shadow-lg shadow-amber-500/20"
          >
            ትዕዛዝ አረጋግጥ ➜
          </button>
        </div>
      )}

      {/* ማዘዣ ፎርም (Modal) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm">
            <h2 className="text-base font-black text-amber-500 mb-4">መረጃዎን ያስገቡ</h2>
            
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-400">የትዕዛዝ ቦታ</label>
                <input
                  type="text"
                  disabled
                  value={source === "ROOM" ? `ክፍል ${sourceId || "ያልተጠቀሰ"}` : `ጠረጴዛ ${sourceId || "ያልተጠቀሰ"}`}
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
                <label className="text-[11px] text-slate-400">ልዩ ማስታወሻ (አማራጭ)</label>
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
                className="flex-1 bg-slate-800 text-slate-300 py-2.5 rounded-xl text-xs font-bold"
              >
                ሰርዝ
              </button>
              <button
                onClick={handleOrder}
                disabled={isOrdering}
                className="flex-1 bg-amber-500 text-slate-950 py-2.5 rounded-xl text-xs font-black"
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
    <Suspense fallback={<div className="p-6 text-slate-400 text-center">እየጫነ ነው...</div>}>
      <MenuContent />
    </Suspense>
  );
}