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

const ROOM_SERVICES = [
  { id: "bedsheet", label: "የአንሶላ ቅያሪ", icon: "🛏️", desc: "ንጹህ አንሶላ እና የትራስ ልብስ" },
  { id: "towel", label: "ንጹህ ፎጣ", icon: "🧻", desc: "የመታጠቢያ እና የፊት ፎጣ" },
  { id: "soap", label: "ሳሙና እና ሻምፑ", icon: "🧼", desc: "ሳሙና፣ ሻምፑ እና የጥርስ ብሩሽ" },
  { id: "cleaning", label: "የክፍል ጽዳት", icon: "🧹", desc: "የጽዳት ሰራተኛ ወደ ክፍል እንዲመጣ" },
  { id: "water", label: "የመጠጥ ውሃ", icon: "💧", desc: "ተጨማሪ የታሸገ ውሃ" },
  { id: "blanket", label: "ተጨማሪ ብርድ ልብስ / ትራስ", icon: "🛋️", desc: "ተጨማሪ አልጋ ልብስ" },
  { id: "maintenance", label: "የጥገና እርዳታ", icon: "🔧", desc: "መብራት፣ ቧንቧ፣ Wi-Fi ወይም TV" },
];

function MenuContent() {
  const searchParams = useSearchParams();
  const [source, setSource] = useState("ROOM");
  const [sourceId, setSourceId] = useState("");
  const [activeTab, setActiveTab] = useState<"FOOD" | "ROOM_SERVICE">("FOOD");

  // Food Menu States
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

  // Housekeeping / Room Service States
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [serviceNote, setServiceNote] = useState("");
  const [isSendingService, setIsSendingService] = useState(false);
  const [serviceSuccess, setServiceSuccess] = useState(false);

  useEffect(() => {
    const s = searchParams.get("source");
    const id = searchParams.get("id");
    if (s) setSource(s.toUpperCase());
    if (id) setSourceId(id);
  }, [searchParams]);

  // ሜኑውን በቀጥታ ከFirebase ማንበብ
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

  // Room Service Selection & Submit
  const toggleService = (label: string) => {
    setSelectedServices((prev) =>
      prev.includes(label) ? prev.filter((s) => s !== label) : [...prev, label]
    );
  };

  const handleServiceRequest = async () => {
    if (selectedServices.length === 0 && !serviceNote.trim()) {
      alert("እባክዎ ቢያንስ አንድ አገልግሎት ይምረጡ ወይም ማስታወሻ ይጻፉ!");
      return;
    }
    if (!db) {
      alert("ከዳታቤዝ ጋር መገናኘት አልተቻለም፤ ገጹን አድሰው ይሞክሩ!");
      return;
    }

    setIsSendingService(true);
    try {
      const reqRef = push(ref(db, "housekeepingRequests"));
      await set(reqRef, {
        room_number: sourceId || "ያልተጠቀሰ",
        services:
          selectedServices.length > 0 ? selectedServices : ["ልዩ የክፍል ጥያቄ"],
        note: serviceNote.trim(),
        status: "PENDING",
        created_at: new Date().toISOString(),
      });

      setServiceSuccess(true);
      setSelectedServices([]);
      setServiceNote("");
    } catch (e) {
      alert("ጥያቄው አልተላከም፤ እባክዎ እንደገና ይሞክሩ!");
      console.error(e);
    } finally {
      setIsSendingService(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-28">
      {/* ራስጌ */}
      <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-50">
        <div className="flex justify-between items-center">
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
        </div>

        {/* ለክፍል እንግዶች ብቻ የሚታይ የአገልግሎት መምረጫ (Food vs Room Service) */}
        {source === "ROOM" && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => setActiveTab("FOOD")}
              className={`py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === "FOOD"
                  ? "bg-amber-500 text-slate-950"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              🍽️ ምግብ እና መጠጥ
            </button>
            <button
              onClick={() => setActiveTab("ROOM_SERVICE")}
              className={`py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === "ROOM_SERVICE"
                  ? "bg-emerald-500 text-slate-950"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              🛏️ የክፍል አገልግሎት / ጽዳት
            </button>
          </div>
        )}
      </header>

      {/* ==================== ክፍል 1፡ ምግብ እና መጠጥ ==================== */}
      {activeTab === "FOOD" && (
        <>
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
        </>
      )}

      {/* ==================== ክፍል 2፡ የክፍል አገልግሎት / ጽዳት ==================== */}
      {activeTab === "ROOM_SERVICE" && source === "ROOM" && (
        <div className="p-4 max-w-xl mx-auto space-y-4">
          {serviceSuccess && (
            <div className="bg-emerald-500/20 border border-emerald-500/40 p-4 rounded-2xl text-center">
              <p className="text-emerald-400 font-black text-sm">
                ጥያቄዎ ለክፍል አገልግሎት (Housekeeping) ተልኳል! ✅
              </p>
              <p className="text-xs text-slate-300 mt-1">
                ሰራተኛችን በቅርቡ ወደ ክፍል {sourceId || ""} ይደርሳል።
              </p>
              <button
                onClick={() => setServiceSuccess(false)}
                className="mt-3 text-xs bg-emerald-500 text-slate-950 px-3 py-1.5 rounded-lg font-bold cursor-pointer"
              >
                ሌላ ጥያቄ ላክ
              </button>
            </div>
          )}

          <div className="space-y-1">
            <h2 className="text-base font-bold text-emerald-400">
              የሚፈልጉትን የክፍል አገልግሎት ይምረጡ
            </h2>
            <p className="text-xs text-slate-400">
              ከአንድ በላይ መምረጥ ይችላሉ (ለምሳሌ፡ ፎጣ እና ሳሙና)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {ROOM_SERVICES.map((srv) => {
              const isSelected = selectedServices.includes(srv.label);
              return (
                <button
                  key={srv.id}
                  type="button"
                  onClick={() => toggleService(srv.label)}
                  className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                    isSelected
                      ? "bg-emerald-500/20 border-emerald-500 text-white shadow-md shadow-emerald-500/10"
                      : "bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{srv.icon}</span>
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                        isSelected
                          ? "bg-emerald-500 text-slate-950"
                          : "border border-slate-600"
                      }`}
                    >
                      {isSelected ? "✓" : ""}
                    </span>
                  </div>
                  <p className="font-bold text-xs mt-2">{srv.label}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{srv.desc}</p>
                </button>
              );
            })}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
            <label className="text-xs font-semibold text-slate-300">
              ተጨማሪ ማስታወሻ (አማራጭ)
            </label>
            <textarea
              rows={2}
              value={serviceNote}
              onChange={(e) => setServiceNote(e.target.value)}
              placeholder="ለምሳሌ፡ 2 ፎጣ እና 1 ትልቅ ሳሙና ይላኩልኝ / የመታጠቢያ መብራት አይሰራም..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 outline-none focus:border-emerald-500"
            />
          </div>

          <button
            onClick={handleServiceRequest}
            disabled={isSendingService}
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-sm rounded-xl transition cursor-pointer shadow-lg shadow-emerald-500/20"
          >
            {isSendingService
              ? "ጥያቄውን በመላክ ላይ..."
              : `ጥያቄ ላክ (${selectedServices.length} የተመረጠ)`}
          </button>
        </div>
      )}

      {/* የምግብ ማዘዣ ፎርም (Modal) */}
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