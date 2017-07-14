/**
 * Extracts token from headers
 * @param {Object} headers
 * @returns {string}
 */
export function extractToken(headers) {

    const JWT_AUTH_TYPE = 'Bearer'

    let authType = ''
    let authToken = ''

    const { authorization } = headers

    if (authorization) {

        [ authType, authToken ] = authorization.split(' ')

        if (authType !== JWT_AUTH_TYPE) {

            throw Error('extractToken: Invalid "authorization" header')

        }

    }

    return authToken

}
