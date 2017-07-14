import joi from 'joi'

/**
 * Returns config data and its schema
 * @param {Object} env
 * @returns {SchemedData}
 */
export function getConfig(env) {

    const {
        AUTH_SALT,
        AUTH_SECRET,
        AUTH_TTL,
    } = env

    return {
        data: {
            passwordSalt: AUTH_SALT,
            jwtSecret: AUTH_SECRET,
            jwtExpiresIn: AUTH_TTL,
        },
        schema: {
            passwordSalt: joi.string()
                .alphanum()
                .min(32)
                .required(),
            jwtSecret: joi.string()
                .alphanum()
                .min(32)
                .required(),
            jwtExpiresIn: joi.number()
                .required(),
        }
    }

}
