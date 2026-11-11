"use client";

import React, { useEffect, useState, useRef } from "react";
import { ref, onValue, update } from "firebase/database";
import { db } from "../../lib/firebase";

export default function KitchenPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const prevCount = useRef(0);

  // የድምፅ ማንቂያ
  const playAlert = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.6);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const ordersRef = ref(db, "orders");
    return onValue(ordersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map((k) => ({ id: k, ...data[k] }));
        const active = list.filter((o) => o.order_status !== "COMPLETED");

        if (active.length > prevCount.current) {
          playAlert();
        }
        prevCount.current = active.length;
        setOrders(active.reverse());
      } else {
        setOrders([]);
      }
    });
  }, []);

  const changeStatus = (id: string, status: string) => {
    update(ref(db, `orders/${id}`), { order_status: status });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-black text-amber-500">የኩሽና ትዕዛዝ መቆጣጠሪያ</h1>
          <p className="text-xs text-slate-400">ቅጽበታዊ ትዕዛዝ መቀበያ ማዕከል (KDS)</p>
        </div>
        <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-xs font-bold border border-red-500/30">
          ክፍት ትዕዛዞች: {orders.length}
        </span>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-20 text-slate-500 text-sm">
          እስካሁን ምንም አዲስ ትዕዛዝ አልገባም...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map((o) => (
            <div
              key={o.id}
              className={`bg-slate-900 border-2 rounded-2xl p-4 flex flex-col justify-between ${
                o.order_status === "PENDING"
                  ? "border-red-500 animate-pulse"
                  : "border-slate-800"
              }`}
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className="font-black text-lg text-amber-500">{o.target_identifier}</span>
                  <span className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-300 font-bold">
                    {o.order_type}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-2">
                  ደንበኛ: {o.customer_name} ({o.phone})
                </p>
                {o.special_instructions && (
                  <div className="bg-red-950/40 border border-red-900/50 p-2 rounded-lg mb-3">
                    <p className="text-xs text-red-300 font-bold">ማስታወሻ: {o.special_instructions}</p>
                  </div>
                )}
                <div className="border-t border-slate-800 pt-2 space-y-1">
                  {o.items?.map((it: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-sm font-semibold">
                      <span>{it.name}</span>
                      <span className="text-amber-500">x{it.qty}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex gap-2">
                {o.order_status === "PENDING" && (
                  <button
                    onClick={() => changeStatus(o.id, "PREPARING")}
                    className="flex-1 bg-amber-500 text-slate-950 font-bold py-2 rounded-xl text-xs hover:bg-amber-400 transition"
                  >
                    ተቀበል (Accept)
                  </button>
                )}
                {o.order_status === "PREPARING" && (
                  <button
                    onClick={() => changeStatus(o.id, "COMPLETED")}
                    className="flex-1 bg-green-500 text-slate-950 font-bold py-2 rounded-xl text-xs hover:bg-green-400 transition"
                  >
                    ተጠናቋል (Complete)
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}