import joi from 'joi'

/**
 * Returns config data and its schema
 * @param {Object} env
 * @returns {SchemedData}
 */
export function getConfig(env) {

    const {
        DB_URL,
        DB_POOL_SIZE = 5,
        DB_RECONNECT_TRIES = 15 * 60,
        DB_RECONNECT_INTERVAL = 1000,
    } = env

    return {
        data: {
            url: DB_URL,
            options: {
                db: {
                    w: 'majority',
                    j: true
                },
                server: {
                    poolSize: DB_POOL_SIZE,
                    socketOptions: {
                        keepAlive: true,
                    },
                    reconnectTries: DB_RECONNECT_TRIES,
                    reconnectInterval: DB_RECONNECT_INTERVAL,
                },
            }
        },
        schema: {
            url: joi.string()
                .required(),
            options: joi.object({
                db: joi.object({
                    w: joi.string(),
                    j: joi.boolean(),
                }),
                server: joi.object({
                    poolSize: joi.number(),
                    socketOptions: joi.object({
                        keepAlive: joi.boolean(),
                    }),
                    reconnectTries: joi.number(),
                    reconnectInterval: joi.number(),
                })
            }),
        }
    }

}
