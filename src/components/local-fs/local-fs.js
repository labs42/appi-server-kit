import fs from 'fs'
import path from 'path'
import mkdirp from 'mkdirp'
import { AppiError, validateObject } from 'appi'
import { getConfig } from './local-fs.config'

export class LocalFSError extends AppiError {

    static INVALID_CONFIG = Symbol()
    static INVALID_FILENAME = Symbol()

}

class LocalFS {

    constructor(config, log) {

        this._config = config
        this._log = log

    }

    /**
     * @param {string} fileName
     * @param {Stream} sourceFileStream
     * @returns {Promise}
     */
    async save(fileName, sourceFileStream) {

        this._log.debug('LocalFileStorage#save is called with filename "%s".', fileName)

        let fileParams = null

        if (LocalFS.isSafeFilename(fileName) === false) {

            this._log.debug('LocalFileStorage#save. Invalid filename "%s".', fileName)

            throw new LocalFSError(
                `Attempt to save file with invalid filename: ${fileName}`,
                LocalFSError.INVALID_FILENAME
            )

        }

        const [ name, extension ] = LocalFS.parseFilename(fileName)

        try {

            fileParams = await LocalFS.createNewFile(this._config.path, name, extension)

            this._log.debug('LocalFileStorage#save. New file was created: %j', fileParams)

        } catch (err) {

            this._log.error('LocalFileStorage#save. New file was creation failed.')
            throw err

        }

        return new Promise((resolve, reject) => {

            const targetFileStream = fs.createWriteStream('', { fd: fileParams.descriptor })

            targetFileStream.on('error', async (err) => {

                LocalFS._streamErrorHandler(err, 'target', fileParams.path, this._log, reject)

            })

            sourceFileStream.on('error', async (err) => {

                LocalFS._streamErrorHandler(err, 'source', fileParams.path, this._log, reject)

            })

            sourceFileStream.on('end', (err) => {

                if (err) {

                    this._log.error('LocalFileStorage#save. Source file streaming ended with failure.')

                    return reject(err)

                }

                this._log.debug('LocalFileStorage#save. Source file streaming successfully.')

                return resolve({
                    name: fileParams.name,
                    path: fileParams.path,
                })

            })

            sourceFileStream.pipe(targetFileStream)

        })

    }

    static async _streamErrorHandler(err, type, filePath, log, next) {

        log.error(`LocalFileStorage#save. Error while streaming ${type} file.`)

        try {

            await LocalFS.removeFile(filePath)

            log.debug('LocalFileStorage#save. Junk file was deleted.')

        } catch (clearErr) {

            log.error('LocalFileStorage#save. Unable to clear junk file due to: %s.', clearErr.message)

        }

        return next(err)

    }

    static async removeFile(filePath) {

        return new Promise((resolve, reject) => {

            fs.unlink(filePath, (err) => {

                if (err) {

                    return reject(err)

                }

                return resolve()

            })

        })

    }

    /**
     * Detects if filename is safe
     * @param {string} fileName
     * @returns {boolean}
     */
    static isSafeFilename(fileName) {

        const safeStringPattern = /^[0-9a-z-_]+$/
        const [ name, extension ] = LocalFS.parseFilename(fileName)

        return !!(name.match(safeStringPattern) && extension.match(safeStringPattern))

    }

    /**
     * Splits filename into name and extension
     * @param {string} fileName
     * @returns {Array<string>}
     */
    static parseFilename(fileName) {

        const dotPosition = fileName.lastIndexOf('.')
        let extension
        let name

        if (dotPosition === -1) {

            extension = ''
            name = fileName

        } else {

            extension = fileName.substring(dotPosition + 1)
            name = fileName.substring(0, dotPosition)

        }

        return [ name, extension ]

    }

    /**
     * @param {string} filePath
     * @param {string} fileName
     * @param {string} fileExtension
     * @returns {Promise}
     */
    static async createNewFile(filePath, fileName, fileExtension) {

        return new Promise((resolve, reject) => {

            LocalFS._createNewFileRecursively(filePath, fileName, fileExtension, 0, (err, fileParams) => {

                if (err) {

                    return reject(err)

                }

                return resolve(fileParams)

            })

        })

    }

    /**
     * Creates new file and return file descriptor.
     * If file already exists it recursively trying to create file with filename appended with counter
     * @param {string} storagePath
     * @param {string} name
     * @param {string} extension
     * @param {number} counter
     * @param {Function} callback
     * @returns {void}
     * @private
     */
    static _createNewFileRecursively(storagePath, name, extension, counter, callback) {

        let filenameCandidate

        if (counter === 0) {

            filenameCandidate = `${name}.${extension}`

        } else {

            filenameCandidate = `${name}-${counter}.${extension}`

        }

        const filepath = path.join(storagePath, filenameCandidate)

        // 'wx' means that if file exists - it throws
        fs.open(filepath, 'wx', (err, fileDescriptor) => {

            if (err) {

                if (counter > 255) {

                    return callback(err)

                }

                counter += 1

                return LocalFS._createNewFileRecursively(storagePath, name, extension, counter, callback)

            }

            return callback(null, {
                name: filenameCandidate,
                path: filepath,
                descriptor: fileDescriptor,
            })

        })

    }

    /**
     *
     * @param {string} filestoragePath
     * @returns {Promise}
     */
    static async createDirectory(filestoragePath) {

        return new Promise((resolve, reject) => {

            mkdirp(filestoragePath, { mode: '0644' }, (err) => {

                if (err) {

                    return reject(err.message)

                }

                resolve()

            })

        })

    }

}

/**
 * Creates LocalFileStorage instance
 * @param {Object} deps
 * @returns {LocalFS}
 */
export async function localFSComponent(deps) {

    const { env, logger } = deps
    const log = logger.getLogger('local-fs')

    try {

        const config = validateObject(getConfig(env))

        await LocalFS.createDirectory(config.path)

        log.info('Storage directory "%s" successfully created', config.path)

        return new LocalFS(config, log)

    } catch (err) {

        log.error('Storage directory creation failed due error: "%s"', err.message)

        throw err

    }

}

localFSComponent.componentName = 'localFS'