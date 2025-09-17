"use client"

import { Box, Group, Input } from "@mantine/core"
import { useDeferredValue, useState, useTransition } from "react"
import useSWR from "swr"
import useSWRMutation from "swr/mutation"
import { useDatabase } from "../useDatabase"
import type { DatabaseResponse } from "../../lib/database"
import Link from "next/link"

const Page = () => {
  const [q, setQuery] = useState("")
  const [result, setResult] = useState<DatabaseResponse<"searchStation">>([])
  const [isPending, startTransaction] = useTransition()
  const db = useDatabase()
  const { data } = useSWR(["station", db, q], () => {
    return db?.searchStation(q)
  })
  const deferredResult = useDeferredValue(data)

  return (
    <Box>
      <Group>

        <Input value={q} onChange={(e) => {
          const q = e.currentTarget.value
          setQuery(q)
          startTransaction(async () => {
            const result = await db?.searchStation(q)
            setResult(result ?? [])
          })
        }} placeholder="Search..." />
        <Box>Query:{q}</Box>
      </Group>
      {isPending ? (
        <Box>Loading...</Box>
      ) : (
        result?.map(({ station }, i) => (
          <Group key={i}>

            <Box>
              {station.station_cd}:
            </Box>
            <Box>
              <Link href={`/station_gg/${station.station_g_cd}`}>
                {station.station_g_cd}
              </Link>
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