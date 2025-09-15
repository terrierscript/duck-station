"use client"
import useSWR from "swr"
import { useDatabase } from "../useDatabase"
import { Box, Table } from "@mantine/core"
import { database } from "../database"

const StationGroupPage = () => {
  const stationGroup = useSWR(["stationGroup"], async () => {
    const db = await database()
    const data = await db?.listStation2()
    const tn = await db?.testNested()
    console.log({ tn })
    return data
  })
  return <Box>
    <Table>
      <Table.Tbody>
        {stationGroup.data?.map((group, index) => (
          <Table.Tr key={index}>
            <Table.Td>{group.station_g_cd}</Table.Td>
            <Table.Td>{group.station_names?.join(",")}</Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  </Box>
}
export default StationGroupPage