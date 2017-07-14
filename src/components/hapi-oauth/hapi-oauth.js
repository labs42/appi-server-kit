import bell from 'bell'
import { validateObject } from 'appi'
import * as oauth from './providers'
import { getConfig } from './hapi-oauth.config'

export async function hapiOAuth(deps) {

    const { env, logger, hapi } = deps
    const config = validateObject(getConfig(env))
    const log = logger.getLogger('hapi-oauth')

    await hapi.register(bell)

    const facebookProvider = oauth.makeFacebookProvider(config)
    hapi.auth.strategy('facebook', 'bell', facebookProvider.strategyOptions)

    log.info('hapi-oauth plugin registered')

}

hapiOAuth.componentName = 'hapiOAuth'
