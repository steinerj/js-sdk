import { Middleware } from 'kinvey-javascript-rack';
import { KinveyError, NotFoundError } from '../../../../src/errors';
import MemoryCache from 'fast-memory-cache';
import Queue from 'promise-queue';
import regeneratorRuntime from 'regenerator-runtime'; // eslint-disable-line no-unused-vars
import map from 'lodash/map';
import reduce from 'lodash/reduce';
import keyBy from 'lodash/keyBy';
import forEach from 'lodash/forEach';
import values from 'lodash/values';
import find from 'lodash/find';
import isString from 'lodash/isString';
import isArray from 'lodash/isArray';
import isEmpty from 'lodash/isEmpty';
const idAttribute = process.env.KINVEY_ID_ATTRIBUTE || '_id';
const kmdAttribute = process.env.KINVEY_KMD_ATTRIBUTE || '_kmd';
Queue.configure(Promise);
const queue = new Queue(1, Infinity);
const dbCache = {};
const caches = [];

class Memory {
  constructor(name) {
    if (!name) {
      throw new KinveyError('A name for the collection is required to use the memory persistence adapter.', name);
    }

    if (!isString(name)) {
      throw new KinveyError('The name of the collection must be a string to use the memory persistence adapter', name);
    }

    this.name = name;
    this.cache = caches[name];

    if (!this.cache) {
      this.cache = new MemoryCache();
      caches[name] = this.cache;
    }
  }

  async find(collection) {
    const entities = this.cache.get(collection);

    if (entities) {
      return JSON.parse(entities);
    }

    return [];
  }

  async findById(collection, id) {
    const entities = await this.find(collection);
    const entity = find(entities, entity => entity[idAttribute] === id);

    if (!entity) {
      throw new NotFoundError(`An entity with _id = ${id} was not found in the ${collection}`
        + ` collection on the ${this.name} memory database.`);
    }

    return entity;
  }

  async save(collection, entities) {
    let singular = false;

    if (!isArray(entities)) {
      entities = [entities];
      singular = true;
    }

    if (entities.length === 0) {
      return entities;
    }

    let existingEntities = await this.find(collection);
    existingEntities = keyBy(existingEntities, idAttribute);
    entities = keyBy(entities, idAttribute);
    const entityIds = Object.keys(entities);

    forEach(entityIds, id => {
      existingEntities[id] = entities[id];
    });

    this.cache.set(collection, JSON.stringify(values(existingEntities)));

    entities = values(entities);
    return singular ? entities[0] : entities;
  }

  async removeById(collection, id) {
    let entities = await this.find(collection);
    entities = keyBy(entities, idAttribute);
    const entity = entities[id];

    if (!entity) {
      throw new NotFoundError(`An entity with _id = ${id} was not found in the ${collection}`
        + ` collection on the ${this.name} memory database.`);
    }

    delete entities[id];
    this.cache.set(collection, JSON.stringify(values(entities)));

    return entity;
  }

  async clear() {
    this.cache.clear();
    return null;
  }

  static isSupported() {
    return true;
  }
}

class DB {
  constructor(name) {
    if (!name) {
      throw new KinveyError('Unable to create a DB instance without a name.');
    }

    if (!isString(name)) {
      throw new KinveyError('The name is not a string. A name must be a string to create a DB instance.');
    }

    this.adapter = new Memory(name);
  }

  generateObjectId(length = 24) {
    const chars = 'abcdef0123456789';
    let objectId = '';

    for (let i = 0, j = chars.length; i < length; i++) {
      const pos = Math.floor(Math.random() * j);
      objectId += chars.substring(pos, pos + 1);
    }

    return objectId;
  }

  async find(collection) {
    try {
      const entities = await this.adapter.find(collection);

      if (!entities) {
        return [];
      }

      return entities;
    } catch (error) {
      if (error instanceof NotFoundError) {
        return [];
      }

      throw error;
    }
  }

  async findById(collection, id) {
    if (!isString(id)) {
      throw new KinveyError('id must be a string', id);
    }

    return this.adapter.findById(collection, id);
  }

  // async group(collection, aggregation) {
  //   const entities = await this.find(collection);

  //   if (!(aggregation instanceof Aggregation)) {
  //     aggregation = new Aggregation(result(aggregation, 'toJSON', aggregation));
  //   }

  //   if (entities.length > 0 && aggregation) {
  //     return aggregation.process(entities);
  //   }

  //   return null;
  // }

  save(collection, entities = []) {
    return queue.add(async () => {
      let singular = false;

      if (!entities) {
        return null;
      }

      if (!isArray(entities)) {
        singular = true;
        entities = [entities];
      }

      entities = map(entities, entity => {
        let id = entity[idAttribute];
        const kmd = entity[kmdAttribute] || {};

        if (!id) {
          id = this.generateObjectId();
          kmd.local = true;
        }

        entity[idAttribute] = id;
        entity[kmdAttribute] = kmd;
        return entity;
      });

      entities = await this.adapter.save(collection, entities);

      if (singular && entities.length > 0) {
        return entities[0];
      }

      return entities;
    });
  }

  async remove(collection, entities = []) {
    const responses = await Promise.all(entities.map(entity => this.removeById(collection, entity[idAttribute])));
    return reduce(responses, (entities, entity) => {
      entities.push(entity);
      return entities;
    }, []);
  }

  removeById(collection, id) {
    return queue.add(() => {
      if (!id) {
        return undefined;
      }

      if (!isString(id)) {
        throw new KinveyError('id must be a string', id);
      }

      return this.adapter.removeById(collection, id);
    });
  }

  clear() {
    return queue.add(() => this.adapter.clear());
  }
}

export class CacheMiddleware extends Middleware {
  constructor(name = 'Kinvey Cache Middleware') {
    super(name);
  }

  openDatabase(name) {
    if (!name) {
      throw new KinveyError('A name is required to open a database.');
    }

    let db = dbCache[name];

    if (!db) {
      db = new DB(name);
    }

    return db;
  }

  async handle(request) {
    const { method, body, appKey, collection, entityId } = request;
    const db = this.openDatabase(appKey);
    let data;

    if (method === 'GET') {
      if (entityId) {
        data = await db.findById(collection, entityId);
      } else {
        data = await db.find(collection);
      }
    } else if (method === 'POST' || method === 'PUT') {
      data = await db.save(collection, body);
    } else if (method === 'DELETE') {
      if (collection && entityId) {
        data = await db.removeById(collection, entityId);
      } else if (!collection) {
        data = await db.clear();
      } else {
        data = await db.remove(collection, body);
      }
    }

    const response = {
      statusCode: method === 'POST' ? 201 : 200,
      headers: {},
      data: data
    };

    if (!data || isEmpty(data)) {
      response.statusCode = 204;
    }

    return { response: response };
  }
}
