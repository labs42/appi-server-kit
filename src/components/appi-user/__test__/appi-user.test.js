import test from 'ava'
import jwt from 'jsonwebtoken'
import Chance from 'chance'
import { omit } from 'lodash'
import { compose } from 'appi'
import { UserComponent, UserError } from '../'

const chance = new Chance()

let User, env

test.before(async () => {

    env = {
        LOG_LEVEL: 'ERROR',
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
            component: UserComponent,
            deps: [ env ],
        },
    ])

    User = app.getService('User')

})

test('#constructor should create empty instance with default properties', t => {

    const user = new User()

    t.deepEqual(user.toJSON(), { id: null, name: '', scope: [] })

})

test('User instances should not share default objects', t => {

    const user1 = new User()
    const user2 = new User()

    user1.scope.add('foo')

    t.notDeepEqual(user1.toJSON().scope, user2.toJSON().scope)

})

test('#constructor should create instance with data', t => {

    const userData = {
        id: 'ec42b32aec42b32aec42b32a',
        name: 'jhon_smith',
        scope: [ 'foo', 'bar' ]
    }

    const user = new User(userData)

    t.deepEqual(user.toJSON(), userData)

})

test('#hasAccess should return true if user has access in scope', t => {

    const userData = {
        id: 'ec42b32aec42b32aec42b32a',
        name: 'jhon_smith',
        scope: [ 'DO_THIS', 'DO_THAT' ]
    }

    const user = new User(userData)

    t.true(user.hasAccess('DO_THIS'))
    t.true(user.hasAccess('DO_THAT'))
    t.false(user.hasAccess('DO_SOMETHING_BAD'))

})

test('#getToken should return valid token', t => {

    const userData = {
        id: 'ec42b32aec42b32aec42b32a',
        name: 'jhon_smith',
        scope: [ 'DO_THIS', 'DO_THAT' ]
    }

    const user = new User(userData)
    const decodedPayload = jwt.decode(user.getToken())

    t.truthy(decodedPayload.iat)
    t.truthy(decodedPayload.exp)
    t.deepEqual(omit(decodedPayload, 'iat', 'exp'), userData)

})

test('#toJSON should return valid representation of user', t => {

    const userData = {
        id: 'ec42b32aec42b32aec42b32a',
        name: 'jhon_smith',
        scope: [ 'DO_THIS', 'DO_THAT' ]
    }

    const user = new User(userData)

    t.deepEqual(user.toJSON(), userData)

})

test('.createFromToken should return user with ANONYMOUS role scope if called with no token', t => {

    const user = User.createFromToken()

    t.deepEqual(user.toJSON(), { id: null, name: '', scope: [] })

})

test('.createFromToken should return user instance created from token payload', t => {

    const userData = {
        id: 'ec42b32aec42b32aec42b32a',
        name: 'jhon_smith',
        scope: [ 'foo', 'bar' ]
    }

    const token = User.encodePayload(userData)
    const user = User.createFromToken(token)

    t.true(user instanceof User)
    t.deepEqual(user.toJSON(), userData)

})

test('.createFromToken should throw if token is malformed', t => {

    t.plan(2)

    const userData = {
        id: 'ec42b32aec42b32aec42b32a',
        name: 'jhon_smith',
        scope: [ 'foo', 'bar' ]
    }

    const token = User.encodePayload(userData)

    try {

        User.createFromToken(`x ${token}.`)

    } catch (err) {

        t.is(err.name, 'UserError')
        t.is(err.code, UserError.TOKEN_MALFORMED)

    }

})

test('.createFromToken should throw if token is expired', t => {

    t.plan(2)

    const now = Math.floor(Date.now())
    const iat = now - env.AUTH_TTL - 1000
    const exp = iat + env.AUTH_TTL

    const userData = {
        id: 'ec42b32aec42b32aec42b32a',
        name: 'jhon_smith',
        scope: [ 'foo', 'bar' ],
        iat: Math.floor(iat / 1000),
        exp: Math.floor(exp / 1000),
    }

    const token = jwt.sign(userData, env.AUTH_SECRET)

    try {

        User.createFromToken(token)

    } catch (err) {

        t.is(err.name, 'UserError')
        t.is(err.code, UserError.TOKEN_EXPIRED)

    }

})

test('.encodePayload should return valid JWT token with "iat" and "exp" properties', t => {

    const userData = {
        id: 'someId',
        email: 'jhon-smith@yahoo.com',
        scope: [ 'STROKE_KITTEN', 'WALKOUT_DOG' ]
    }
    const token = User.encodePayload(userData)
    const verifiedPayload = jwt.verify(token, env.AUTH_SECRET)

    t.truthy(verifiedPayload.iat)
    t.truthy(verifiedPayload.exp)
    t.deepEqual(omit(verifiedPayload, 'iat', 'exp'), userData)

})

test('.decodeToken should verify token and return payload with "iat" property', t => {

    const userData = {
        id: 'someId',
        email: 'jhon-smith@yahoo.com',
        scope: [ 'STROKE_KITTEN', 'WALKOUT_DOG' ],
    }
    const token = jwt.sign(userData, env.AUTH_SECRET)
    const decodedPayload = User.decodeToken(token)

    t.deepEqual(omit(decodedPayload, 'iat'), userData)

})

test('.decodeToken should not decode token without signature', t => {

    const fakeUser = { user: 'admin', scope: [ 'RULE', 'THE', 'WORLD' ] }
    const unsafeToken = jwt.sign(fakeUser, '', { algorithm: 'none' })

    t.throws(
        () => User.decodeToken(unsafeToken),
        (err) => err.message === 'jwt signature is required'
    )

})

test('.decodeToken should not decode token with "none" alg', t => {

    const fakeUser = { user: 'admin', scope: [ 'RULE', 'THE', 'WORLD' ] }
    const unsafeToken = `${jwt.sign(fakeUser, '', { algorithm: 'none' })}fakesignature`

    t.throws(
        () => User.decodeToken(unsafeToken),
        (err) => err.message === 'invalid algorithm'
    )

})

/**
 * Test User.getDummy
 * ==================
 */
test('User.getDummy should generate dummy object', t => {

    const dummyUser = User.getDummy()

    t.true(typeof dummyUser.id === 'string' && dummyUser.id.length > 0)
    t.true(typeof dummyUser.name === 'string' && dummyUser.name.length > 0)
    t.true(Array.isArray(dummyUser.scope))

})

test('User.getDummy should generate valid data that can be accepted by #constructor', t => {

    const dummyUser = User.getDummy()

    t.notThrows(() => new User(dummyUser))

})
