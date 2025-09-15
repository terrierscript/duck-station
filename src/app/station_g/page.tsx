"use client"
import useSWR from "swr"
import { useDatabase } from "../useDatabase"
import { Box, Button, Table } from "@mantine/core"
import { database } from "../database"
import { Connection } from "./[station_gcd]/Connection"

const StationGroupPage = () => {
  const stationGroup = useSWR(["stationGroup"], async () => {
    const db = await database()
    const data = await db?.listStation()
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
            <Table.Td>
              {group.station_g_cd
                && group.station_names
                && <Connection station_names={group.station_names} station_gcd={group.station_g_cd} />}
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  </Box>
}
export default StationGroupPage