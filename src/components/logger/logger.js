import intelLogger from 'intel'
import joi from 'joi'
import { validateObject } from 'appi'

/**
 * Returns config data and its schema
 * @param {Object} env
 * @returns {SchemedData}
 */
function getConfig(env) {

    /**
     * Log level compatible with intel module
     * Valid values: ALL, TRACE, VERBOSE, DEBUG, INFO, WARN, ERROR, CRITICAL, NONE
     * @enum {string}
     */
    const { LOG_LEVEL = 'INFO' } = env

    return {

        data: {
            logLevel: LOG_LEVEL,
        },

        schema: {
            logLevel: joi.string()
                .only([ 'ALL', 'TRACE', 'VERBOSE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL', 'NONE' ])
        }

    }

}

/**
 * Returns logger service
 * @param {Object} deps Appi dependencies
 * @param {Object} deps.env Env dependency
 * @returns {Logger} Configured intel logger
 */
function makeLogger(deps) {

    const config = validateObject(getConfig(deps.env))

    intelLogger.setLevel(config.logLevel)

    intelLogger.addHandler(new intelLogger.handlers.Console({
        formatter: new intelLogger.Formatter({
            format: '[%(date)s] %(name)s.%(levelname)s: %(message)s',
            datefmt: '%Y-%m-%d %H:%M-%S',
            colorize: true,
        })
    }))

    return intelLogger

}

let loggerInstance

/**
 * Returns logger service singleton
 * @param {Object} deps Appi dependencies
 * @param {Object} deps.env Env dependency
 * @returns {Logger} Configured intel logger
 */
export function logger(deps) {

    return loggerInstance ? loggerInstance : (loggerInstance = makeLogger(deps))

}

logger.componentName = 'logger'
