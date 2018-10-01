const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const os = require('os')
const archiver = require('archiver')
const { readFile } = require('@serverless/utils')

async function pack(packagePath, tempPath) {
  tempPath = tempPath || os.tmpdir()

  let outputFileName = crypto.randomBytes(3).toString('hex')
  outputFileName = `${String(Date.now())}-${outputFileName}.zip`
  const outputFilePath = path.join(tempPath, outputFileName)

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputFilePath)
    const archive = archiver('zip', {
      zlib: { level: 9 }
    })

    output.on('open', () => {
      archive.pipe(output)
      archive.directory(packagePath, false)
      archive.finalize()
    })
    archive.on('error', (err) => reject(err))
    output.on('close', async () => {
      try {
        const zipContents = await readFile(outputFilePath)
        const outputFileHash = crypto
          .createHash('sha256')
          .update(zipContents)
          .digest('base64')
        resolve({
          fileName: outputFileName,
          filePath: outputFilePath,
          hash: outputFileHash
        })
      } catch (e) {
        reject(e)
      }
    })
  })
}

module.exports = pack
