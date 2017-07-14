import test from 'ava'
import Chance from 'chance'
import { compose } from 'appi'
import { hapi, logger, UserComponent } from '../../'
import { appiJwtAuth } from '../'

const chance = new Chance()
let server, User

test.before(async () => {

    const env = {
        LOG_LEVEL: 'ERROR',
        APP_HOST: '0.0.0.0',
        APP_PORT: 8765,
        HTTP_POST_MAX_BODY_SIZE: 50 * 1024 * 1024,
        AUTH_SALT: chance.hash({ length: 32 }),
        AUTH_SECRET: chance.hash({ length: 32 }),
        AUTH_TTL: 1209600,
    }

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
        {
            component: UserComponent,
            deps: [ env ],
        },
        {
            component: appiJwtAuth,
            deps: [ UserComponent, hapi, logger ],
        }
    ])

    server = app.getService('hapi')
    User = app.getService('User')

    server.route([
        {
            method: 'GET',
            path: '/appi/auth/none',
            handler: async (request, reply) => reply(request.auth.credentials),
        },
        {
            method: 'GET',
            path: '/appi/auth/appi-jwt',
            config: { auth: 'appi-jwt' },
            handler: async (request, reply) => reply(request.auth.credentials),
        },
    ])

})

test('Should not impact on non protected routes', async t => {

    const { result } = await server.inject({
        method: 'GET',
        url: '/appi/auth/none',
    })

    t.is(result, null)

})

test('Should put User object to request.auth.credentials if token is ok', async t => {

    const user = new User(User.getDummy())
    const { result } = await server.inject({
        method: 'GET',
        url: '/appi/auth/appi-jwt',
        headers: {
            authorization: `Bearer ${user.getToken()}`
        },
    })

    t.is(result.id, user.id)
    t.is(result.name, user.name)

})

test('Should return error if authorization header is empty', async t => {

    const { statusCode, result } = await server.inject({
        method: 'GET',
        url: '/appi/auth/appi-jwt',
    })

    t.is(statusCode, 401)
    t.is(result.message, 'Authorization header is empty')

})

test('Should return error if authorization header is malformed', async t => {

    const user = new User(User.getDummy())
    const { statusCode, result } = await server.inject({
        method: 'GET',
        url: '/appi/auth/appi-jwt',
        headers: {
            authorization: `JWT ${user.getToken()}`
        },
    })

    t.is(statusCode, 401)
    t.is(result.message, 'Authorization header is malformed')

})

test('Should return error if token is invalid', async t => {

    const user = new User(User.getDummy())
    const { statusCode, result } = await server.inject({
        method: 'GET',
        url: '/appi/auth/appi-jwt',
        headers: {
            authorization: `Bearer ${user.getToken()}!!!11`
        },
    })

    t.is(statusCode, 401)
    t.is(result.message, 'Invalid token')

})
