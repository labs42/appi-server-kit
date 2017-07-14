import { validateObject } from 'appi'

export async function guard(deps) {

    // const { env, logger, hapi } = deps
    // const config = validateObject(getConfig(env))
    // const log = logger.getLogger('appi-jwt')
    //
    // hapi.auth.scheme(AUTH_SCHEME_NAME, appiJwtScheme)
    //
    // log.info('jwt-auth plugin registered')


    class Guard {

        constructor(actions, roles, permissions) {



        }

        addAction(action) {


        }

        addRole(role) {


        }





    }

    return new Guard()

}

guard.componentName = 'guard'
