import sanitizeFilename from 'sanitize-filename'
import { slugify } from 'transliteration'
import { LocalFSError, validateObject, InternalError } from 'appi'
import { AppiFSError } from './'
import { StreamSizeController } from './stream-size-controller'
import { getConfig } from './appi-local-fs.config'

export function AppiLocalFSComponent(deps) {

    const { env, localFS, logger } = deps
    const log = logger.getLogger('appi-local-fs')
    const config = validateObject(getConfig(env))

    class AppiLocalFS {

        /**
         * Saves file
         * @param {string} fileName
         * @param {Stream} sourceFileStream
         * @returns {Object}
         */
        async save(fileName, sourceFileStream) {

            log.debug('AppiFS#save called with filename: "%s"', fileName)

            const [ name, extension ] = AppiLocalFS.sanitizeAndParseFilename(fileName)

            // Checking file extension
            if (!extension || config.allowedExtensions.includes(extension) === false) {

                log.debug('AppiFS#save. Invalid or empty extension: "%s"', extension)

                throw new AppiFSError(
                    `Invalid extension "${extension}" detected`,
                    AppiFSError.INVALID_EXTENSION
                )

            }

            // Checking file name
            if (!name) {

                log.debug('AppiFS#save. Empty file name: "%s"', extension)

                throw new AppiFSError(
                    `Invalid filename "${name}" detected`,
                    AppiFSError.INVALID_FILENAME
                )

            }

            try {

                // Controlling file maximum size
                const safeSourceFileStream = new StreamSizeController(config.maxSizeInBytes)
                const safeFileName = `${name}.${extension}`

                sourceFileStream.pipe(safeSourceFileStream)

                const fileInfo = await localFS.save(safeFileName, safeSourceFileStream)

                log.debug('AppiFS#save. File saved: %j', fileInfo)

                return { name: fileInfo.name }

            } catch (err) {

                log.debug('AppiFS#save. File save failed due to: %s', err.message)

                if (err instanceof AppiFSError) {

                    throw err

                }

                if (err instanceof LocalFSError) {

                    switch (err.code) {

                        case LocalFSError.INVALID_FILENAME:
                            throw new AppiFSError('Invalid file name', AppiFSError.INVALID_FILENAME)

                        case LocalFSError.INVALID_EXTENSION:
                            throw new AppiFSError('Invalid file extension', AppiFSError.INVALID_FILENAME)

                        default:
                            throw new AppiFSError(err.message)

                    }

                }

                throw new InternalError(err)

            }

        }

        /**
         *
         * @param {string} filename
         * @returns {Array} Name and extension
         */
        static sanitizeAndParseFilename(filename) {

            let extension
            let name

            filename = filename || ''

            const safeFilename = sanitizeFilename(filename.toLowerCase()).replace(/^\.+/, '').replace(/\.+$/, '')
            const dotPosition = safeFilename.lastIndexOf('.')

            if (dotPosition === -1) {

                extension = ''
                name = slugify(safeFilename)

            } else {

                extension = safeFilename.substring(dotPosition + 1).replace(/[^0-9a-z]/g, '')
                name = slugify(safeFilename.substring(0, dotPosition)).replace(/[^0-9a-z\-]/g, '')

            }

            return [ name, extension ]

        }

    }

    return AppiLocalFS

}

AppiLocalFSComponent.componentName = 'AppiLocalFS'
