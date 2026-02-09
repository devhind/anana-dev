import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  try {
    const result = await sql`SELECT 1`;
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
