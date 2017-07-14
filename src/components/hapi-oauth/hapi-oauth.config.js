import joi from 'joi'

/**
 * Returns config data and its schema
 * @param {Object} env
 * @returns {SchemedData}
 */
export function getConfig(env) {

    const {
        OAUTH_COOKIE_PASSWORD,
        OAUTH_FACEBOOK_ID,
        OAUTH_FACEBOOK_SECRET,
        /**
         * Forces usage of https while oauth communication
         * @type {string}
         */
        OAUTH_IS_SECURE = 'true',
    } = env

    return {
        data: {
            cookiePassword: OAUTH_COOKIE_PASSWORD,
            isSecure: OAUTH_IS_SECURE === 'true',
            providers: {
                facebook: {
                    clientId: OAUTH_FACEBOOK_ID,
                    clientSecret: OAUTH_FACEBOOK_SECRET,
                },
            },
        },
        schema: {
            cookiePassword: joi.string()
                .alphanum()
                .min(8)
                .required(),
            isSecure: joi.boolean()
                .required(),
            providers: joi.object({
                facebook: joi.object({
                    clientId: joi.string()
                        .required(),
                    clientSecret: joi.string()
                        .hex()
                        .length(32)
                        .required(),
                }),
            }),
        }
    }

}
