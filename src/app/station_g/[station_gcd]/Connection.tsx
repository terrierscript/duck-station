"use client"
import { Box } from "@mantine/core"
import type { FC } from "react"
import useSWR from "swr"
import { useDatabase } from "../../useDatabase"

export const Connection: FC<{ station_gcd: string }> = ({ station_gcd }) => {
  const db = useDatabase()
  const { data } = useSWR(["station_g", db, station_gcd], async () => {
    const data = await db?.lineConnection(station_gcd)
    return data
  })
  console.log({ data })
  return (
    <Box>
      {data?.map((d, i) => {
        return <Box key={i}>{d.s2.station_name}</Box>
      })}
    </Box>
  )
}