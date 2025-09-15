import * as duckdb from '@duckdb/duckdb-wasm'
import arrow from 'apache-arrow'
import z from 'zod'
import { CompanySchema, LineSchema, StationSchema } from './Schema'
import { buildDuckDbInstance } from './buildDuckDbInstance'
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
const parseArray = <T, U extends z.ZodType<T>>(result: arrow.Table<any>, schema: U): z.core.output<U> | null => {
  const record = parseArrowTableNested(result)
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

    listStation2: async () => {
      const result = await conn.query(`
        SELECT 
          station.station_g_cd, 
          ARRAY_AGG(DISTINCT station.station_name) AS station_names,
          ARRAY_AGG(station) AS stations
        FROM station
        GROUP BY station.station_g_cd
        `)
      // console.log({ result })
      // const z2 = parseArrowTableNested(result)

      const schema = z.array(z.object({
        station_g_cd: z.string().nullish(),
        station_names: z.array(z.string()).nullish(),
        stations: z.array(StationSchema).nullish()
      }))

      return parseArray(result, schema)
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
    },
    testNested: async () => {
      console.log("XXXXX")
      const result = await conn.query(`
        SELECT 
          1 AS v_int,
          1.2::FLOAT AS v_float,
          NULL AS v_null,
          {"a":2, "b":'c', "d":NULL} AS v_struct, 
          [1,2,3] AS v_list,
          ['abc','def'] AS v_str_list,
          map([1, 2], ['a', 'b']) AS v_map,
          DATE '1992-03-27' - INTERVAL 5 DAY AS v_date,
          TIME '12:34' AS v_time,
          'infinity'::DATE AS v_infinity,
          true AS v_boolean,
          { "a": { 
            "b":'c',
            "d": {
              "e": map([1,2],['a','b']) ,
              "f": DATE '1992-03-27' - INTERVAL 5 DAY,
              "g": {
                "h": false
              }
            }
          }} AS v_nested,
        `)
      console.log(result)
      const r = parseArrowTableNested(result)
      console.log("R", r[0])
      // console.log("R", r[0], JSON.stringify(r[0], null, 2))
      return r
    },
  }
}

type Database = Awaited<ReturnType<typeof database>>
export type DatabaseResponse<T extends keyof Database> = Awaited<ReturnType<Database[T]>>
export type StationResult = DatabaseResponse<"searchAny">
