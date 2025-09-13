import * as duckdb from '@duckdb/duckdb-wasm'
import { compressTextToGzip } from './compress'

const buildDuckDbInstance = async () => {

  const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles()

  // Select a bundle based on browser checks
  const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES)

  const worker_url = URL.createObjectURL(
    new Blob([`importScripts("${bundle.mainWorker}");`], { type: 'text/javascript' })
  )

  // Instantiate the asynchronus version of DuckDB-Wasm
  const worker = new Worker(worker_url)
  const logger = new duckdb.ConsoleLogger()
  const db = new duckdb.AsyncDuckDB(logger, worker)
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker)
  URL.revokeObjectURL(worker_url)


  return db
}


export const opfsTest = async () => {
  console.log("start")
  const db = await buildDuckDbInstance()
  console.log("db")
  const opfsRoot = await navigator.storage.getDirectory()

  const csvFile = await fetch("/data.csv")
  const csvFileData = await csvFile.blob()
  const csvFileHandle = await opfsRoot.getFileHandle("data.csv", { create: true })
  const writable = await csvFileHandle.createWritable()
  await writable.write(csvFileData)
  await writable.close()

  const csGzvFile = await fetch("/data2.csv.gz")
  const gzFileHandle = await opfsRoot.getFileHandle("data2.csv.gz", { create: true })
  const gzFileData = await csGzvFile.blob()
  const writableGz = await gzFileHandle.createWritable()
  await writableGz.write(gzFileData)
  await writableGz.close()
  const conn = await db.connect()
  await db.registerOPFSFileName("opfs://data.csv")
  await db.registerOPFSFileName("opfs://data2.csv.gz")
  await new Promise(resolve => setTimeout(resolve, 1000))


  // const gzip = await compressTextToGzip(csvFile.blob().)

  const csvResult = await conn.query(`SELECT * FROM "opfs://data.csv"`)
  console.log(
    "csv", csvResult.toArray().map(t => t.toJSON()))
  // const csvGzResult = await conn.query(`SELECT * FROM "opfs://data.csv.gz"`)
  // console.log(
  //   "csv.gz", csvGzResult.toArray().map(t => t.toJSON())
  // )

}