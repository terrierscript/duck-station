import useSWRImmutable from "swr/immutable"
import { database } from "./database"

export const useDatabase = () => {
  const data = useSWRImmutable("database", async () => {
    const host = window.location.origin
    console.log({ host })
    const db = await database(host)
    return db
  })
  return data.data
}