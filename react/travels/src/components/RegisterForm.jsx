import React, { useState } from "react";
import axios from "axios";

const RegisterForm = () => {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        "http://localhost:8000/api/register/",
        form
      );
      setMessage("Registration successful");
    } catch (err) {
      setMessage("Registration failed");
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-10 p-5 border rounded">
      <h2 className="text-center font-semibold mb-4">
        Create Account
      </h2>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          placeholder="Username"
          className="w-full border px-2 py-1 rounded"
          onChange={(e) =>
            setForm({ ...form, username: e.target.value })
          }
        />
        <input
          placeholder="Email"
          className="w-full border px-2 py-1 rounded"
          onChange={(e) =>
            setForm({ ...form, email: e.target.value })
          }
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full border px-2 py-1 rounded"
          onChange={(e) =>
            setForm({ ...form, password: e.target.value })
          }
        />

        <button className="w-full bg-black text-white py-1 rounded">
          Register
        </button>

        {message && (
          <p className="text-center text-sm">{message}</p>
        )}
      </form>
    </div>
  );
};

export default RegisterForm;
