import jwt from 'jsonwebtoken'
import joi from 'joi'
import Chance from 'chance'
import { pick } from 'lodash'
import { InternalError, validateObject } from 'appi'
import { UserError } from './appi-user.error'
import { getConfig } from './appi-user.config'

/**
 * Binds User class to its deps
 * @param {Object} deps
 * @returns {User}
 */
export function UserComponent(deps) {

    const { env } = deps
    const config = validateObject(getConfig(env))
    const schema = {
        id: joi.string()
            .regex(/^[0-9a-fA-F]{24}$/)
            .allow(null),
        name: joi.string()
            .allow(''),
        scope: joi
            .array()
            .items(joi.string()),
    }

    class User {

        /**
         * @param {Object} data User data
         * @returns {User}
         */
        constructor(data = {}) {

            validateObject({ data, schema })

            Object.assign(this, { id: null, name: '', scope: [] }, data)

            this.scope = new Set(this.scope)

        }

        /**
         * Checks if user has permission to perform action
         * @param {string} action
         * @returns {boolean}
         */
        hasAccess(action) {

            return this.scope.has(action)

        }

        /**
         * Returns token of user
         * @returns {string}
         */
        getToken() {

            return User.encodePayload(this.toJSON())

        }

        /**
         * Returns JSON representation of user
         * @returns {Object} Plain JSON friendly object
         */
        toJSON() {

            return Object.assign({}, this, { scope: Array.from(this.scope) })

        }

        /**
         * Checks token integrity and decodes it into payload
         * @param {string} token
         * @returns {Object} Encoded payload
         * @throws {UserError} if token is expired
         * @throws {UserError} if token is malformed
         */
        static createFromToken(token) {

            if (!token) {

                return new User()

            }

            try {

                const userData = User.decodeToken(token)

                return new User(pick(userData, 'id', 'name', 'scope'))

            } catch (err) {

                switch (err.name) {

                    case 'TokenExpiredError':
                        throw new UserError('Token expired', UserError.TOKEN_EXPIRED)

                    case 'JsonWebTokenError':
                        throw new UserError('Token malformed', UserError.TOKEN_MALFORMED)

                    default:
                        throw new InternalError(err)
                }

            }

        }

        /**
         * Checks token integrity and decodes it into payload
         * @param {string} token
         * @returns {Object} Encoded payload
         * @throws {JsonWebTokenError}
         */
        static decodeToken(token) {

            return jwt.verify(token, config.jwtSecret)

        }

        /**
         * Encodes payload to signed token
         * @param {Object} payload
         * @returns {string} token
         */
        static encodePayload(payload) {

            return jwt.sign(payload, config.jwtSecret, {
                expiresIn: config.jwtExpiresIn,
            })

        }

        /**
         * Returns dummy User data
         * @returns {Object}
         */
        static getDummy() {

            const chance = new Chance()

            return {
                id: chance.hash({ length: 24 }),
                name: chance.name(),
                scope: [],
            }

        }

    }

    return User

}

UserComponent.componentName = 'User'
