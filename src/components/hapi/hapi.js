import Hapi from 'hapi'
import { AppiComponent, validateObject } from 'appi'
import { getConfig } from './hapi.config'

/**
 * Http component
 */
class HapiComponent extends AppiComponent {

    static componentName = 'hapi'

    /**
     * Initializes hapiServer service
     *
     * @param {Object} deps
     * @param {Logger} deps.logger
     * @param {Object} deps.config HTTP-server configuration
     * @returns {void}
     */
    async make(deps) {

        try {

            const { logger, env } = deps
            const config = validateObject(getConfig(env))

            this.log = logger.getLogger('hapi')
            this.service = new Hapi.Server()
            this.service.connection(config)
            this.log.info('Server initialized')

        } catch (err) {

            this.log.error('Hapi http server initialization failed due to: %s', err.message)
            throw err

        }

    }

    /**
     * Starts hapi component
     * @returns {void}
     */
    async start() {

        try {

            await this.service.start()
            this.log.info(`Hapi http server started on ${this.service.info.uri}`)

        } catch (err) {

            this.log.error('Hapi http server start failed due to: %s', err.message)
            throw err

        }

    }

    /**
     * Stops hapi component
     * @returns {void}
     */
    async stop() {

        try {

            await this.service.stop()
            this.log.info(`Hapi http server on ${this.service.info.uri} stopped`)

        } catch (err) {

            this.log.error('Hapi http server stop failed due to: %s', err.message)
            throw err

        }

    }

}

const hapi = new HapiComponent()

export { hapi }