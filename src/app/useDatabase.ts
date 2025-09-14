import useSWRImmutable from "swr/immutable"
import { database } from "./duckdb"

export const useDatabase = () => {
  const data = useSWRImmutable("database", async () => {
    const db = await database()
    return db
  })
  return data.data
}