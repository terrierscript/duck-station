"use client"
import useSWRImmutable from "swr/immutable"
import { useDatabase } from "../useDatabase"
import { Box, Tree, type TreeNodeData } from "@mantine/core"

const Page = () => {
  const database = useDatabase()
  const companyLiens = useSWRImmutable(["r", database], () => {
    return database?.companyLines()
  })
  console.log(companyLiens.data)
  const treeData: TreeNodeData[] = companyLiens.data?.map(c => {
    return {
      value: c.company.company_cd!,
      label: c.company.company_name,
      children: c.station_line?.map(sl => ({
        label: sl.line?.line_name,
        value: sl.line?.line_cd!,
        children: sl.station?.map(s => ({
          label: s.station_name,
          value: s.station_cd!
        }))
      }))
    } satisfies TreeNodeData
  }) || []
  // console.log(r.data)

  return <Box>
    <Tree data={treeData}>

    </Tree>
  </Box>
}
export default Page