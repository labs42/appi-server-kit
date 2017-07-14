import test from 'ava'
import Chance from 'chance'
import findIndex from 'lodash/findIndex'
import { ObjectID } from 'mongodb'
import { compose } from 'appi'
import { env, logger, mongoDB } from '../../'
import { mongodbDAO, AppiDAOError } from '../'

const chance = new Chance()
const NON_EXISTENT_ID = chance.hash({ length: 24 })
const COLLECTION_NAME = chance.hash({ length: 8 })

let app, db, MongoDAO, defaultDAO

test.before(async () => {

    app = await compose([
        {
            component: env,
            deps: [],
        },
        {
            component: logger,
            deps: [ env ],
        },
        {
            component: mongoDB,
            deps: [ env, logger ],
        },
        {
            component: mongodbDAO,
            deps: [ env, logger, mongoDB ],
        }
    ])

    await app.start()

    db = app.getService('mongoDB')
    MongoDAO = app.getService('mongodbDAO')
    defaultDAO = new MongoDAO(COLLECTION_NAME)

})

test.after.always(async () => {

    await app.stop()

})

/**
 * Test MongoDAO#constructor
 * ========================
 */
test('MongoDAO#constructor should create DAO instance', t => {

    t.notThrows(() => new MongoDAO('test'))

})

test('MongoDAO#constructor should throws if "collectionName" is empty or not a string', t => {

    t.throws(() => new MongoDAO(''))
    t.throws(() => new MongoDAO({}))
    t.throws(() => new MongoDAO(123))

})

/**
 * Test MongoDAO#createIndexes
 * ==========================
 */
test('MongoDAO#createIndexes should create indexes on collection', async t => {

    class FooDAO extends MongoDAO {

        static indexes = [
            {
                key: { prop1: 1 },
                name: 'prop1',
                unique: true,
            }
        ]

    }
    const dao = new FooDAO('test')
    await dao.createIndexes()
    const indexes = await dao._collection.listIndexes().toArray()

    t.true(indexes.some(index => index.name === 'prop1'))

})

test('MongoDAO#createIndexes should create merge all indexes down to inheritance chain and create them', async t => {

    const indexes = {
        a1: { key: { a1: 1 }, name: 'a1' },
        a2: { key: { a2: 1 }, name: 'a2' },
        b1: { key: { b1: 1 }, name: 'b1' },
        b2: { key: { b2: 1 }, name: 'b2' },
        c1: { key: { c1: 1 }, name: 'c1' },
    }

    class AaDAO extends MongoDAO {

        static indexes = [ indexes.a1, indexes.a2 ]

    }

    class BbDAO extends AaDAO {

        static indexes = [ indexes.b1, indexes.b2 ]

    }

    class CcDAO extends BbDAO {

        static indexes = [ indexes.c1 ]

    }

    const dao = new CcDAO('test_index')
    await dao.createIndexes()
    const createdIndexes = await dao._collection.listIndexes().toArray()

    let isAllCreated = true
    for (const indexName of Object.keys(indexes)) {

        if (findIndex(createdIndexes, index => index.name === indexName) === -1) {

            isAllCreated = false
            break

        }

    }

    t.true(isAllCreated)

})

test('MongoDAO#createIndexes should throw if indexes has invalid format', async t => {

    class AaDAO extends MongoDAO {

        static indexes = [
            { key: { a1: 1 }, name: 'a1' },
            { key: { a1: 1 }, name: 'a1' },
        ]

    }

    class BbDAO extends AaDAO {

        static indexes = { key: { b1: 1 }, name: 'b1' }

    }

    const bbDAO = new BbDAO(COLLECTION_NAME)

    try {

        await bbDAO.createIndexes()

    } catch (err) {

        t.true(err instanceof AppiDAOError && err.code === AppiDAOError.INVALID_INDEX_FORMAT)

    }

})

/**
 * Test MongoDAO#create method
 * ==========================
 */
test('MongoDAO#create should create new document and return it with string { _id } property', async t => {

    const doc = await defaultDAO.create({ a: 'Aa', b: 'Bb' })

    t.truthy(doc._id)
    t.true(typeof doc._id === 'string')

})

test('MongoDAO#create input document should not have { _id } property', async t => {

    t.plan(1)

    try {

        await defaultDAO.create({ _id: 'BAD_ID', a: 'Aa', b: 'Bb' })

    } catch (err) {

        t.true(err instanceof TypeError)

    }

})

test('MongoDAO#create input document should not have { _removed } property', async t => {

    t.plan(1)

    try {

        await defaultDAO.create({ _removed: true, a: 'Aa', b: 'Bb' })

    } catch (err) {

        t.true(err instanceof TypeError)

    }

})

