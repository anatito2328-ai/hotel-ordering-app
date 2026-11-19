"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ref, push, set, remove, update, onValue } from "firebase/database";
import { db } from "@/lib/firebase";

const ADMIN_PIN = "1234";

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  description: string;
  image?: string;
  available: boolean;
}

interface LocationItem {
  id: string;
  number: string;
  type: "ROOM" | "TABLE";
}

interface WaiterItem {
  id: string;
  name: string;
  phone?: string;
  assigned: string[];
}

const CATEGORIES = [
  "ቁርስ (Breakfast)",
  "ምሳ እና እራት (Main)",
  "መጠጦች (Drinks)",
  "ልዩ (Special)",
];

const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxWidth = 500;
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};

export default function AdminDashboard() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");

  const [activeTab, setActiveTab] = useState<"menu" | "locations" | "waiters">("menu");

  // Menu States
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemCategory, setItemCategory] = useState(CATEGORIES[1]);
  const [itemDesc, setItemDesc] = useState("");
  const [itemImage, setItemImage] = useState("");
  const [isUploadingImg, setIsUploadingImg] = useState(false);

  // Locations (Rooms & Tables) States
  const [rooms, setRooms] = useState<LocationItem[]>([]);
  const [tables, setTables] = useState<LocationItem[]>([]);
  const [locationType, setLocationType] = useState<"ROOM" | "TABLE">("ROOM");
  const [locationNumber, setLocationNumber] = useState("");

  // Waiters States
  const [waiters, setWaiters] = useState<WaiterItem[]>([]);
  const [waiterName, setWaiterName] = useState("");
  const [waiterPhone, setWaiterPhone] = useState("");

  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    if (!isUnlocked || !db) return;

    const unsubMenu = onValue(ref(db, "menuItems"), (snapshot) => {
      const data = snapshot.val() as Record<string, Omit<MenuItem, "id">> | null;
      if (data) {
        setMenuItems(Object.entries(data).map(([id, val]) => ({ id, ...val })));
      } else {
        setMenuItems([]);
      }
    });

    const unsubRooms = onValue(ref(db, "locations/rooms"), (snapshot) => {
      const data = snapshot.val() as Record<string, { number: string }> | null;
      if (data) {
        setRooms(
          Object.entries(data).map(([id, val]) => ({
            id,
            number: val.number,
            type: "ROOM",
          }))
        );
      } else {
        setRooms([]);
      }
    });

    const unsubTables = onValue(ref(db, "locations/tables"), (snapshot) => {
      const data = snapshot.val() as Record<string, { number: string }> | null;
      if (data) {
        setTables(
          Object.entries(data).map(([id, val]) => ({
            id,
            number: val.number,
            type: "TABLE",
          }))
        );
      } else {
        setTables([]);
      }
    });

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

    return () => {
      unsubMenu();
      unsubRooms();
      unsubTables();
      unsubWaiters();
    };
  }, [isUnlocked]);

  const showNotice = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(""), 3000);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === ADMIN_PIN) {
      setIsUnlocked(true);
      setPinError("");
    } else {
      setPinError("የገባው ፒን (PIN) ትክክል አይደለም!");
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImg(true);
    try {
      const compressed = await compressImage(file);
      setItemImage(compressed);
    } catch {
      showNotice("ፎቶውን ማንበብ አልተቻለም፣ እባክዎ ሌላ ፎቶ ይሞክሩ።");
    } finally {
      setIsUploadingImg(false);
    }
  };

  const handleAddMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !itemName.trim() || !itemPrice) return;

    const newRef = push(ref(db, "menuItems"));
    await set(newRef, {
      name: itemName.trim(),
      price: Number(itemPrice),
      category: itemCategory,
      description: itemDesc.trim(),
      image: itemImage.trim(),
      available: true,
    });

    setItemName("");
    setItemPrice("");
    setItemDesc("");
    setItemImage("");
    showNotice("አዲሱ ምግብ ወደ ሜኑ ተጨምሯል!");
  };

  const toggleAvailability = async (item: MenuItem) => {
    if (!db) return;
    await update(ref(db, `menuItems/${item.id}`), {
      available: !item.available,
    });
  };

  const deleteMenuItem = async (id: string) => {
    if (!db) return;
    await remove(ref(db, `menuItems/${id}`));
    showNotice("ምግቡ ከሜኑ ተሰርዟል።");
  };

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !locationNumber.trim()) return;

    const path = locationType === "ROOM" ? "locations/rooms" : "locations/tables";
    const newRef = push(ref(db, path));
    await set(newRef, {
      number: locationNumber.trim(),
      createdAt: Date.now(),
    });

    setLocationNumber("");
    showNotice(
      locationType === "ROOM"
        ? `ክፍል ${locationNumber.trim()} ተመዝግቧል!`
        : `ጠረጴዛ ${locationNumber.trim()} ተመዝግቧል!`
    );
  };

  const deleteLocation = async (type: "ROOM" | "TABLE", id: string) => {
    if (!db) return;
    const path = type === "ROOM" ? `locations/rooms/${id}` : `locations/tables/${id}`;
    await remove(ref(db, path));
    showNotice("ተሰርዟል።");
  };

  // Waiter Handlers
  const handleAddWaiter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !waiterName.trim()) return;

    const newRef = push(ref(db, "waiters"));
    await set(newRef, {
      name: waiterName.trim(),
      phone: waiterPhone.trim(),
      assigned: [],
      createdAt: Date.now(),
    });

    setWaiterName("");
    setWaiterPhone("");
    showNotice(`አስተናጋጅ ${waiterName.trim()} ተመዝግቧል!`);
  };

  const deleteWaiter = async (id: string) => {
    if (!db) return;
    await remove(ref(db, `waiters/${id}`));
    showNotice("አስተናጋጁ ተሰርዟል።");
  };

  const toggleAssignLocation = async (waiter: WaiterItem, locLabel: string) => {
    if (!db) return;

    const updates: Record<string, string[]> = {};
    const isCurrentlyAssigned = waiter.assigned.includes(locLabel);

    // ሌላ አስተናጋጅ ላይ ተመድቦ ከነበረ በራሱ ከእሱ አንስቶ ለዚህኛው ይሰጣል
    if (!isCurrentlyAssigned) {
      waiters.forEach((other) => {
        if (other.id !== waiter.id && other.assigned.includes(locLabel)) {
          updates[`waiters/${other.id}/assigned`] = other.assigned.filter(
            (item) => item !== locLabel
          );
        }
      });
    }

    updates[`waiters/${waiter.id}/assigned`] = isCurrentlyAssigned
      ? waiter.assigned.filter((item) => item !== locLabel)
      : [...waiter.assigned, locLabel];

    await update(ref(db), updates);
  };

  const allLocationLabels = [
    ...tables.map((t) => `ጠረጴዛ ${t.number}`),
    ...rooms.map((r) => `ክፍል ${r.number}`),
  ];

  const getOwnerWaiterName = (locLabel: string) => {
    const owner = waiters.find((w) => w.assigned.includes(locLabel));
    return owner ? owner.name : null;
  };

  // PIN Lock Screen
  if (!isUnlocked) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <form
          onSubmit={handleLogin}
          className="max-w-sm w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-5 shadow-xl"
        >
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold text-amber-400">🔐 የባለቤት መግቢያ</h1>
            <p className="text-slate-400 text-sm">Admin Dashboard PIN ያስገቡ</p>
          </div>

          <input
            type="password"
            inputMode="numeric"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            placeholder="PIN (ለምሳሌ፡ 1234)"
            className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-center text-xl tracking-widest focus:outline-none focus:border-amber-400"
          />

          {pinError && <p className="text-red-400 text-sm text-center">{pinError}</p>}

          <button
            type="submit"
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition cursor-pointer"
          >
            ግባ (Unlock)
          </button>

          <Link
            href="/"
            className="block text-center text-sm text-slate-400 hover:text-white pt-2"
          >
            ← ወደ ዋናው ገጽ ተመለስ
          </Link>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-amber-400">⚙️ የሆቴል ባለቤት መቆጣጠሪያ</h1>
            <p className="text-slate-400 text-sm">
              ሜኑ፣ ክፍሎች፣ ጠረጴዛዎች እና የአስተናጋጅ ድልድልን ያስተዳድሩ
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/qr"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium"
            >
              📱 QR ኮድ
            </Link>
            <Link
              href="/"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium"
            >
              🏠 ዋና ገጽ
            </Link>
          </div>
        </div>

        {/* Status Banner */}
        {statusMsg && (
          <div className="bg-emerald-900/60 border border-emerald-500 text-emerald-200 px-4 py-3 rounded-xl text-sm font-medium">
            ✅ {statusMsg}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="grid grid-cols-3 gap-2 md:gap-3">
          <button
            onClick={() => setActiveTab("menu")}
            className={`py-3 px-3 rounded-xl text-xs md:text-sm font-bold transition cursor-pointer ${
              activeTab === "menu"
                ? "bg-amber-500 text-slate-950"
                : "bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800"
            }`}
          >
            🍽️ ሜኑ ({menuItems.length})
          </button>
          <button
            onClick={() => setActiveTab("locations")}
            className={`py-3 px-3 rounded-xl text-xs md:text-sm font-bold transition cursor-pointer ${
              activeTab === "locations"
                ? "bg-amber-500 text-slate-950"
                : "bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800"
            }`}
          >
            🛏️ ክፍል/ጠረጴዛ ({rooms.length + tables.length})
          </button>
          <button
            onClick={() => setActiveTab("waiters")}
            className={`py-3 px-3 rounded-xl text-xs md:text-sm font-bold transition cursor-pointer ${
              activeTab === "waiters"
                ? "bg-amber-500 text-slate-950"
                : "bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800"
            }`}
          >
            🧑‍🍳 አስተናጋጆች ({waiters.length})
          </button>
        </div>

        {/* ==================== TAB 1: MENU MANAGEMENT ==================== */}
        {activeTab === "menu" && (
          <div className="space-y-6">
            <form
              onSubmit={handleAddMenu}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4"
            >
              <h2 className="text-lg font-bold text-white">+ አዲስ ምግብ ወይም መጠጥ ጨምር</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  required
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="የምግቡ ስም (ለምሳሌ፡ ጥብስ)"
                  className="px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl focus:outline-none focus:border-amber-400"
                />
                <input
                  type="number"
                  required
                  min="1"
                  value={itemPrice}
                  onChange={(e) => setItemPrice(e.target.value)}
                  placeholder="ዋጋ በብር (ለምሳሌ፡ 450)"
                  className="px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl focus:outline-none focus:border-amber-400"
                />
                <select
                  value={itemCategory}
                  onChange={(e) => setItemCategory(e.target.value)}
                  className="px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl focus:outline-none focus:border-amber-400"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <input
                type="text"
                value={itemDesc}
                onChange={(e) => setItemDesc(e.target.value)}
                placeholder="አጭር መግለጫ (አማራጭ)"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl focus:outline-none focus:border-amber-400"
              />

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <label className="block text-sm font-medium text-slate-300">
                  📸 የምግቡ ፎቶ (አማራጭ)
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 text-sm font-medium rounded-lg cursor-pointer transition">
                    {isUploadingImg ? "በመጫን ላይ..." : "📁 ፎቶ ከፋይል ምረጥ"}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  <span className="text-xs text-slate-500">ወይም</span>
                  <input
                    type="url"
                    value={itemImage.startsWith("data:") ? "" : itemImage}
                    onChange={(e) => setItemImage(e.target.value)}
                    placeholder="የፎቶ ሊንክ (https://...)"
                    className="flex-1 min-w-[200px] px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>

                {itemImage && (
                  <div className="flex items-center gap-3 pt-2">
                    <img
                      src={itemImage}
                      alt="Preview"
                      className="w-16 h-16 object-cover rounded-lg border border-slate-700"
                    />
                    <button
                      type="button"
                      onClick={() => setItemImage("")}
                      className="text-xs text-red-400 hover:text-red-300 cursor-pointer"
                    >
                      ✕ ፎቶውን አንሳ
                    </button>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isUploadingImg}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 font-bold rounded-xl transition cursor-pointer"
              >
                ወደ ሜኑ መዝግብ
              </button>
            </form>

            <div className="space-y-3">
              <h3 className="font-bold text-slate-300">የተመዘገቡ ምግቦች ዝርዝር</h3>
              {menuItems.length === 0 ? (
                <p className="text-slate-500 bg-slate-900 border border-slate-800 rounded-xl p-6 text-center">
                  እስካሁን የተመዘገበ ምግብ የለም።
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {menuItems.map((item) => (
                    <div
                      key={item.id}
                      className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
                        item.available
                          ? "bg-slate-900 border-slate-800"
                          : "bg-slate-900/50 border-red-900/50 opacity-70"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-14 h-14 object-cover rounded-lg border border-slate-700 shrink-0"
                          />
                        ) : (
                          <div className="w-14 h-14 bg-slate-800 rounded-lg flex items-center justify-center text-xl shrink-0">
                            🍽️
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-white truncate">
                            {item.name}{" "}
                            <span className="text-amber-400 ml-1">{item.price} ብር</span>
                          </p>
                          <p className="text-xs text-slate-400">{item.category}</p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        <button
                          onClick={() => toggleAvailability(item)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                            item.available
                              ? "bg-emerald-900/70 text-emerald-300 border border-emerald-700"
                              : "bg-red-900/70 text-red-300 border border-red-700"
                          }`}
                        >
                          {item.available ? "አለ (Available)" : "አልቋል (Out)"}
                        </button>
                        <button
                          onClick={() => deleteMenuItem(item.id)}
                          className="px-3 py-1 bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white rounded-lg text-xs cursor-pointer transition"
                        >
                          ሰርዝ
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== TAB 2: ROOMS & TABLES ==================== */}
        {activeTab === "locations" && (
          <div className="space-y-6">
            <form
              onSubmit={handleAddLocation}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4"
            >
              <h2 className="text-lg font-bold text-white">+ አዲስ ክፍል ወይም ጠረጴዛ መዝግብ</h2>
              <div className="flex flex-wrap gap-3">
                <select
                  value={locationType}
                  onChange={(e) => setLocationType(e.target.value as "ROOM" | "TABLE")}
                  className="px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl focus:outline-none focus:border-amber-400"
                >
                  <option value="ROOM">🛏️ ክፍል (Room)</option>
                  <option value="TABLE">🪑 ጠረጴዛ (Table)</option>
                </select>
                <input
                  type="text"
                  required
                  value={locationNumber}
                  onChange={(e) => setLocationNumber(e.target.value)}
                  placeholder={
                    locationType === "ROOM"
                      ? "የክፍል ቁጥር (ለምሳሌ፡ 101)"
                      : "የጠረጴዛ ቁጥር (ለምሳሌ፡ 1)"
                  }
                  className="flex-1 min-w-[200px] px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl focus:outline-none focus:border-amber-400"
                />
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 font-bold rounded-xl transition cursor-pointer"
                >
                  መዝግብ
                </button>
              </div>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                <h3 className="font-bold text-amber-400">🛏️ የተመዘገቡ ክፍሎች ({rooms.length})</h3>
                {rooms.length === 0 ? (
                  <p className="text-slate-500 text-sm">ገና የተመዘገበ ክፍል የለም።</p>
                ) : (
                  <div className="space-y-2">
                    {rooms.map((room) => (
                      <div
                        key={room.id}
                        className="flex items-center justify-between bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-800"
                      >
                        <span className="font-semibold">ክፍል {room.number}</span>
                        <div className="flex gap-2">
                          <Link
                            href={`/menu?source=ROOM&id=${room.number}`}
                            className="text-xs px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-amber-300"
                          >
                            ሜኑ እይ
                          </Link>
                          <button
                            onClick={() => deleteLocation("ROOM", room.id)}
                            className="text-xs px-2.5 py-1 bg-red-950 hover:bg-red-600 text-red-300 hover:text-white rounded-lg cursor-pointer"
                          >
                            ሰርዝ
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                <h3 className="font-bold text-emerald-400">🪑 የተመዘገቡ ጠረጴዛዎች ({tables.length})</h3>
                {tables.length === 0 ? (
                  <p className="text-slate-500 text-sm">ገና የተመዘገበ ጠረጴዛ የለም።</p>
                ) : (
                  <div className="space-y-2">
                    {tables.map((table) => (
                      <div
                        key={table.id}
                        className="flex items-center justify-between bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-800"
                      >
                        <span className="font-semibold">ጠረጴዛ {table.number}</span>
                        <div className="flex gap-2">
                          <Link
                            href={`/menu?source=TABLE&id=${table.number}`}
                            className="text-xs px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-emerald-300"
                          >
                            ሜኑ እይ
                          </Link>
                          <button
                            onClick={() => deleteLocation("TABLE", table.id)}
                            className="text-xs px-2.5 py-1 bg-red-950 hover:bg-red-600 text-red-300 hover:text-white rounded-lg cursor-pointer"
                          >
                            ሰርዝ
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 3: WAITER ASSIGNMENT ==================== */}
        {activeTab === "waiters" && (
          <div className="space-y-6">
            <form
              onSubmit={handleAddWaiter}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4"
            >
              <h2 className="text-lg font-bold text-white">+ አዲስ አስተናጋጅ መዝግብ</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  required
                  value={waiterName}
                  onChange={(e) => setWaiterName(e.target.value)}
                  placeholder="የአስተናጋጁ ስም (ለምሳሌ፡ አበበ)"
                  className="px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl focus:outline-none focus:border-amber-400"
                />
                <input
                  type="tel"
                  value={waiterPhone}
                  onChange={(e) => setWaiterPhone(e.target.value)}
                  placeholder="ስልክ ቁጥር (አማራጭ)"
                  className="px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl focus:outline-none focus:border-amber-400"
                />
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 font-bold rounded-xl transition cursor-pointer"
                >
                  አስተናጋጅ መዝግብ
                </button>
              </div>
            </form>

            {allLocationLabels.length === 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-xs text-amber-200">
                💡 ለአስተናጋጆች ጠረጴዛ ወይም ክፍል ለመመደብ መጀመሪያ <strong>&quot;🛏️ ክፍል/ጠረጴዛ&quot;</strong> የሚለው ክፍል ገብተው ጠረጴዛዎችን እና ክፍሎችን ይመዝግቡ።
              </div>
            )}

            <div className="space-y-4">
              {waiters.length === 0 ? (
                <p className="text-slate-500 bg-slate-900 border border-slate-800 rounded-xl p-6 text-center">
                  እስካሁን የተመዘገበ አስተናጋጅ የለም።
                </p>
              ) : (
                waiters.map((waiter) => (
                  <div
                    key={waiter.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4"
                  >
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div>
                        <h3 className="text-base font-bold text-amber-400">
                          🧑‍🍳 {waiter.name}
                        </h3>
                        {waiter.phone && (
                          <p className="text-xs text-slate-400">📞 {waiter.phone}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-full">
                          {waiter.assigned.length} የተመደበ ቦታ
                        </span>
                        <button
                          onClick={() => deleteWaiter(waiter.id)}
                          className="text-xs px-3 py-1.5 bg-red-950 hover:bg-red-600 text-red-300 hover:text-white rounded-lg cursor-pointer transition"
                        >
                          ሰርዝ
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs text-slate-400">
                        ለ <strong>{waiter.name}</strong> የሚመደቡ ጠረጴዛዎችንና ክፍሎችን ይንኩ (አረንጓዴ = ለእሱ የተመደበ)፦
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {allLocationLabels.map((locLabel) => {
                          const isMine = waiter.assigned.includes(locLabel);
                          const ownerName = getOwnerWaiterName(locLabel);
                          const isTakenByOther = ownerName && !isMine;

                          return (
                            <button
                              key={locLabel}
                              type="button"
                              onClick={() => toggleAssignLocation(waiter, locLabel)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                                isMine
                                  ? "bg-emerald-500 text-slate-950 border-emerald-400"
                                  : isTakenByOther
                                  ? "bg-slate-950 text-slate-400 border-slate-800 hover:border-amber-500"
                                  : "bg-slate-800 text-slate-200 border-slate-700 hover:border-emerald-400"
                              }`}
                            >
                              {isMine ? "✓ " : ""}
                              {locLabel}
                              {isTakenByOther ? ` (${ownerName})` : ""}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}