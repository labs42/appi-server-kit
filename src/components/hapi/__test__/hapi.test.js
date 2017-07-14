import test from 'ava'
import { compose } from 'appi'
import { logger, hapi } from '../..'

const env = {
    LOG_LEVEL: 'ERROR',
    APP_HOST: '0.0.0.0',
    APP_PORT: 8765,
    HTTP_POST_MAX_BODY_SIZE: 50 * 1024 * 1024,
    CORS: true,
}

test('Should compose an app from http and its deps', async (t) => {

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
            component: hapi,
            deps: [ env, logger ],
        },
    ])

    t.truthy(app.getService('hapi'))

})

test('Should compose an app from http and its deps, start it and stop it', async (t) => {

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
            component: hapi,
            deps: [ env, logger ],
        },
    ])

    const hapiService = app.getService('hapi')

    t.plan(3)

    t.truthy(hapiService)

    await app.start()

    t.true(hapiService.info.started > 0)

    await app.stop()

    t.true(hapiService.info.started === 0)

})