test('MongoDAO#create should create document with hidden property { _removed: false }', async t => {

    const doc = await defaultDAO.create({ a: 'Aa', b: 'Bb' })
    const [ rawDoc ] = await db.collection(COLLECTION_NAME)
        .find({ _id: new ObjectID(doc._id) })
        .limit(1)
        .toArray()

    t.false(rawDoc._removed)

})

test('MongoDAO#create should not expose { _removed: false } property in created document', async t => {

    const doc = await defaultDAO.create({ a: 'Aa', b: 'Bb' })

    t.is(doc._removed, undefined)

})

test('MongoDAO#create should throw AppiDAOError if case of index conflict', async t => {

    class FooDAO extends MongoDAO {

        static indexes = [
            {
                key: { email: 1 },
                name: 'email',
                unique: true,
            },
        ]

    }
    const dao = new FooDAO('test')

    t.plan(2)

    try {

        await dao.createIndexes()
        await dao.create({ email: 'greg@email.com' })
        await dao.create({ email: 'greg@email.com' })

    } catch (err) {

        t.is(err.name, 'AppiDAOError')
        t.is(err.code, AppiDAOError.DUPLICATE_KEY)

    }

})

/**
 * Test MongoDAO#update method
 * ==========================
 */
test('MongoDAO#update should update document and return updated document', async t => {

    const doc = await defaultDAO.create({ a: 'Aa', b: 'Bb' })
    const updatedDoc = await defaultDAO.update(doc._id, { a: 'AaA', c: 'Cc' })

    t.deepEqual(updatedDoc, { _id: doc._id, a: 'AaA', b: 'Bb', c: 'Cc' })

})

test('MongoDAO#update should throw AppiDAOError if id not exists ', async t => {

    t.plan(1)

    try {

        await defaultDAO.update(NON_EXISTENT_ID, { a: 'AaA', c: 'Cc' })

    } catch (err) {

        t.is(err.code, AppiDAOError.NOT_FOUND)

    }

})

test('MongoDAO#update should throw AppiDAOError if case of index conflict', async t => {

    t.plan(1)

    class FooDAO extends MongoDAO {

        static indexes = [
            {
                key: { email: 1 },
                name: 'email',
                unique: true,
            },
        ]

    }

    try {

        const dao = new FooDAO('test')
        await dao.createIndexes()
        await dao.create({ email: 'greg@email.com' })
        const doc2 = await dao.create({ email: 'jhon@email.com' })

        await dao.update(doc2._id, { email: 'greg@email.com' })

    } catch (err) {

        t.is(err.code, AppiDAOError.DUPLICATE_KEY)

    }

})

test('MongoDAO#update should throw if "_id" argument differs from document { _id } property', async t => {

    t.plan(1)

    try {

        const doc = await defaultDAO.create({ a: 'Aa', b: 'Bb' })
        await defaultDAO.update(doc._id, { _id: 'BAD_ID', a: 'AaA', c: 'Cc' })

    } catch (err) {

        t.true(err instanceof TypeError)

    }

})

test('MongoDAO#update should throw if document has { _removed } property', async t => {

    t.plan(1)

    try {

        const doc = await defaultDAO.create({ a: 'Aa', b: 'Bb' })
        await defaultDAO.update(doc._id, { _removed: false, a: 'AaA', c: 'Cc' })

    } catch (err) {

        t.true(err instanceof TypeError)

    }

})

test('MongoDAO#update should not expose { _removed: false } property in updated document', async t => {

    const doc = await defaultDAO.create({ a: 'Aa', b: 'Bb' })
    const updatedDoc = await defaultDAO.update(doc._id, { a: 'AaA', c: 'Cc' })

    t.is(updatedDoc._removed, undefined)

})

/**
 * Test MongoDAO#findOne method
 * ============================
 */
test('MongoDAO#findOne should find document by id', async t => {

    const doc = await defaultDAO.create({ a: 'Aa', b: 'Bb' })
    const foundDoc = await defaultDAO.findOne({ _id: doc._id })

    t.deepEqual(foundDoc, { _id: doc._id, a: 'Aa', b: 'Bb' })

})

test('MongoDAO#findOne should not find document by wrong id', async t => {

    const foundDoc = await defaultDAO.findOne({ _id: NON_EXISTENT_ID })

    t.is(foundDoc, null)

})

test('MongoDAO#findOne should not expose { _removed: false } property', async t => {

    const doc = await defaultDAO.create({ a: 'Aa', b: 'Bb' })
    const foundDoc = await defaultDAO.findOne({ _id: doc._id })

    t.is(foundDoc._removed, undefined)

})

