import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-amber-400">
            የሆቴል ዲጂታል ማዘዣ ሲስተም
          </h1>
          <p className="text-slate-400 text-sm">
            መግባት የሚፈልጉትን ክፍል ከታች ይምረጡ
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <Link
            href="/menu?source=ROOM&id=101"
            className="w-full py-3.5 px-5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition"
          >
            🍽️ የእንግዶች ሜኑ (Customer Menu)
          </Link>

          <Link
            href="/kitchen"
            className="w-full py-3.5 px-5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition"
          >
            👨‍🍳 የኩሽና መቆጣጠሪያ (Kitchen KDS)
          </Link>

          <Link
            href="/qr"
            className="w-full py-3.5 px-5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl border border-slate-700 transition"
          >
            📱 QR ኮድ ማውጫ (QR Generator)
          </Link>
        </div>
      </div>
    </main>
  );
}