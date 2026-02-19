import React, { useEffect, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import api from "../../api/api";

const AdminScanTicket = () => {
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [startScan, setStartScan] = useState(false);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    if (!startScan) return;

    const el = document.getElementById("qr-reader");
    if (!el) return;

    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    scanner.render(
      async (decodedText) => {
        try {
          const apiPath = decodedText.replace("http://localhost:8000", "");
          const res = await api.get(apiPath);

          setResult(res.data);
          setError(null);

          scanner.clear();
        } catch (err) {
          const msg =
            err?.response?.data?.message ||
            err?.response?.data?.error ||
            "Invalid ticket";

          setError(msg);
          setResult(null);
        }
      },
      (err) => {
        console.warn("Scan error:", err);
      }
    );

    return () => {
      scanner.clear().catch(() => {});
    };
  }, [startScan]);

  const handleMarkUsed = async () => {
    if (!result?.ticket_id) return;

    try {
      setMarking(true);
      await api.post(`/api/tickets/mark-used/${result.ticket_id}/`);
      setResult((prev) => ({ ...prev, status: "USED" }));
      setError(null);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Failed to mark ticket as USED";

      setError(msg);
    } finally {
      setMarking(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];
  const isDateMismatch = result?.journey_date !== today;

  return (
    <div className="p-6 text-white">
      <h2 className="text-xl font-semibold mb-4">Scan Ticket QR</h2>

      {!startScan && (
        <button
          onClick={() => setStartScan(true)}
          className="mb-4 rounded-xl bg-gradient-to-r from-cyan-400 to-purple-600 px-4 py-2 font-semibold text-black"
        >
          Start Camera Scan
        </button>
      )}

      {startScan && (
        <>
          <p className="text-xs text-gray-400 mb-2 text-center">
            Allow camera permission when prompted
          </p>
          <div id="qr-reader" className="max-w-sm mx-auto" />
        </>
      )}

      {result && (
        <div className="mt-6 p-4 rounded-xl bg-green-500/10 border border-green-500/30 space-y-2">
          <p className="text-green-300 font-semibold">Valid Ticket</p>
          <p>User: {result.passenger}</p>
          <p>Bus: {result.bus}</p>
          <p>Seat: {result.seat}</p>
          <p>Route: {result.route}</p>
          <p>Journey Date: {result.journey_date}</p>

          <p>
            Status:{" "}
            <span
              className={
                result.status === "USED" ? "text-red-400" : "text-cyan-300"
              }
            >
              {result.status}
            </span>
          </p>

          {isDateMismatch && (
            <p className="text-yellow-400 text-sm">
              Journey date does not match today
            </p>
          )}

          {result.status !== "USED" && (
            <button
              onClick={handleMarkUsed}
              disabled={marking}
              className="mt-3 rounded-xl bg-red-500 px-4 py-2 text-black font-semibold disabled:opacity-60"
            >
              {marking ? "Marking..." : "Mark as USED"}
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
          <p className="text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
};

export default AdminScanTicket;
