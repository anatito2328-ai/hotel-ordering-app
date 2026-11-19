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
  available: boolean;
}

interface LocationItem {
  id: string;
  number: string;
  type: "ROOM" | "TABLE";
}

const CATEGORIES = ["ቁርስ (Breakfast)", "ምሳ እና እራት (Main)", "መጠጦች (Drinks)", "ልዩ (Special)"];

export default function AdminDashboard() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");

  const [activeTab, setActiveTab] = useState<"menu" | "locations">("menu");

  // Menu States
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemCategory, setItemCategory] = useState(CATEGORIES[1]);
  const [itemDesc, setItemDesc] = useState("");

  // Locations (Rooms & Tables) States
  const [rooms, setRooms] = useState<LocationItem[]>([]);
  const [tables, setTables] = useState<LocationItem[]>([]);
  const [locationType, setLocationType] = useState<"ROOM" | "TABLE">("ROOM");
  const [locationNumber, setLocationNumber] = useState("");

  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    if (!isUnlocked || !db) return;

    const menuRef = ref(db, "menuItems");
    const unsubMenu = onValue(menuRef, (snapshot) => {
      const data = snapshot.val() as Record<string, Omit<MenuItem, "id">> | null;
      if (data) {
        const list = Object.entries(data).map(([id, val]) => ({ id, ...val }));
        setMenuItems(list);
      } else {
        setMenuItems([]);
      }
    });

    const roomsRef = ref(db, "locations/rooms");
    const unsubRooms = onValue(roomsRef, (snapshot) => {
      const data = snapshot.val() as Record<string, { number: string }> | null;
      if (data) {
        const list: LocationItem[] = Object.entries(data).map(([id, val]) => ({
          id,
          number: val.number,
          type: "ROOM",
        }));
        setRooms(list);
      } else {
        setRooms([]);
      }
    });

    const tablesRef = ref(db, "locations/tables");
    const unsubTables = onValue(tablesRef, (snapshot) => {
      const data = snapshot.val() as Record<string, { number: string }> | null;
      if (data) {
        const list: LocationItem[] = Object.entries(data).map(([id, val]) => ({
          id,
          number: val.number,
          type: "TABLE",
        }));
        setTables(list);
      } else {
        setTables([]);
      }
    });

    return () => {
      unsubMenu();
      unsubRooms();
      unsubTables();
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

  // Add Menu Item
  const handleAddMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !itemName.trim() || !itemPrice) return;

    const newRef = push(ref(db, "menuItems"));
    await set(newRef, {
      name: itemName.trim(),
      price: Number(itemPrice),
      category: itemCategory,
      description: itemDesc.trim(),
      available: true,
    });

    setItemName("");
    setItemPrice("");
    setItemDesc("");
    showNotice("አዲሱ ምግብ ወደ ሜኑ ተጨምሯል!");
  };

  // Toggle Out of Stock
  const toggleAvailability = async (item: MenuItem) => {
    if (!db) return;
    await update(ref(db, `menuItems/${item.id}`), {
      available: !item.available,
    });
  };

  // Delete Menu Item
  const deleteMenuItem = async (id: string) => {
    if (!db) return;
    await remove(ref(db, `menuItems/${id}`));
    showNotice("ምግቡ ከሜኑ ተሰርዟል።");
  };

  // Add Room or Table
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
            <p className="text-slate-400 text-sm">ሜኑ፣ ክፍሎች እና ጠረጴዛዎችን ያስተዳድሩ</p>
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
        <div className="flex gap-3">
          <button
            onClick={() => setActiveTab("menu")}
            className={`flex-1 py-3 px-4 rounded-xl font-bold transition cursor-pointer ${
              activeTab === "menu"
                ? "bg-amber-500 text-slate-950"
                : "bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800"
            }`}
          >
            🍽️ ሜኑ አስተዳደር ({menuItems.length})
          </button>
          <button
            onClick={() => setActiveTab("locations")}
            className={`flex-1 py-3 px-4 rounded-xl font-bold transition cursor-pointer ${
              activeTab === "locations"
                ? "bg-amber-500 text-slate-950"
                : "bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800"
            }`}
          >
            🛏️ ክፍሎችና ጠረጴዛዎች ({rooms.length + tables.length})
          </button>
        </div>

        {/* TAB 1: MENU MANAGEMENT */}
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
                placeholder="አጭር መግለጫ (አማራጭ - ለምሳሌ፡ በቅቤ የተሰራ ትኩስ ጥብስ)"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 font-bold rounded-xl transition cursor-pointer"
              >
                ወደ ሜኑ መዝግብ
              </button>
            </form>

            {/* Menu List */}
            <div className="space-y-3">
              <h3 className="font-bold text-slate-300">የተመዘገቡ ምግቦች ዝርዝር</h3>
              {menuItems.length === 0 ? (
                <p className="text-slate-500 bg-slate-900 border border-slate-800 rounded-xl p-6 text-center">
                  እስካሁን የተመዘገበ ምግብ የለም። ከላይ ያለውን ቅጽ ሞልተው ይጨምሩ።
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
                      <div>
                        <p className="font-bold text-white">
                          {item.name}{" "}
                          <span className="text-amber-400 ml-1">{item.price} ብር</span>
                        </p>
                        <p className="text-xs text-slate-400">{item.category}</p>
                        {item.description && (
                          <p className="text-xs text-slate-500 mt-1">{item.description}</p>
                        )}
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
                          ሰርዝ (Delete)
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: ROOMS & TABLES MANAGEMENT */}
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
              {/* Rooms List */}
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

              {/* Tables List */}
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
      </div>
    </main>
  );
}