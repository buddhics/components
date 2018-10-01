const {
  checkProgress,
  createFunction,
  deleteFunction,
  generateUploadUrl,
  pack,
  patchFunction,
  uploadZipFile
} = require('./utils')

const GoogleCloudFunction = {
  construct(inputs) {
    this.provider = inputs.provider
    this.code = inputs.code
    // "official" Google Cloud Functions parameters
    this.functionName = inputs.name
    this.description = inputs.description
    this.runtime = inputs.runtime
    this.availableMemoryMb = inputs.availableMemoryMb
    this.timeout = inputs.timeout
    this.entryPoint = inputs.entryPoint
    this.environmentVariables = inputs.environmentVariables
    this.labels = inputs.labels
    this.maxInstances = inputs.maxInstances
    this.network = inputs.network
    this.sourceArchiveUrl = inputs.sourceArchiveUrl // not supported right now
    this.sourceRepository = inputs.sourceRepository // not supported right now
    this.sourceUploadUrl = inputs.sourceUploadUrl
    this.eventTrigger = inputs.eventTrigger
    this.httpsTrigger = inputs.httpsTrigger
  },

  async deploy(context) {
    // TODO: update this based on the state information
    const shouldCreate = true

    const { projectId, locationId } = this.provider
    const location = `projects/${projectId}/locations/${locationId}`
    const name = `projects/${projectId}/locations/${locationId}/functions/${this.functionName}`
    const packageResult = await pack(this.code)

    const generateUploadUrlResult = await generateUploadUrl(this.provider, location)
    // re-setting the sourceUploadUrl here
    this.sourceUploadUrl = generateUploadUrlResult.uploadUrl

    context.log('Uploading function artifacts...')

    await uploadZipFile(this.sourceUploadUrl, packageResult.filePath)

    const params = {
      name,
      description: this.description,
      runtime: this.runtime,
      availableMemoryMb: this.availableMemoryMb,
      timeout: this.timeout,
      entryPoint: this.entryPoint,
      environmentVariables: this.environmentVariables,
      labels: this.labels,
      maxInstances: this.maxInstances,
      network: this.network,
      sourceArchiveUrl: this.sourceArchiveUrl,
      sourceRepository: this.sourceRepository,
      sourceUploadUrl: this.sourceUploadUrl,
      eventTrigger: this.eventTrigger,
      httpsTrigger: this.httpsTrigger
    }

    let operation
    if (shouldCreate) {
      context.log(`Creating Google Cloud Function "${this.functionName}"...`)
      operation = await createFunction(this.provider, location, params)
    } else {
      context.log(`Updating Google Cloud Function "${this.functionName}"...`)
      operation = await patchFunction(this.provider, name, params)
    }

    context.log('Waiting on processing to finish (this might take a couple of seconds)...')
    await checkProgress(this.provider, operation.name)

    // TODO: save state information
    // TODO: return output

    context.log(`Function "${this.functionName}" successfully deployed...`)
  },

  async remove(context) {
    const { projectId, locationId } = this.provider
    const name = `projects/${projectId}/locations/${locationId}/functions/${this.functionName}`

    const operation = await deleteFunction(this.provider, name)

    context.log('Waiting on function removal process (this might take a couple of seconds)...')
    await checkProgress(this.provider, operation.name)

    // TODO: save state information
    // TODO: return output

    context.log(`Function "${this.functionName}" successfully removed...`)
  },

  getSinkConfig() {
    return {
      uri: this.functionName,
      protocol: 'GoogleCloudFunction'
    }
  }
}

module.exports = GoogleCloudFunction
