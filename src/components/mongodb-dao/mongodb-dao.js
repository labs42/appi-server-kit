import omit from 'lodash/omit'
import { ObjectID } from 'mongodb'
import { InternalError } from 'appi'
import { AppiDAOError } from './appi-dao.error'

/**
 * Default number of documents per page used by DAO.find method
 * @type {number}
 */
const DOCS_PER_PAGE_DEFAULT = 10

function mongodbDAO(deps) {

    const { mongoDB: db } = deps

    class MongoDAO {

        static REMOVED = '_removed'

        constructor(collectionName) {

            if (!collectionName || typeof collectionName !== 'string') {

                throw new TypeError('AppiDAO#constructor: "collectionName" should be a string and not be empty.')

            }

            Object.defineProperty(this, 'collectionName', {
                value: collectionName,
                writable: false,
            })

            this._collection = db.collection(collectionName)

        }

        /**
         * Ensures indexes on collection
         * @returns {Object}
         */
        async createIndexes() {

            const indexes = this.getIndexes()

            try {

                return await this._collection.createIndexes(indexes)

            } catch (err) {

                throw new InternalError()

            }

        }

        /**
         * Inserts new document into collection
         * Marks document with { _removed: false } property
         * @param {Object} document
         * @returns {Object} Inserted document with _id assigned
         */
        async create(document) {

            if (document._id !== undefined) {

                throw new TypeError('AppiDAO#create. Input document should not have { _id } property')

            }

            if (document[MongoDAO.REMOVED] !== undefined) {

                throw new TypeError(`AppiDAO#create. Input document should not have { ${MongoDAO.REMOVED} } property`)

            }

            const payload = Object.assign(document, { [MongoDAO.REMOVED]: false })

            try {

                await this._collection.insertOne(payload)

            } catch (err) {

                switch (err.code) {

                    case 11000:
                        throw new AppiDAOError('AppiDAO#create. Duplicate key conflict', AppiDAOError.DUPLICATE_KEY)

                    default:
                        throw new InternalError(err)

                }

            }

            payload._id = payload._id.toString()

            return omit(payload, MongoDAO.REMOVED)

        }

        /**
         * Updates existent document at collection
         * @param {string} id
         * @param {Object} document
         * @returns {Object} Updated version of the document
         */
        async update(id, document) {

            if (document._id !== undefined && document._id !== id) {

                throw new TypeError('AppiDAO#update. Input document should have same { _id } property as id argument')

            }

            if (document[MongoDAO.REMOVED] !== undefined) {

                throw new TypeError(`AppiDAO#update. Input document should not have { ${MongoDAO.REMOVED} } property`)

            }

            let result

            try {

                result = await this._collection.findOneAndUpdate({
                    _id: new ObjectID(id)
                }, {
                    $set: omit(document, '_id')
                }, {
                    returnOriginal: false
                })

            } catch (err) {

                switch (err.code) {

                    case 11000:
                        throw new AppiDAOError('AppiDAO#update. Duplicate key conflict', AppiDAOError.DUPLICATE_KEY)

                    default:
                        throw new InternalError(err)

                }

            }

            if (result.value === null) {

                const message = `AppiDAO#update. Document with { _id: ${id} } not found` +
                    ` at ${this.collectionName} collection`

                throw new AppiDAOError(message, AppiDAOError.NOT_FOUND)

            }

            return Object.assign(omit(result.value, MongoDAO.REMOVED), {
                _id: result.value._id.toString()
            })

        }

        /**
         * Marks document with { _removed: true } property
         * @param {string} id
         * @returns {void}
         */
        async remove(id) {

            let result

            try {

                result = await this._collection.findOneAndUpdate({
                    _id: new ObjectID(id)
                }, {
                    $set: { [MongoDAO.REMOVED]: true }
                }, {
                    returnOriginal: false
                })

            } catch (err) {

                throw new InternalError(err)

            }

            if (result.value === null) {

                const message = `AppiDAO#remove. Document with { _id: ${id} } not found` +
                    ` at ${this.collectionName} collection`

                throw new AppiDAOError(message, AppiDAOError.NOT_FOUND)

            }

        }

        /**
         * Finds one document by query
         * @param {Object} query
         * @returns {Object|null}
         */
        async findOne(query) {

            const safeConditions = Object.assign({}, query, { [MongoDAO.REMOVED]: false })

            if (safeConditions._id) {

                safeConditions._id = new ObjectID(safeConditions._id)

            }

            let doc

            try {

                [ doc ] = await this._collection
                    .find(safeConditions, { [MongoDAO.REMOVED]: 0 })
                    .limit(1)
                    .toArray()

            } catch (err) {

                throw new InternalError(err)

            }

            if (doc) {

                doc._id = doc._id.toString()

            }

            return doc || null

        }

        /**
         * Finds documents by conditions
         * @param {Object} query
         * @param {number} page Number of page
         * @param {number} size Number of documents per page
         * @returns {Object}
         */
        async find(query, page = 0, size = DOCS_PER_PAGE_DEFAULT) {

            const safeQuery = Object.assign({}, query, { [MongoDAO.REMOVED]: false })

            try {

                const cursor = await this._collection
                    .find(safeQuery, { [MongoDAO.REMOVED]: 0 })
                    .skip(page * size)
                    .limit(size)

                const items = await cursor.toArray()

                return {
                    items: items.map(item => Object.assign(item, { _id: item._id.toString() })),
                    total: await cursor.count(),
                    info: { page, size, query },
                }

            } catch (err) {

                throw new InternalError(err)

            }

        }

        /**
         * Walks down through inheritance chain and merges all indexes of descendant classes
         * @returns {Array<Object>} Array of index declarations
         * @private
         */
        getIndexes() {

            let indexes = []
            let currentClass = this.constructor

            while (currentClass !== MongoDAO) {

                if (currentClass.indexes) {

                    if (Array.isArray(currentClass.indexes)) {

                        indexes = indexes.concat(currentClass.indexes)

                    } else {

                        throw new AppiDAOError(
                            `${currentClass.name}.indexes should be an array of objects shaped like` +
                            ' { key: { propName: 1 }, name: "indexName", ... }',
                            AppiDAOError.INVALID_INDEX_FORMAT
                        )

                    }

                }

                currentClass = Object.getPrototypeOf(currentClass)

            }

            return indexes

        }

    }

    return MongoDAO

}

mongodbDAO.componentName = 'mongodbDAO'

export { mongodbDAO }