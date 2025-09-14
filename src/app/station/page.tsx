"use client"

import { Box, Group, Input } from "@mantine/core"
import { useDeferredValue, useState, useTransition } from "react"
import useSWR from "swr"
import useSWRMutation from "swr/mutation"
import { useDatabase } from "../useDatabase"
import type { StationResult } from "../duckdb"

const Page = () => {
  const [q, setQuery] = useState("")
  const [result, setResult] = useState<StationResult>([])
  const [isPending, startTransaction] = useTransition()
  const db = useDatabase()
  const { data } = useSWR(["station", q], ([_, q]) => {
  })
  const deferredResult = useDeferredValue(data)

  return (
    <Box>
      <Input value={q} onChange={(e) => {
        const q = e.currentTarget.value
        setQuery(q)
        startTransaction(async () => {
          const result = await db?.searchAny(q)
          setResult(result ?? [])
        })
      }} placeholder="Search..." />

      <Box>Query:{q}</Box>
      {isPending ? (
        <Box>Loading...</Box>
      ) : (
        result?.map((station, i) => (
          <Group key={i}>

            <Box>
              {station.station_cd}:
            </Box>
            <Box>
              {station.station_name}
            </Box>
            <Box>
              {station.post}
            </Box>
          </Group>
        )
        ))}
    </Box>
  )
}
export default Page