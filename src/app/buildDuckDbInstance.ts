import * as duckdb from '@duckdb/duckdb-wasm'

export const buildDuckDbInstance = async () => {
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

  // try {
  //   const file = `opfs://train.db`
  //   await db.open({
  //     path: file,
  //     accessMode: duckdb.DuckDBAccessMode.READ_WRITE
  //   })
  // } catch (e) {
  //   await db.open({
  //     path: ":memory:"
  //   })
  // }
  return db
}