/**
 * Test MongoDAO#remove method
 * ==========================
 */
test('MongoDAO#remove should not find removed document', async t => {

    const doc = await defaultDAO.create({ a: 'Aa', b: 'Bb' })
    await defaultDAO.remove(doc._id)

    t.falsy(await defaultDAO.findOne({ _id: doc._id }))

})

test('MongoDAO#remove should remove document by id', async t => {

    const doc = await defaultDAO.create({ a: 'Aa', b: 'Bb' })
    await defaultDAO.remove(doc._id)

    t.falsy(await defaultDAO.findOne({ _id: doc._id }))

})

test('MongoDAO#remove should throw if document with non-existent id', async t => {

    t.plan(1)

    try {

        await defaultDAO.remove(NON_EXISTENT_ID)

    } catch (err) {

        t.is(err.code, AppiDAOError.NOT_FOUND)

    }

})

test('MongoDAO#remove should mark document with { _removed: true } property but not delete', async t => {

    const doc = await defaultDAO.create({ a: 'Aa', b: 'Bb' })
    await defaultDAO.remove(doc._id)

    const [ rawDoc ] = await db.collection(COLLECTION_NAME)
        .find({ _id: new ObjectID(doc._id) })
        .limit(1)
        .toArray()

    t.true(rawDoc._removed)

})

/**
 * Test MongoDAO#find method
 * ========================
 */
test('MongoDAO#find should find existent documents using defaults', async t => {

    const TOTAL_DOCS = 100
    const DEFAULT_PAGE_NUMBER = 0
    const DEFAULT_PAGE_SIZE = 10
    const myDAO = new MongoDAO(`test_${chance.hash()}`)
    const docs = new Array(TOTAL_DOCS).fill(null).map((item, index) => ({
        number: index,
        name: chance.name(),
        email: chance.email(),
        gender: chance.pick([ 'MALE', 'FEMALE', '' ]),
    }))

    for (const doc of docs) {

        await myDAO.create(doc)

    }

    const result = await myDAO.find({})

    t.is(result.total, TOTAL_DOCS)
    t.deepEqual(result.info, {
        page: DEFAULT_PAGE_NUMBER,
        size: DEFAULT_PAGE_SIZE,
        query: {},
    })

})

test('MongoDAO#find should not find and count deleted documents', async t => {

    const TOTAL_DOCS = 100
    const NUMBER_TO_DELETE = 50
    const myDAO = new MongoDAO(`test_${chance.hash()}`)
    const docs = new Array(TOTAL_DOCS).fill(null).map((item, index) => ({
        number: index,
        name: chance.name(),
        email: chance.email(),
        gender: chance.pick([ 'MALE', 'FEMALE', '' ]),
    }))

    for (const doc of docs) {

        await myDAO.create(doc)

    }

    for (let i = 0; i < NUMBER_TO_DELETE; ++i) {

        const doc = docs[i]
        await myDAO.remove(doc._id)

    }

    const result = await myDAO.find({}, 5, 10)

    t.deepEqual(result, {
        items: [],
        total: TOTAL_DOCS - NUMBER_TO_DELETE,
        info: {
            page: 5,
            size: 10,
            query: {}
        }
    })

})

test('MongoDAO#find should paginate correctly', async t => {

    const TOTAL_DOCS = 100
    const PAGE = 2
    const SIZE = 8
    const myDAO = new MongoDAO(`test_${chance.hash()}`)
    const docs = new Array(TOTAL_DOCS).fill(null).map((item, index) => ({
        number: index,
        name: chance.name(),
        email: chance.email(),
        gender: chance.pick([ 'MALE', 'FEMALE', '' ]),
    }))

    for (const doc of docs) {

        await myDAO.create(doc)

    }

    const result = await myDAO.find({}, PAGE, SIZE)

    result.items.forEach((item, index) => t.is(item.number, PAGE * SIZE + index))
    t.deepEqual(result.info, { page: PAGE, size: SIZE, query: {} })
    t.is(result.total, TOTAL_DOCS)

    t.plan(2 + result.items.length)

})

test('MongoDAO#find should return items with string _id', async t => {

    const TOTAL_DOCS = 100
    const myDAO = new MongoDAO(`test_${chance.hash()}`)
    const docs = new Array(TOTAL_DOCS).fill(null).map(() => ({
        name: chance.name(),
        email: chance.email(),
    }))

    for (const doc of docs) {

        await myDAO.create(doc)

    }

    const result = await myDAO.find({})
    t.true(result.items.every(item => typeof item._id === 'string'))

})
