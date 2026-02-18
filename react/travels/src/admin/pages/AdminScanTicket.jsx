import React, { useEffect, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import api from "../../api/api";

const AdminScanTicket = () => {
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [startScan, setStartScan] = useState(false);  

  useEffect(() => {
    if (!startScan) return;                            

    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: 250 },
      false
    );

    scanner.render(
      async (decodedText) => {
        try {
        
          const res = await api.get(
            decodedText.replace("http://localhost:8000", "")
          );
          setResult(res.data);
          setError(null);
          scanner.clear();
        } catch (err) {
          setError("Invalid or expired ticket");
        }
      },
      (err) => {
        console.warn(err);
      }
    );

    return () => {
      scanner.clear().catch(() => {});
    };
  }, [startScan]);                                      

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

      {startScan && <div id="qr-reader" className="max-w-sm mx-auto" />}

      {result && (
        <div className="mt-6 p-4 rounded-xl bg-green-500/10 border border-green-500/30">
          <p className="text-green-300 font-semibold">✅ Valid Ticket</p>
          <p>User: {result.passenger}</p>
          <p>Journey Date: {result.journey_date}</p>
          <p>Bus: {result.bus}</p>
          <p>Seat: {result.seat}</p>
          <p>Route: {result.route}</p>
        </div>
      )}

      {error && (
        <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
          <p className="text-red-400">❌ {error}</p>
        </div>
      )}
    </div>
  );
};

export default AdminScanTicket;
