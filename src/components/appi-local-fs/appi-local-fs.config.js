import joi from 'joi'

/**
 * Returns config data and its schema
 * @param {Object} env
 * @returns {SchemedData}
 */
export function getConfig(env) {

    const {
        /**
         * Allowed file extensions
         * @type {number}
         */
        APPI_FS_EXTENSIONS = 'jpg,jpeg,gif,png,txt,pdf',
        /**
         * Maximum file size in bytes
         * @type {number}
         */
        APPI_FS_MAX_SIZE = 50 * 1024 * 1024
    } = env

    return {
        data: {
            allowedExtensions: APPI_FS_EXTENSIONS,
            maxSizeInBytes: APPI_FS_MAX_SIZE
        },
        schema: {
            allowedExtensions: joi.string()
                .required(),
            maxSizeInBytes: joi.number()
                .required(),
        },
        processing: {
            allowedExtensions: value => value.split(','),
        }
    }

}
