import HAMongoClient from 'ha-mongo-client'
import { AppiComponent, validateObject } from 'appi'
import { getConfig } from './mongodb.config'

/**
 * MongoDB component
 * @param {Object} deps Dependencies
 * @returns {Db}
 */
class MongoDB extends AppiComponent{

    static componentName = 'mongoDB'

    /**
     * Initializes mongoDB service
     * @param {Object} deps
     * @param {Logger} deps.logger
     * @param {Object} deps.config MongoDB configuration
     * @throws {Error} if any error occurres while connecting to database
     * @returns {void}
     */
    async make(deps) {

        try {

            const { env, logger } = deps
            const config = validateObject(getConfig(env))
            const log = logger.getLogger('mongodb')
            const haMongoClient = new HAMongoClient(config.url, config.options)

            haMongoClient.on('retry', retry =>
                log.info(`Attempt number ${retry.attempt}. Next reconnect attempt in ${retry.interval} sec.`)
            )

            const database = await haMongoClient.connect()

            log.info('Succesfully connected to database')

            database.on('authenticated', () =>
                log.info('All server members in the topology have successfully authenticated.')
            )

            database.on('close', () =>
                log.info('Connection closed')
            )

            database.on('error', (err) =>
                log.error(`Error occurred ${err.message}`)
            )

            database.on('fullsetup', () =>
                log.info('All servers in the topology have been connected to at start up time.')
            )

            database.on('parseError', () =>
                log.error('Driver detects illegal or corrupt BSON being received from the server.')
            )

            database.on('reconnect', () =>
                log.info('Driver has reconnected and re-authenticated.')
            )

            database.on('timeout', () =>
                log.info('Emitted after a socket timeout occurred against a single server or mongos proxy.')
            )

            this.service = database
            this.log = log

        } catch (err) {

            throw err

        }

    }

    /**
     * Stops mongoDB component
     * @returns {void}
     */
    async stop() {

        try {

            await this.service.close()
            this.log.info('Database service stopped succesfully')

        } catch (err) {

            this.log.error('Database service stop failed due to: %s', err.message)
            throw err

        }

    }

}

const mongoDB = new MongoDB()

export { mongoDB }