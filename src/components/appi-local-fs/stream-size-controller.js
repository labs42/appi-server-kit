import { Transform } from 'stream'
import { AppiFSError } from './'

export class StreamSizeController extends Transform {

    /**
     * @param {number} maxSizeLimit Maximum allowed size in bytes
     * @param {Object} options Standard Stream options object
     */
    constructor(maxSizeLimit, options) {

        super(options)

        if (typeof maxSizeLimit !== 'number') {

            throw new TypeError('StreamSizeController#constructor. maxSizeLimit should be a number')

        }

        this._maxSizeLimit = maxSizeLimit
        this._currentSize = 0

    }

    /**
     * @param {Buffer} chunk
     * @param {string} encoding
     * @param {Function} callback
     * @private
     * @override
     */
    _transform(chunk, encoding, callback) {

        this._currentSize += chunk.length

        if (this._currentSize > this._maxSizeLimit) {

            this.emit('error', new AppiFSError(
                `File size is too large. Maximum allowed size is ${this._maxSizeLimit} bytes`,
                AppiFSError.FILE_TOO_LARGE
            ))
            this.end()

        }

        callback(null, chunk)

    }

}
