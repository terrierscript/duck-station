import * as duckdb from '@duckdb/duckdb-wasm'
import { compressTextToGzip } from './compress'
import arrow from 'apache-arrow'
import z from 'zod'
import { CompanySchema, LineSchema, StationSchema } from './Schema'
import traverse from 'traverse'
import { buildDuckDbInstance } from './buildDuckDbInstance'
import superjson from "superjson"
import { parseArrowTableSimple, parseArrowTableNested } from './parseRecord'

const parseResult = <T, U extends z.ZodType<T>>(result: arrow.Table<any>, schema: U): z.core.output<U> | null => {
  const record = parseArrowTableSimple(result)
  const parsedRecord = schema.safeParse(record)
  if (parsedRecord.success === false) {
    console.warn(z.treeifyError(parsedRecord.error))
    console.warn(z.flattenError(parsedRecord.error))
    // console.warn(z.prettifyError(parsedRecord.error))
    return null
  }
  const data: z.core.output<U> = parsedRecord.data
  return data
}

const host = "http://localhost:3001"
const dataset = [
  { table: "company", url: `${host}/station/company.csv` },
  { table: "line_join", url: `${host}/station/line_join.csv` },
  { table: "line", url: `${host}/station/line.csv` },
  { table: "station", url: `${host}/station/station.csv` },
]

const createTableQuery = (table: string, url: string) => {
  return `CREATE OR REPLACE TABLE ${table} AS SELECT * FROM read_csv('${url}', all_varchar=true);`
}

export const database = async () => {
  const db = await buildDuckDbInstance()
  const conn = await db.connect()

  const debugDump = async () => {
    // schema作るのに便利
    for (const { table, url } of dataset) {
      console.log(createTableQuery(table, url))
    }
    for (const { table, url } of dataset) {
      const sample = await conn.query(`SELECT * FROM ${table} LIMIT 1;`)
      console.log(table, JSON.stringify(Object.keys(parseArrowTableSimple(sample)[0])))
    }

  }
  const showTables = async () => {
    const list = await conn.query(`SHOW TABLES;`)

    return list.toArray().map(t => t.toJSON()).map(t => t.name)
  }

  const createTable = async (table: string, url: string) => {
    console.log(`Create table ${table}`)
    const filename = `${table}.csv`

    await db.registerFileURL(filename, url, duckdb.DuckDBDataProtocol.HTTP, false)
    await conn.query(createTableQuery(table, url))

  }

  const loadAllData = async () => {
    const existTable = await showTables()
    for (const { table, url } of dataset) {
      if (existTable.includes(table)) continue
      await createTable(table, url)
    }
  }

  await loadAllData()

  return {
    listCompany: async () => {
      const result = await conn.query(`
        SELECT line, company 
        FROM line
        LEFT JOIN company ON line.company_cd = company.company_cd
      `)
      const record = parseArrowTableSimple(result)
      const schema = z.array(z.object({
        line: LineSchema,
        company: CompanySchema
      }))
      const parsed = schema.safeParse(record)
      return parsed.success ? parsed.data : []
    },
    listStation: async () => {
      const result = await conn.query(`
        SELECT 
          station.station_g_cd, 
          ARRAY_AGG(station) AS stations
        FROM station
        GROUP BY station.station_g_cd
      `)

      const schema = z.array(z.object({
        station_g_cd: z.string().nullish(),
        stations: z.array(StationSchema).nullish()
      }))
      return parseResult(result, schema)
    },
    testNested: async () => {
      console.log("XXXXX")
      const result = await conn.query(`
        SELECT 
          1 AS v_int,
          1.2 AS v_float,
          NULL AS v_null,
          {"a":2, "b":'c', "d":NULL} AS v_struct, 
          [1,2,3] AS v_list,
          map([1, 2], ['a', 'b']) AS v_map,
          {"a": { 
            "b":'c',
            "d": { "e": map([1,2],['a','b']) }
          }} AS v_nested
        `)

      const r = parseArrowTableNested(result)
      console.log("R", r[0])
      return r
    },
    listStation2: async () => {
      const result = await conn.query(`
        SELECT 
          station.station_g_cd, 
          histogram(station.station_name) AS station_names,
          ARRAY_AGG(station) AS stations
        FROM station
        GROUP BY station.station_g_cd
      `)
      console.log({ result })
      const z2 = parseArrowTableNested(result)
      console.log(z2)
      const zz = result.toArray().map((t: any) => {
        const { station_names, ...rr } = t.toJSON()
        const ss = station_names.toJSON()
        return {
          ...rr,
          station_names: ss
        }
      })
      console.log({ zz })
      // console.log({ result })
      // const records = result.toArray().map(t => {
      //   const rr = Object.entries(t.toJSON()).map(([key, value]) => {
      //     return [key, superjson.serialize(value)]
      //   })

      //   const ss = rr["station_names"]
      //   console.log("rs", rr)
      //   console.log("sj", superjson.serialize(rr))
      //   // console.log("rs", ss, ss.constructor.name)
      //   return rr
      // })

      console.log({ records })

      return records
    },
    lineConnection: async (stationCd: string) => {
      const result = await conn.query(`
        SELECT s1, l1, l2, s2
        FROM station AS s1
        LEFT JOIN line_join AS l1 ON l1.station_cd1 = s1.station_cd
        LEFT JOIN line_join AS l2 ON l2.station_cd1 = s1.station_cd
        LEFT JOIN station AS s2 ON l2.station_cd2 = s2.station_cd
        WHERE s1.station_cd = ${stationCd}
        `)
      // LEFT JOIN station AS s2 ON l1.station_cd2 = s2.station_cd
      const record = parseArrowTableSimple(result)
      console.log(record)
      return record
      // return parsed.success ? parsed.data : []
    },
    searchStation: async (query: string) => {
      const result = await conn.query(`
        SELECT station
        FROM station
        WHERE station_name LIKE '%${query}%'
      `)
      // LEFT JOIN station AS s2 ON l1.station_cd2 = s2.station_cd
      const record = parseArrowTableSimple(result)
      const schema = z.array(z.object({
        station: StationSchema
      }))
      const parsed = schema.safeParse(record)
      return parsed.success ? parsed.data.map(s => s.station) : []
    },
    companyLineStationTree: async () => {
      const result = await conn.query(`
        WITH station_line AS (
          SELECT 
            ANY_VALUE(line) AS line, 
            ARRAY_AGG(station) AS station
          FROM station LEFT JOIN line ON station.line_cd = line.line_cd
          GROUP BY line.line_cd
        )
        SELECT 
          ANY_VALUE(company) AS company, 
          ARRAY_AGG(station_line) AS station_line
        FROM company LEFT JOIN station_line ON company.company_cd = station_line.line.company_cd
        GROUP BY company.company_cd
      `)
      const record = parseArrowTableSimple(result)
      const schema = z.array(z.object({
        company: CompanySchema,
        station_line: z.array(z.object({
          line: LineSchema.nullish(),
          station: z.array(StationSchema).nullish()
        }))
      }))
      const parsed = schema.safeParse(record)
      // console.log({ record, parsed })
      // parsed.error && console.log(z.treeifyError(parsed.error))

      return parsed.success ? parsed.data : []
    }
  }
}

type Database = Awaited<ReturnType<typeof database>>
export type DatabaseResponse<T extends keyof Database> = Awaited<ReturnType<Database[T]>>
export type StationResult = DatabaseResponse<"searchAny">
