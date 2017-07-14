import test from 'ava'
import { compose } from 'appi'
import { logger, hapi } from '../../..'
import { hapiOAuth } from '../'

const env = {
    LOG_LEVEL:             'ERROR',
    OAUTH_COOKIE_PASSWORD: '96bsbwKEGdXnbD',
    OAUTH_FACEBOOK_ID:     '283063502056890',
    OAUTH_FACEBOOK_SECRET: 'e8972e302556d5cfa9fd5d8658b79142',
    /**
     * Forces usage of https while oauth communication
     * @type {string}
     */
    OAUTH_IS_SECURE: 'true',
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
                component: hapiOAuth,
                deps: [ env, hapi, logger ],
            }
        ])

        t.pass()

    } catch (err) {

        t.fail(err.message)

    }

})
