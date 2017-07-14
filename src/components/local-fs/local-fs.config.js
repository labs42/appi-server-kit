import path from 'path'
import joi from 'joi'

/**
 * Returns config data and its schema
 * @param {Object} env
 * @returns {SchemedData}
 */
export function getConfig(env) {

    const {
        LOCAL_FS_PATH = '/var/appi-file-storage/',
    } = env

    return {
        data: {
            path: LOCAL_FS_PATH,
        },
        schema: {
            path: joi.string()
                .required(),
        },
        processing: {
            path: value => path.join(value, '/'), // ensure trailing slash
        }
    }

}
