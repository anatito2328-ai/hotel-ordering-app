"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ref, onValue, update, remove } from "firebase/database";
import { db } from "../../lib/firebase";

interface HousekeepingRequest {
  id: string;
  room_number: string;
  services: string[];
  note?: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  created_at: string;
}

export default function HousekeepingDashboard() {
  const [requests, setRequests] = useState<HousekeepingRequest[]>([]);
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "IN_PROGRESS" | "COMPLETED">("ALL");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const prevPendingCount = useRef<number | null>(null);

  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch {
      // Browser blocked autoplay before user click
    }
  };

  useEffect(() => {
    if (!db) return;

    const reqRef = ref(db, "housekeepingRequests");
    const unsubscribe = onValue(reqRef, (snapshot) => {
      const data = snapshot.val() as Record<string, Omit<HousekeepingRequest, "id">> | null;
      if (data) {
        const list: HousekeepingRequest[] = Object.entries(data)
          .map(([id, val]) => ({ id, ...val }))
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        const pendingCount = list.filter((r) => r.status === "PENDING").length;
        if (prevPendingCount.current !== null && pendingCount > prevPendingCount.current && soundEnabled) {
          playBeep();
        }
        prevPendingCount.current = pendingCount;
        setRequests(list);
      } else {
        prevPendingCount.current = 0;
        setRequests([]);
      }
    });

    return () => unsubscribe();
  }, [soundEnabled]);

  const updateStatus = async (id: string, status: HousekeepingRequest["status"]) => {
    if (!db) return;
    await update(ref(db, `housekeepingRequests/${id}`), { status });
  };

  const deleteRequest = async (id: string) => {
    if (!db) return;
    await remove(ref(db, `housekeepingRequests/${id}`));
  };

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;
  const inProgressCount = requests.filter((r) => r.status === "IN_PROGRESS").length;
  const completedCount = requests.filter((r) => r.status === "COMPLETED").length;

  const filteredRequests =
    filter === "ALL" ? requests : requests.filter((r) => r.status === filter);

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-emerald-400">
              🧹 የክፍል ጽዳት እና አገልግሎት (Housekeeping)
            </h1>
            <p className="text-slate-400 text-sm">
              ከእንግዶች ክፍል የሚላኩ የአንሶላ፣ ፎጣ፣ ሳሙና እና ጽዳት ጥያቄዎች
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                if (!soundEnabled) playBeep();
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

        {/* Summary Counters */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-amber-400">{pendingCount}</p>
            <p className="text-xs text-slate-300">አዲስ ጥያቄ (Pending)</p>
          </div>
          <div className="bg-sky-500/10 border border-sky-500/30 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-sky-400">{inProgressCount}</p>
            <p className="text-xs text-slate-300">በሂደት ላይ (In Progress)</p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-emerald-400">{completedCount}</p>
            <p className="text-xs text-slate-300">የተጠናቀቀ (Done)</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { key: "ALL", label: `ሁሉም (${requests.length})` },
            { key: "PENDING", label: `አዲስ (${pendingCount})` },
            { key: "IN_PROGRESS", label: `በሂደት ላይ (${inProgressCount})` },
            { key: "COMPLETED", label: `የተጠናቀቀ (${completedCount})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as typeof filter)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition ${
                filter === tab.key
                  ? "bg-emerald-500 text-slate-950"
                  : "bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Requests Grid */}
        {filteredRequests.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center text-slate-400">
            <p className="text-3xl mb-2">✨</p>
            <p className="font-bold">ምንም የክፍል አገልግሎት ጥያቄ የለም</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRequests.map((req) => (
              <div
                key={req.id}
                className={`rounded-2xl border p-5 flex flex-col justify-between space-y-4 ${
                  req.status === "PENDING"
                    ? "bg-slate-900 border-amber-500/60 shadow-lg shadow-amber-500/10"
                    : req.status === "IN_PROGRESS"
                    ? "bg-slate-900 border-sky-500/50"
                    : "bg-slate-900/50 border-slate-800 opacity-75"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-black text-white">
                      🛏️ ክፍል {req.room_number}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                        req.status === "PENDING"
                          ? "bg-amber-500/20 text-amber-400"
                          : req.status === "IN_PROGRESS"
                          ? "bg-sky-500/20 text-sky-400"
                          : "bg-emerald-500/20 text-emerald-400"
                      }`}
                    >
                      {req.status === "PENDING"
                        ? "አዲስ"
                        : req.status === "IN_PROGRESS"
                        ? "በሂደት ላይ"
                        : "ተጠናቋል"}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400">
                    🕒 {new Date(req.created_at).toLocaleTimeString("am-ET", { hour: "2-digit", minute: "2-digit" })}
                  </p>

                  {/* Requested Services Badges */}
                  <div className="flex flex-wrap gap-2">
                    {(req.services || []).map((srv, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs font-semibold text-slate-100"
                      >
                        • {srv}
                      </span>
                    ))}
                  </div>

                  {req.note && (
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-amber-200">
                      📝 {req.note}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  {req.status === "PENDING" && (
                    <button
                      onClick={() => updateStatus(req.id, "IN_PROGRESS")}
                      className="flex-1 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl cursor-pointer transition"
                    >
                      🚀 ስራ ጀምር
                    </button>
                  )}

                  {req.status === "IN_PROGRESS" && (
                    <button
                      onClick={() => updateStatus(req.id, "COMPLETED")}
                      className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl cursor-pointer transition"
                    >
                      ✅ ተጠናቋል
                    </button>
                  )}

                  {req.status === "COMPLETED" && (
                    <button
                      onClick={() => deleteRequest(req.id)}
                      className="flex-1 py-2 bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white font-bold text-xs rounded-xl cursor-pointer transition"
                    >
                      🗑️ ከዝርዝር አጥፋ
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}