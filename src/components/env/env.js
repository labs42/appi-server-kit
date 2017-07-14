/**
 * Component that returns environment variables
 * @returns {Object}
 */
function env() {

    return process.env

}

env.componentName = 'env'

export { env }
