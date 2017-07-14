import test from 'ava'
import { ReadableStreamBuffer, WritableStreamBuffer } from 'stream-buffers'
import { StreamSizeController } from '../stream-size-controller'
import { AppiFSError } from '../'

const MAX_SIZE_LIMITS = 1024 * 16
const NORMAL_SIZE = 1024 * 8
const LARGE_SIZE = 1024 * 32

test.failing('StreamSizeController should pass through stream if its size is ok', async (t) => {

    const data = Buffer.alloc(NORMAL_SIZE)
    const sourceStream = new ReadableStreamBuffer()
    const restrictedSourceStream = new StreamSizeController(MAX_SIZE_LIMITS)
    const targetStream = new WritableStreamBuffer()

    t.plan(1)

    restrictedSourceStream.on('error', (err) => t.fail(err))

    targetStream.on('finish', () => process.nextTick(() => {

        t.pass()

    }))

    sourceStream.put(data)
    sourceStream.stop()
    sourceStream
        .pipe(restrictedSourceStream)
        .pipe(targetStream)

})

test.failing('StreamSizeController should emit error if stream size is too large', async () => {

    const data = Buffer.alloc(LARGE_SIZE)
    const sourceStream = new ReadableStreamBuffer()
    const restrictedSourceStream = new StreamSizeController(MAX_SIZE_LIMITS)
    const targetStream = new WritableStreamBuffer()

    sourceStream.put(data)
    sourceStream.stop()
    sourceStream
        .pipe(restrictedSourceStream)
        .pipe(targetStream)

    return new Promise((resolve, reject) => {

        restrictedSourceStream.on('error', (err) => {

            if (err instanceof AppiFSError && err.code === AppiFSError.FILE_TOO_LARGE) {

                return resolve()

            }

            return reject(err)

        })

        targetStream.on('finish', () => reject())

    })

})
