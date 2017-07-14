import test from 'ava'
import { compose } from 'appi'
import { env, logger } from '../../'
import { mongoDB } from '../'

test('Should compose an app from mongoDB', async (t) => {

    try {

        await compose([
            {
                component: env,
                name: 'env',
                deps: [],
            },
            {
                component: logger,
                deps: [ env ],
            },
            {
                component: mongoDB,
                deps: [ env, logger ],
            },
        ])

        t.pass()

    } catch (err) {

        t.fail(err.message)

    }

})

test('Should compose an app from mongoDB and start/stop it correctly', async (t) => {

    try {

        const app = await compose([
            {
                component: env,
                name: 'env',
                deps: [],
            },
            {
                component: logger,
                deps: [ env ],
            },
            {
                component: mongoDB,
                deps: [ env, logger ],
            },
        ])

        const db = app.getService('mongoDB')
        let isDbClosed = false

        db.on('close', () => (isDbClosed = true))

        await app.start()
        await app.stop()

        t.true(isDbClosed)

    } catch (err) {

        t.fail(err.message)

    }

})
