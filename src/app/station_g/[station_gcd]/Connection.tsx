"use client"
import { Box, Button, Loader } from "@mantine/core"
import { useState, type FC } from "react"
import useSWR from "swr"
import { useDatabase } from "../../useDatabase"

const ConnectionInternal: FC<{ station_gcd: string }> = ({ station_gcd }) => {
  const db = useDatabase()
  const { data, isLoading } = useSWR(["station_g", db, station_gcd], async () => {
    return await db?.lineConnection2(station_gcd)
  })
  if (isLoading) return <Loader />
  console.log(station_gcd, data)

  return <Box>
    {data?.map((d, i) => {
      if (!d.station || !d.line || !d.station.station_g_cd) return null
      return <Box key={d.station.station_cd}>
        {d.station.station_name}
        <Connection station_gcd={d.station.station_g_cd} station_names={[d.station.station_name!]} />
      </Box>
    })}
  </Box>

}

export const Connection: FC<{ station_gcd: string; station_names: string[] }> = ({ station_gcd, station_names }) => {
  const [expand, setExpand] = useState(false)
  return (
    <Box px={10}>
      <Box>{station_gcd}:{station_names}</Box>
      <Button onClick={() => setExpand(!expand)}>
        {expand ? "Collapse" : "Expand"}
      </Button>
      {expand && (
        <ConnectionInternal station_gcd={station_gcd} />
      )}
    </Box>
  )
}