import React, { useEffect, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import api from "../../api/api";

const STATUS_UI = {
  VALID: {
    title: "Valid Ticket",
    color: "text-green-300",
    box: "bg-green-500/10 border-green-500/30",
    note: null,
    canUse: true,
  },
  USED: {
    title: "Ticket Already Used",
    color: "text-red-300",
    box: "bg-red-500/10 border-red-500/30",
    note: "This ticket has already been used and cannot be reused.",
    canUse: false,
  },
  REFUNDED: {
    title: "Ticket Refunded",
    color: "text-orange-300",
    box: "bg-orange-500/10 border-orange-500/30",
    note: "This ticket was refunded and is no longer valid.",
    canUse: false,
  },
  EXPIRED_PAST: {
    title: "Ticket Expired",
    color: "text-yellow-300",
    box: "bg-yellow-500/10 border-yellow-500/30",
    note: "Journey date is in the past.",
    canUse: false,
  },
  EXPIRED_DEPARTED: {
    title: "Bus Already Departed",
    color: "text-yellow-300",
    box: "bg-yellow-500/10 border-yellow-500/30",
    note: "The bus for this ticket has already departed.",
    canUse: false,
  },
  NOT_FOUND: {
    title: "Invalid Ticket",
    color: "text-red-300",
    box: "bg-red-500/10 border-red-500/30",
    note: "Ticket not found.",
    canUse: false,
  },
  ERROR: {
    title: "Invalid Ticket",
    color: "text-red-300",
    box: "bg-red-500/10 border-red-500/30",
    note: "Unable to verify ticket.",
    canUse: false,
  },
};

const mapBackendMessageToStatus = (msg = "") => {
  const m = msg.toLowerCase();
  if (m.includes("already used")) return "USED";
  if (m.includes("refunded")) return "REFUNDED";
  if (m.includes("past date")) return "EXPIRED_PAST";
  if (m.includes("already departed")) return "EXPIRED_DEPARTED";
  if (m.includes("not found")) return "NOT_FOUND";
  return "ERROR";
};

const AdminScanTicket = () => {
  const [result, setResult] = useState(null);
  const [statusKey, setStatusKey] = useState(null);
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
          setStatusKey("VALID");

          scanner.clear();
        } catch (err) {
          const msg =
            err?.response?.data?.message ||
            err?.response?.data?.error ||
            "Invalid ticket";

          const mapped = mapBackendMessageToStatus(msg);

          setResult({ message: msg });
          setStatusKey(mapped);
        }
      },
      (err) => console.warn("Scan error:", err)
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
      setStatusKey("USED");
      setResult((prev) => ({ ...prev, status: "USED" }));
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Failed to mark ticket as USED";
      setStatusKey("ERROR");
      setResult({ message: msg });
    } finally {
      setMarking(false);
    }
  };

  const ui = STATUS_UI[statusKey];

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

      {ui && (
        <div className={`mt-6 p-4 rounded-xl border ${ui.box} space-y-2`}>
          <p className={`font-semibold ${ui.color}`}>{ui.title}</p>

          {statusKey === "VALID" && result && (
            <>
              <p>User: {result.passenger}</p>
              <p>Bus: {result.bus}</p>
              <p>Seat: {result.seat}</p>
              <p>Route: {result.route}</p>
              <p>Journey Date: {result.journey_date}</p>
              <p>Start Time: {result.start_time}</p>

              {ui.canUse && (
                <button
                  onClick={handleMarkUsed}
                  disabled={marking}
                  className="mt-3 rounded-xl bg-red-500 px-4 py-2 text-black font-semibold disabled:opacity-60"
                >
                  {marking ? "Marking..." : "Mark as USED"}
                </button>
              )}
            </>
          )}

          {ui.note && (
            <p className="text-sm text-gray-300">
              {ui.note}
            </p>
          )}

          {statusKey !== "VALID" && result?.message && (
            <p className="text-sm text-gray-300">
              {result.message}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminScanTicket;