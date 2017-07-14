import { AppiError } from 'appi'

export class AppiFSError extends AppiError {

    static INVALID_FILENAME = Symbol()
    static INVALID_EXTENSION = Symbol()
    static FILE_TOO_LARGE = Symbol()

}
