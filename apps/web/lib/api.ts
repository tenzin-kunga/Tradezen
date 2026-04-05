const API = "http://localhost:3001";

export const createTrade = async (data: any) => {
  const res = await fetch(`${API}/trades`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(data),
  });
  return res.json();
};

export const getTrades = async () => {
  const res = await fetch(`${API}/trades`);
  return res.json();
};
