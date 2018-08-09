import { Observable } from 'rxjs';

/**
 * @private
 */
export function isPromiseLike(obj) {
  return !!obj && (typeof obj.then === 'function') && (typeof obj.catch === 'function');
}

/**
 * @private
 */
export function isObservable(obj) {
  return obj instanceof Observable;
}

export function wrapInObservable(promiseOrFunc, completeAfter = true) {
  const argIsPromise = isPromiseLike(promiseOrFunc);
  const stream = Observable.create((observer) => {
    let promise;

    if (isPromiseLike(promiseOrFunc)) {
      promise = promiseOrFunc;
    } else {
      const funcResult = promiseOrFunc(observer);
      promise
    }
  });
}
