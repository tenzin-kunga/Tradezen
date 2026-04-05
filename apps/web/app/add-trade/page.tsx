"use client";

import { useState } from "react";
import { createTrade } from "@/lib/api";

export default function AddTrade() {
  const [form, setForm] = useState<any>({});

  const submit = async () => {
    await createTrade(form);
    alert("Saved!");
  };

  return (
    <div>
      <input placeholder="Symbol" onChange={e=>setForm({...form,symbol:e.target.value})}/>
      <input placeholder="Entry" onChange={e=>setForm({...form,entry:+e.target.value})}/>
      <input placeholder="Exit" onChange={e=>setForm({...form,exit:+e.target.value})}/>
      <input placeholder="Lot" onChange={e=>setForm({...form,lot:+e.target.value})}/>

      <select onChange={e=>setForm({...form,direction:e.target.value})}>
        <option value="buy">Buy</option>
        <option value="sell">Sell</option>
      </select>

      <button onClick={submit}>Save</button>
    </div>
  );
}
