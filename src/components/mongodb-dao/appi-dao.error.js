import { AppiError } from 'appi'

export class AppiDAOError extends AppiError {

    static NOT_FOUND = Symbol()
    static DUPLICATE_KEY = Symbol()
    static INVALID_INDEX_FORMAT = Symbol()

}
