"use client"
import useSWR from "swr"
import { useDatabase } from "../useDatabase"
import { Box, Table } from "@mantine/core"
import { database } from "../database"

const StationGroupPage = () => {
  const stationGroup = useSWR(["stationGroup"], async () => {
    const db = await database()
    console.log({ db })
    const data = await db?.listStation()
    const data2 = await db.testNested()
    return data
  })
  console.log({ stationGroup })
  return <Box>
    <Table>
      <Table.Tbody>
        {stationGroup.data?.map((group, index) => (
          <Table.Tr key={index}>
            <Table.Td>{group.station_g_cd}</Table.Td>
            <Table.Td>{group.stations?.map(s => s.station_name).join(", ")}</Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  </Box>
}
export default StationGroupPage