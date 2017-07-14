import Good from 'good'

export async function hapiLogger(deps) {

    const { logger, hapi } = deps
    const logLevel = logger._level
    const squeezeArgs = {}

    if (logLevel <= logger.ERROR) {

        squeezeArgs.error = '*'

    }

    if (logLevel <= logger.INFO) {

        squeezeArgs.log = '*'
        squeezeArgs.request = '*'
        squeezeArgs.response = '*'

    }

    await hapi.register({
        register: Good,
        options: {
            ops: {
                interval: 1000
            },
            reporters: {
                console: [
                    {
                        module: 'good-squeeze',
                        name: 'Squeeze',
                        args: [ squeezeArgs ]
                    },
                    {
                        module: 'good-console',
                    },
                    'stdout'
                ],
            }
        }
    })

}

hapiLogger.componentName = 'hapiLogger'
