import joi from 'joi'

/**
 * Returns config data and its schema
 * @param {Object} env
 * @returns {SchemedData}
 */
export function getConfig(env) {

    const {
        APP_HOST = '0.0.0.0',
        APP_PORT = 8000,
        /**
         * Default maximum http request payload size
         * @type {number}
         */
        HTTP_POST_MAX_BODY_SIZE = 50 * 1024 * 1024,
    } = env
    const CORS = env.CORS === undefined ? false : true

    return {
        data: {
            host: APP_HOST,
            port: APP_PORT,
            routes: {
                payload: {
                    maxBytes: HTTP_POST_MAX_BODY_SIZE,
                },
                cors: CORS
            },
        },
        schema: {
            host: joi.string()
                .hostname()
                .required(),
            port: joi.number()
                .min(1024)
                .max(65535)
                .required(),
            routes: joi.object({
                payload: joi.object({
                    maxBytes: joi.number()
                        .required(),
                }),
                cors: joi.boolean(),
            }),
        }
    }

}
