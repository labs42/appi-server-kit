import { AppiError } from 'appi'
import { logger } from '../../'

/**
 * Prints error to stderr and crashes process
 * @param {Logger} log
 * @param {Error} err
 * @returns {void}
 */
function crashProcess(log, err) {

    log.critical('CRASH', err)
    process.exit(1)

}

/**
 * Terminates application.
 * @param {App} app Application instance
 * @param {string} signal Process exit code alias
 * @param {Function} crashApp function that is called in case of app.stop() failure
 * @returns {void}
 */
async function terminateApp(app, signal, crashApp) {

    try {

        await app.stop(signal)
        process.exit(0)

    } catch (err) {

        crashApp(err)

    }

}

/**
 * App initializer
 * @param {Function} composeApp Application compose function
 * @returns {void}
 */
export async function init(composeApp) {

    const intelLogger = logger({ env: process.env })
    const log = intelLogger.getLogger('root')
    const crashApp = crashProcess.bind(null, log)

    try {

        process
            .on('uncaughtException', crashApp)
            .on('unhandledRejection', crashApp)

        const app = await composeApp()

        if (app.constructor.name !== 'App') {

            throw new AppiError(
                `async "${composeApp.name}" function must return App objects. Use "compose" function to create it`
            )

        }

        process
            .on('SIGINT', terminateApp.bind(null, app, 'SIGINT', crashApp))
            .on('SIGTERM', terminateApp.bind(null, app, 'SIGTERM', crashApp))
            .on('SIGBREAK', terminateApp.bind(null, app, 'SIGINT', crashApp))

        await app.start()

        return app

    } catch (err) {

        crashApp(err)

    }

}
