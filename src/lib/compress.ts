export const compressTextToGzip = async (str: string) => {
  const encoder = new TextEncoder()
  const cs = new CompressionStream("gzip")
  const buf = encoder.encode(str)
  const stream = new Response(buf).body!.pipeThrough(cs)
  return new Response(stream).arrayBuffer()


}