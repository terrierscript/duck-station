"use client"
import { useEffect, useState, type FC } from "react"
import Graph from "graphology"
import { SigmaContainer, useLoadGraph, useRegisterEvents, useSetSettings } from "@react-sigma/core"
import "@react-sigma/core/lib/style.css"
import useSWR from "swr"
import { useDatabase } from "../../useDatabase"
import { useWorkerLayoutForceAtlas2 } from '@react-sigma/layout-forceatlas2'
import { useLayoutNoverlap } from "@react-sigma/layout-noverlap"
import { NodeBorderProgram } from "@sigma/node-border"

import type Sigma from "sigma"
import { useParams } from "next/navigation"
import { Box } from "@mantine/core"

const sigmaStyle = { height: "100vh", width: "100vw", backgroundColor: "#eee" }

const Fa2Layout = () => {
  const { start, kill } = useWorkerLayoutForceAtlas2({
    settings: {
      slowDown: 1000
    }
  })
  useEffect(() => {
    start()
    return () => {
      kill()
    }
  }, [start, kill])
  return null
}
// Component that load the graph
export const LoadGraph: FC<{ station_gcd: string, sigma: Sigma<NodeType, EdgeType> | null }> = ({ station_gcd, sigma }) => {
  const loadGraph = useLoadGraph()
  const registerEvents = useRegisterEvents()
  const { assign } = useLayoutNoverlap()
  const db = useDatabase()
  const setSettings = useSetSettings()
  // const { data, isLoading } = useSWR(["station_g", db, station_gcd], async () => {
  //   return await db?.lineConnection(station_gcd)
  // })

  useEffect(() => {
    if (!db) return
    if (!station_gcd) return
    if (!sigma) return
    const graph = new Graph()
    db.getStationByGcd(station_gcd).then(gcd => {
      const r = gcd?.[0]
      if (!r) return
      graph.addNode(r.station_g_cd, {
        x: 0, y: 0, size: 15,
        label: r.station_names?.join(",")
      })
      // graph.addNode("1130208_2", { x: 0, y: 0, size: 15, label: "新宿2" })
      // graph.addEdge("1130208", "1130208_2")
      loadGraph(graph)

    })
    setSettings({
      nodeProgramClasses: {
        circle: NodeBorderProgram
      }
    })

    registerEvents({
      clickNode: async (event) => {

        const node = graph.getNodeAttributes(event.node)
        if (node.opened) return
        console.log(">", node.label)
        // const nodes = db?.lineConnection(event.node)
        const conn = await db?.lineConnection2(event.node)
        graph.updateNodeAttributes(event.node, (val) => ({ ...val, borderColor: "black", opened: true }))
        conn?.map(connection => {
          const target = connection.station.station_g_cd
          const label = connection.station.station_name ?? "-"
          // 本当は開いたら色変えるとか
          const color = `#${connection.line.line_color_c ?? "ccc"}`
          if (!graph.hasNode(target)) {
            // console.log("skip node", target)
            graph.addNode(target, {
              label, x: 0, y: 0, size: 15, color,
              borderColor: color

            })
          }
          if (graph.hasEdge(event.node, target)) {
            graph.updateEdge(event.node, target)
          } else {
            graph.addEdge(event.node, target, { color })
          }
          loadGraph(graph)
          assign()
        })
      }
    })
  }, [station_gcd, db, loadGraph])
  return null
}

type NodeType = { x: number; y: number; label: string; size: number }
type EdgeType = { label: string }

// Component that display the graph
export const DisplayGraph: FC<{ station_gcd: string }> = ({ station_gcd }) => {
  const [sigma, setSigma] = useState<Sigma<NodeType, EdgeType> | null>(null)

  return (
    <Box bg="gray.4">
      <SigmaContainer style={sigmaStyle} ref={setSigma} >
        <LoadGraph station_gcd={station_gcd} sigma={sigma} />
        <Fa2Layout />
      </SigmaContainer>
    </Box>
  )
}
export default DisplayGraph