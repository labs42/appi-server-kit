/**
 * Returns facebook provider configuration
 * @param {Object} config
 * @returns {Object}
 */
export function makeFacebookProvider(config) {

    return {
        strategyOptions: {
            provider: 'facebook',
            isSecure: config.isSecure,
            password: config.cookiePassword,
            clientId: config.providers.facebook.clientId,
            clientSecret: config.providers.facebook.clientSecret,
            runtimeStateCallback: (request) => {

                let result = ''

                if (request.query) {

                    const query = JSON.stringify(request.query)
                    const based64Query = Buffer.from(query).toString('base64')

                    result = `.${based64Query}`

                }

                return result

            }

        }

    }

}
