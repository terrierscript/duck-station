"use client"
import type { FC } from "react"
import useSWR from "swr"
import { database } from "../../database"
import { useDatabase } from "../../useDatabase"

export const Station: FC<{ station_cd: string }> = ({ station_cd }) => {
  const database = useDatabase()
  const r = useSWR(["station", database, station_cd], async () => {
    if (!database) return
    return database.lineConnection(station_cd)
  })
  return (
    <div>
      <h1>Station Page</h1>
    </div>
  )
}