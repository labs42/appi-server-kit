import test from 'ava'
import { compose } from 'appi'
import { logger, hapi } from '../../'
import { hapiLogger } from '../'

const env = {
    LOG_LEVEL: 'ERROR',
    APP_HOST: '0.0.0.0',
    APP_PORT: 8765,
    HTTP_POST_MAX_BODY_SIZE: 50 * 1024 * 1024
}

test('Should compose an app from http and its deps', async (t) => {

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
                component: hapi,
                deps: [ env, logger ],
            },
            {
                component: hapiLogger,
                deps: [ hapi, logger ],
            }
        ])

        t.pass()

    } catch (err) {

        t.fail(err.message)

    }

})
