import test from 'ava'
import fs from 'fs'
import Chance from 'chance'
import { compose } from 'appi'
import { env, logger } from '../../'
import { LocalFSError, localFSComponent } from '../'

/* eslint-enable require-jsdoc */

const chance = new Chance()

function getFileStat(filename) {

    return new Promise((resolve, reject) => {

        fs.stat(filename, (err, stats) => {

            if (err) {

                return reject(err)

            }

            if (!stats) {

                return reject(null)

            }

            return resolve(stats)

        })

    })

}

async function composeLocalFS(testEnv) {

    return await compose([
        {
            component: testEnv,
            name: 'env',
            deps: [],
        },
        {
            component: logger,
            deps: [ testEnv ],
        },
        {
            component: localFSComponent,
            deps: [ testEnv, logger ],
        },
    ])

}

test('localFSComponent should be composed with default config', async t => {

    try {

        await composeLocalFS({
            LOG_LEVEL: 'CRITICAL'
        })

        t.pass()

    } catch (err) {

        t.fail()

    }

})

test('localFSComponent should throw if config.path is invalid', async t => {

    try {

        await composeLocalFS({
            LOG_LEVEL: 'CRITICAL',
            LOCAL_FS_PATH: 42
        })

    } catch (err) {

        t.is(err.message, 'Component "localFSComponent" failed while initializing with error: ' +
            '"child "path" fails because ["path" must be a string]"')

    }

})

test('localFSComponent should throw if config.path is empty string', async t => {

    try {

        await composeLocalFS({
            LOG_LEVEL: 'CRITICAL',
            LOCAL_FS_PATH: ''
        })

    } catch (err) {

        t.is(err.message, 'Component "localFSComponent" failed while initializing with error: ' +
            '"child "path" fails because ["path" is not allowed to be empty]"')

    }

})

test.failing('localFSComponent should create store directory if it is not exists', async () => {

    const localFSPath = `/var/spdfund_LocalFS_test/${chance.hash()}/`

    await composeLocalFS({
        LOG_LEVEL: 'CRITICAL',
        LOCAL_FS_PATH: localFSPath,
    })

    return new Promise((resolve, reject) => {

        fs.stat(localFSPath, (err, stats) => {

            if (err) {

                return reject(err)

            }

            if (!stats) {

                return reject()

            }

            return resolve()

        })

    })

})

test.failing('LocalFS#save should throw if filename is invalid', async t => {

    const localFS = (await composeLocalFS(env)).getService('localFS')

    try {

        const fileStream = fs.createReadStream('./dummy-files/labs42-logo.png')

        await localFS.save('/invalid.file.name', fileStream)

    } catch (err) {

        t.true(err instanceof LocalFSError && err.code === LocalFSError.INVALID_FILENAME)

    }

})

test.failing('LocalFS#save should save file to storage', async t => {

    const localFS = (await composeLocalFS(env)).getService('localFS')
    const fileName = 'labs42-logo.png'
    const filePath = `./dummy-files/${fileName}`
    const originalFileStat = await getFileStat(filePath)

    try {

        const fileInfo = await localFS.save(fileName, fs.createReadStream(filePath))
        const fileStats = await getFileStat(fileInfo.path)

        t.is(fileStats.size, originalFileStat.size)

    } catch (err) {

        t.fail(err)

    }

})

test.failing('LocalFS#save should increase filename counter if filename already exists in storage', async t => {

    const localFS = (await composeLocalFS(env)).getService('localFS')
    const originalFilePath = './dummy-files/labs42-logo.png'
    const originalFileStat = await getFileStat(originalFilePath)
    const fileName = `labs42-logo-${chance.hash()}.png`

    try {

        const fileInfo1 = await localFS.save(fileName, fs.createReadStream(originalFilePath))
        const fileInfo2 = await localFS.save(fileName, fs.createReadStream(originalFilePath))
        const fileStats1 = await getFileStat(fileInfo1.path)
        const fileStats2 = await getFileStat(fileInfo2.path)

        t.is(originalFileStat.size, fileStats1.size)
        t.is(originalFileStat.size, fileStats2.size)
        t.is(fileInfo2.name, fileName.replace('.png', '-1.png'))

    } catch (err) {

        t.fail(err.message)

    }

})

/* eslint-disable require-jsdoc */
