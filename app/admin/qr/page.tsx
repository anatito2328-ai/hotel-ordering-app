"use client";

import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";

export default function QRGeneratorPage() {
  const [type, setType] = useState<"ROOM" | "TABLE">("ROOM");
  const [identifier, setIdentifier] = useState("101");
  const [baseUrl, setBaseUrl] = useState("");

  useEffect(() => {
    // አሁን ያለበትን URL በራሱ ያነባል (Localhost ወይም Vercel ሲሆን)
    if (typeof window !== "undefined") {
      setBaseUrl(window.location.origin);
    }
  }, []);

  const fullUrl = `${baseUrl}/menu?source=${type}&id=${identifier}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col items-center">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-6 rounded-3xl print:border-none print:bg-white print:text-black">
        <h1 className="text-xl font-black text-amber-500 mb-1 print:text-black text-center">የQR ኮድ ማመንጫ</h1>
        <p className="text-xs text-slate-400 mb-6 text-center print:hidden">ለክፍሎች ወይም ለጠረጴዛዎች የሚለጠፍ QR ማዘጋጃ</p>

        {/* የማስተካከያ ክፍል (ፕሪንት ሲደረግ አይታይም) */}
        <div className="space-y-4 print:hidden">
          <div>
            <label className="text-xs text-slate-400 font-bold">የአገልግሎት አይነት</label>
            <div className="flex gap-2 mt-1">
              <button
                onClick={() => setType("ROOM")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${
                  type === "ROOM" ? "bg-amber-500 text-slate-950 border-amber-500" : "bg-slate-800 border-slate-700 text-slate-300"
                }`}
              >
                የክፍል አገልግሎት (Room)
              </button>
              <button
                onClick={() => setType("TABLE")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${
                  type === "TABLE" ? "bg-amber-500 text-slate-950 border-amber-500" : "bg-slate-800 border-slate-700 text-slate-300"
                }`}
              >
                ጠረጴዛ / ወንበር (Table)
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 font-bold">
              {type === "ROOM" ? "የክፍል ቁጥር (Room No)" : "የጠረጴዛ ቁጥር (Table No)"}
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="ምሳሌ፡ 102 ወይም T-05"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 mt-1 outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* ፕሪንት የሚደረገው ካርድ */}
        <div className="mt-8 bg-white p-6 rounded-2xl flex flex-col items-center justify-center text-center shadow-xl">
          <p className="text-slate-900 font-black text-base mb-1">ግራንድ ሆቴል</p>
          <p className="text-slate-600 font-bold text-xs mb-4">
            {type === "ROOM" ? `ክፍል ቁጥር: ${identifier}` : `ጠረጴዛ ቁጥር: ${identifier}`}
          </p>

          <div className="bg-white p-2 border-2 border-slate-900 rounded-xl">
            {baseUrl && (
              <QRCodeSVG
                value={fullUrl}
                size={180}
                level="H"
                includeMargin={true}
              />
            )}
          </div>

          <p className="text-[11px] text-slate-500 font-bold mt-4">ካሜራዎን በማንበብ በቀላሉ ይዘዙ</p>
        </div>

        {/* ማተሚያ ቁልፍ */}
        <button
          onClick={handlePrint}
          className="w-full mt-6 bg-amber-500 text-slate-950 font-black py-3 rounded-xl text-xs hover:bg-amber-400 transition print:hidden"
        >
          ፕሪንት አድርግ (Print QR) 🖨️
        </button>
      </div>
    </div>
  );
}