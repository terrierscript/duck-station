import type arrow from 'apache-arrow'

export const parseArrowTableSimple = (record: arrow.Table) => {
  const records = record.toArray().map(t => {
    return t.toJSON()
  })
  return JSON.parse(JSON.stringify(records))
}

const parseValue = (val: any) => {
  if (typeof val === "bigint") {
    return Number(val)
  }
  return val
}

const parseObject = (obj: arrow.StructRow) => {
  const entries: any[] = Object.entries(obj).map(([key, val]: [string, any]) => {

    if (typeof val?.toJSON === "function") {
      return [key, parseObject(val.toJSON())]
    }
    if (typeof val?.toArray === "function") {
      return [key, parseArrowTableNested(val)]
    }
    return [key, parseValue(val)]
  })
  return Object.fromEntries(entries)

}

export const parseArrowTableNested = (record: arrow.Table) => {
  const converted = record.toArray().map(t => {
    const value = t.toJSON()
    return parseObject(value)
  })
  return JSON.parse(JSON.stringify(converted))
}
