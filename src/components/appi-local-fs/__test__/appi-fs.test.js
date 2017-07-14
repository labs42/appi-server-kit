import test from 'ava'
import { compose } from 'appi'
import { logger } from '../../'
import { AppiLocalFSComponent } from '../'

async function composeAppiLocalFS(testEnv) {

    const localFSComponent = {}

    return await compose([
        {
            component: testEnv,
            name: 'env',
            deps: [],
        },
        {
            component: logger,
            deps: [ testEnv ],
        },
        {
            component: localFSComponent,
            name: 'localFS',
            deps: [ testEnv, logger ],
        },
        {
            component: AppiLocalFSComponent,
            deps: [ localFSComponent, testEnv, logger ],
        }
    ])

}

test('FileStorage.createNewFile should create new empty file', async t => {

    const app = await composeAppiLocalFS({ LOG_LEVEL: 'CRITICAL' })
    const AppiFS = app.getService('AppiLocalFS')
    const filenamesMap = {
        'супер пупер домумент.docx': [ 'super-puper-domument', 'docx' ],
        '......filename0.......': [ 'filename0', '' ],
        filename1: [ 'filename1', '' ],
        '..../filename2': [ 'filename2', '' ],
        'filename3..': [ 'filename3', '' ],
        '../../filename4.png': [ 'filename4', 'png' ],
        '/../../filename5.png': [ 'filename5', 'png' ],
        '../some/../filename.png': [ 'some-filename', 'png' ],
        '..': [ '', '' ],
        '.': [ '', '' ],
        '       ../../filename6.png      ': [ 'filename6', 'png' ],
        ' >>      ../../filename7.png      ': [ 'filename7', 'png' ],
        '.filename8': [ 'filename8', '' ],
        '../../fi\\le\'name.png      ': [ 'file-name', 'png' ],
        'filename.js.png': [ 'filename-js', 'png' ],
        '~/.\u0000ssh/authorized_keys': [ '', 'sshauthorizedkeys' ],
        '/\u0000/hosts': [ 'hosts', '' ],
    }

    t.plan(Object.keys(filenamesMap).length)

    for (const badFilename of Object.keys(filenamesMap)) {

        const expectedFilenme = filenamesMap[badFilename]
        const sanitizedFilename = AppiFS.sanitizeAndParseFilename(badFilename)

        t.deepEqual(expectedFilenme, sanitizedFilename)

    }

})
