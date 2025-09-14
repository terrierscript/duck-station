"use client"
import type { FC } from "react"
import useSWR from "swr"
import { database } from "../../database"

export const Station: FC<{ station_cd: string }> = ({ station_cd }) => {
  const r = useSWR(["station", station_cd], async () => {
    const { lineConnection } = await database()
    return lineConnection(station_cd)
  })
  return (
    <div>
      <h1>Station Page</h1>
    </div>
  )
}