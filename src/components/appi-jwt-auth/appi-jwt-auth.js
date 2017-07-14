import boom from 'boom'

const JWT_AUTH_TYPE = 'Bearer'
const AUTH_SCHEME_NAME = 'appi-jwt'

function makeAppiJwtScheme(User) {

    /**
     * Appi JWT auth scheme implementation
     * @returns {Object}
     */
    function appiJwtScheme() {

        return {
            authenticate: (request, reply) => {

                const { authorization } = request.headers

                if (!authorization) {

                    return reply(boom.unauthorized('Authorization header is empty', AUTH_SCHEME_NAME))

                }

                const [ authType, authToken ] = authorization.split(' ')

                if (authType !== JWT_AUTH_TYPE) {

                    return reply(boom.unauthorized('Authorization header is malformed', AUTH_SCHEME_NAME))

                }

                try {

                    return reply.continue({
                        credentials: User.createFromToken(authToken)
                    })

                } catch (err) {

                    return reply(boom.unauthorized('Invalid token', AUTH_SCHEME_NAME))

                }

            }
        }

    }

    return appiJwtScheme

}

export async function appiJwtAuth(deps) {

    const { logger, hapi, User } = deps
    const log = logger.getLogger('appi-jwt-auth')

    hapi.auth.scheme(AUTH_SCHEME_NAME, makeAppiJwtScheme(User))
    hapi.auth.strategy(AUTH_SCHEME_NAME, AUTH_SCHEME_NAME)
    log.info('jwt-auth plugin registered')

}

appiJwtAuth.componentName = 'appiJwtAuth'
