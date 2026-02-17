import { useEffect, useState } from "react";
import {
  fetchAdminBuses,
  createAdminBus,
  updateAdminBus,
  deleteAdminBus,
} from "../../api/adminBuses";

export default function ManageBuses() {
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editBus, setEditBus] = useState(null);
  const [imageFile, setImageFile] = useState(null);

  const [form, setForm] = useState({
    bus_name: "",
    number: "",
    origin: "",
    destination: "",
    features: "",
    start_time: "",
    reach_time: "",
    no_of_seats: "",
    price: "",
    is_active: true,
  });

  const loadBuses = async () => {
    setLoading(true);
    const res = await fetchAdminBuses();
    setBuses(res.data);
    setLoading(false);
  };

  useEffect(() => {
    loadBuses();
  }, []);

  const openAdd = () => {
    setEditBus(null);
    setImageFile(null);
    setForm({
      bus_name: "",
      number: "",
      origin: "",
      destination: "",
      features: "",
      start_time: "",
      reach_time: "",
      no_of_seats: "",
      price: "",
      is_active: true,
    });
    setOpen(true);
  };

  const openEdit = (bus) => {
    setEditBus(bus);
    setImageFile(null);
    setForm({
      bus_name: bus.bus_name || "",
      number: bus.number || "",
      origin: bus.origin || "",
      destination: bus.destination || "",
      features: bus.features || "",
      start_time: bus.start_time || "",
      reach_time: bus.reach_time || "",
      no_of_seats: bus.no_of_seats || "",
      price: bus.price || "",
      is_active: !!bus.is_active,
    });
    setOpen(true);
  };

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSave = async (e) => {
    e.preventDefault();

    const fd = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (typeof value === "boolean") {
        fd.append(key, value ? "true" : "false");
      } else {
        fd.append(key, value);
      }
    });

    if (imageFile) fd.append("image", imageFile);

    if (editBus) {
      await updateAdminBus(editBus.id, fd);
    } else {
      await createAdminBus(fd);
    }

    setOpen(false);
    setImageFile(null);
    loadBuses();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this bus?")) return;
    await deleteAdminBus(id);
    loadBuses();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Manage Buses</h1>
          <p className="text-sm text-gray-400">
            Add, edit, activate/deactivate buses
          </p>
        </div>
        <button
          onClick={openAdd}
          className="rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 px-4 py-2 font-medium text-black shadow hover:shadow-cyan-500/30 transition"
        >
          + Add Bus
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
        {loading ? (
          <div className="p-6 text-gray-300">Loading buses...</div>
        ) : buses.length === 0 ? (
          <div className="p-6 text-gray-400">No buses added yet</div>
        ) : (
          <table className="w-full text-left text-sm text-gray-200">
            <thead className="bg-white/5 text-xs uppercase tracking-wider text-gray-400">
              <tr>
                <th className="px-4 py-3">Image</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Route</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {buses.map((b) => (
                <tr
                  key={b.id}
                  className="border-t border-white/10 hover:bg-white/5"
                >
                  <td className="px-4 py-3">
                    {b.image ? (
                      <img
                        src={`http://localhost:8000${b.image}`}
                        alt={b.bus_name}
                        className="h-10 w-16 rounded object-cover"
                      />
                    ) : (
                      <span className="text-gray-500">No image</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-white">
                    {b.bus_name}
                  </td>
                  <td className="px-4 py-3">
                    {b.origin} → {b.destination}
                  </td>
                  <td className="px-4 py-3">
                    {b.start_time} – {b.reach_time}
                  </td>
                  <td className="px-4 py-3 font-semibold">₹{b.price}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        b.is_active
                          ? "bg-green-500/20 text-green-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {b.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-3">
                    <button
                      onClick={() => openEdit(b)}
                      className="text-cyan-300 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(b.id)}
                      className="text-red-400 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <form
            onSubmit={handleSave}
            className="w-full max-w-md space-y-4 rounded-2xl border border-white/10 bg-gradient-to-br from-black via-gray-900 to-black p-6 shadow-2xl"
          >
            <h2 className="text-lg font-semibold text-white">
              {editBus ? "Edit Bus" : "Add Bus"}
            </h2>

            <input
              name="bus_name"
              value={form.bus_name}
              onChange={handleChange}
              placeholder="Bus name"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white"
              required
            />

            <input
              name="number"
              value={form.number}
              onChange={handleChange}
              placeholder="Bus number"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white"
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <input
                name="origin"
                value={form.origin}
                onChange={handleChange}
                placeholder="Origin"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white"
                required
              />
              <input
                name="destination"
                value={form.destination}
                onChange={handleChange}
                placeholder="Destination"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white"
                required
              />
            </div>

            <input
              name="features"
              value={form.features}
              onChange={handleChange}
              placeholder="Features (AC, Sleeper...)"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white"
            />

            <div className="grid grid-cols-2 gap-3">
              <input
                type="time"
                name="start_time"
                value={form.start_time}
                onChange={handleChange}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white"
                required
              />
              <input
                type="time"
                name="reach_time"
                value={form.reach_time}
                onChange={handleChange}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                name="no_of_seats"
                value={form.no_of_seats}
                onChange={handleChange}
                placeholder="Seats"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white"
                required
              />
              <input
                type="number"
                name="price"
                value={form.price}
                onChange={handleChange}
                placeholder="Price"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white"
                required
              />
            </div>

            {/* Image upload */}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files[0])}
              className="w-full text-sm text-gray-300"
            />

            {imageFile && (
              <img
                src={URL.createObjectURL(imageFile)}
                alt="preview"
                className="mt-2 h-24 w-full rounded-lg object-cover"
              />
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-1.5 text-gray-300 hover:bg-white/10"
              >
                Cancel
              </button>
              <button className="rounded-lg bg-gradient-to-r from-cyan-500 to-purple-600 px-4 py-1.5 font-medium text-black">
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
