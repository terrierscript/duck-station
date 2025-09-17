const copyOpfsFile = async (opfsSourcePath: string, opfsDestPath: string) => {
  const sourcePath = opfsSourcePath.replace("opfs://", "")
  const destPath = opfsDestPath.replace("opfs://", "")
  const root = await window.navigator.storage.getDirectory()
  const sourceFile = await root.getFileHandle(sourcePath)
  const destFile = (await root.getFileHandle(destPath, { create: true }))
  const sourceBlob = await (await sourceFile.getFile()).arrayBuffer()
  const writable = await destFile.createWritable()
  await writable.write(sourceBlob)
  await writable.close()
}
