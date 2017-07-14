import test from 'ava'
import { compose } from 'appi'
import { env } from '../'

function controlComponent(deps) {

    if (!deps.env) {

        throw Error('env is empty')

    }

}

controlComponent.componentName = controlComponent

test('Should compose an app from env component', async (t) => {

    try {

        const app = await compose([
            {
                component: env,
                deps: [],
            },
            {
                component: controlComponent,
                deps: [ env ],
            },
        ])

        t.truthy(app.getService('env'))

    } catch (err) {

        t.fail(err.message)

    }

})
