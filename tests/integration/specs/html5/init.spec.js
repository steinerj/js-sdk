import { expect } from 'chai';
import * as idb from 'idb';
import * as Kinvey from '__SDK__';
import * as utilities from '../utils';
import * as config from '../config';

const createdUserIds = [];

const defaultTimeout = 60000;
const defaultStorage = 'IndexedDB';
const defaultApiProtocol = 'https:';
const defaultApiHost = 'baas.kinvey.com';
const defaultApiHostname = 'https://baas.kinvey.com';
const defaultAuthProtocol = 'https:';
const defaultAuthHost = 'auth.kinvey.com';
const defaultAuthHostname = 'https://auth.kinvey.com';
const defaultMicProtocol = 'https:';
const defaultMicHost = 'auth.kinvey.com';
const defaultMicHostname = 'https://auth.kinvey.com';
const instanceId = 'testinstance';
const encryptionKey = 'key';
const collectionName = config.collectionName;
const testItem = { name: 'randomName' };

const setupOfflineProvider = (offlineProvider) => {
  const init = Kinvey.init({
    appKey: process.env.APP_KEY,
    appSecret: process.env.APP_SECRET,
    storage: offlineProvider,
    instanceId: process.env.INSTANCE_ID
  });
  expect(init.storage).to.equal(offlineProvider);
  return Kinvey.User.signup()
    .then((user) => { createdUserIds.push(user.data._id) })
    .catch((err) => { Promise.reject(err) });
}

const checkIndexedDB = async () => {
  const collection = Kinvey.DataStore.collection(collectionName, Kinvey.DataStoreType.Cache);
  const insertedItem = await collection.save(testItem);
  const dbPromise = idb.openDB(process.env.APP_KEY, 4);
  return dbPromise.then(db => {
    const tx = db.transaction(collectionName)
    const store = tx.objectStore(collectionName);
    const res = store.get(insertedItem._id);
    tx.complete;
    return res;
  })
    .then(obj => {
      expect(obj).to.deep.equal(insertedItem);
    })
    .catch((err) => Promise.reject(err));
};

const checkWebSQL = async () => {
  const collection = Kinvey.DataStore.collection(collectionName, Kinvey.DataStoreType.Cache);
  const insertedItem = await collection.save(testItem);
  const db = window.openDatabase(process.env.APP_KEY, 1, collectionName, 20000);
  db.transaction((tx) => {
    tx.executeSql(`SELECT * FROM ${collectionName} WHERE value LIKE '%${insertedItem._id}%'`, [], (tx, resultSet) => {
      expect(JSON.parse(resultSet.rows[0].value)).to.deep.equal(insertedItem);
    });
  });
};

const checkLocalStorage = async () => {
  const collection = Kinvey.DataStore.collection(collectionName, Kinvey.DataStoreType.Sync);
  const insertedItem = await collection.save(testItem);
  const items = window.localStorage.getItem(`${process.env.APP_KEY}.${collectionName}`);
  expect(JSON.parse(items)[0]).to.deep.equal(insertedItem);
};

const checkSessionStorage = async () => {
  const collection = Kinvey.DataStore.collection(collectionName, Kinvey.DataStoreType.Sync);
  const insertedItem = await collection.save(testItem);
  const items = window.sessionStorage.getItem(`${process.env.APP_KEY}.${collectionName}`);
  expect(JSON.parse(items)[0]).to.deep.equal(insertedItem);
};

describe('Init tests', () => {
  describe('Init()', () => {
    it('should throw error for missing appKey', (done) => {
      expect(() => {
        const init = Kinvey.init({
          appSecret: process.env.APP_SECRET
        });
      }).to.throw('No app key was provided to initialize the Kinvey JavaScript SDK.');
      done();
    });

    it('should throw error for missing appSecret or masterSecret', (done) => {
      expect(() => {
        const init = Kinvey.init({
          appKey: process.env.APP_KEY
        });
      }).to.throw('No app secret was provided to initialize the Kinvey JavaScript SDK.');
      done();
    });

    it('should initialize the SDK with the default properties', (done) => {
      const init = Kinvey.init({
        appKey: process.env.APP_KEY,
        appSecret: process.env.APP_SECRET
      });
      expect(init.appKey).to.equal(process.env.APP_KEY);
      expect(init.appSecret).to.equal(process.env.APP_SECRET);
      expect(init.defaultTimeout).to.equal(defaultTimeout);
      //expect(init.storage).to.equal(defaultStorage);
      expect(init.apiProtocol).to.equal(defaultApiProtocol);
      expect(init.apiHost).to.equal(defaultApiHost);
      expect(init.apiHostname).to.equal(defaultApiHostname);
      expect(init.authProtocol).to.equal(defaultAuthProtocol);
      expect(init.authHost).to.equal(defaultAuthHost);
      expect(init.authHostname).to.equal(defaultAuthHostname);
      expect(init.micProtocol).to.equal(defaultMicProtocol);
      expect(init.micHost).to.equal(defaultMicHost);
      expect(init.micHostname).to.equal(defaultMicHostname);
      done();
    });

    it('should set the optional properties', (done) => {
      const init = Kinvey.init({
        appKey: process.env.APP_KEY,
        appSecret: process.env.APP_SECRET,
        masterSecret: process.env.MASTER_SECRET,
        instanceId: instanceId,
        appVersion: '2',
        encryptionKey: encryptionKey,
        defaultTimeout: 20000,
        storage: Kinvey.StorageProvider.Memory
      });
      expect(init.masterSecret).to.equal(process.env.MASTER_SECRET);
      expect(init.apiProtocol).to.equal(defaultApiProtocol);
      expect(init.apiHost).to.equal(`${instanceId}-${defaultApiHost}`);
      expect(init.apiHostname).to.equal(`${defaultApiProtocol}//${instanceId}-${defaultApiHost}`);
      expect(init.authProtocol).to.equal(defaultAuthProtocol);
      expect(init.authHost).to.equal(`${instanceId}-${defaultAuthHost}`);
      expect(init.authHostname).to.equal(`${defaultAuthProtocol}//${instanceId}-${defaultAuthHost}`);
      expect(init.micProtocol).to.equal(defaultMicProtocol);
      expect(init.micHost).to.equal(`${instanceId}-${defaultMicHost}`);
      expect(init.micHostname).to.equal(`${defaultMicProtocol}//${instanceId}-${defaultMicHost}`);
      expect(init.appVersion).to.equal('2');
      expect(init.encryptionKey).to.equal(encryptionKey);
      expect(init.defaultTimeout).to.equal(20000);
      expect(init.storage).to.equal(Kinvey.StorageProvider.Memory);
      done();
    });
  });

  describe('ping()', () => {
    it('should return kinvey response', (done) => {
      const init = Kinvey.init({
        appKey: process.env.APP_KEY,
        appSecret: process.env.APP_SECRET,
        instanceId: process.env.INSTANCE_ID
      });
      Kinvey.ping()
        .then((res) => {
          expect(res.appName).to.not.equal(undefined);
          expect(res.environmentName).to.not.equal(undefined);
          expect(res.kinvey).to.contain('hello');
          expect(res.version).to.not.equal(undefined);
          done();
        })
        .catch((err) => {
          done(err);
        });
    });
  });

  describe('offline storage', () => {
    // after((done) => {
    //   utilities.cleanUpAppData(collectionName, createdUserIds)
    //     .then(() => done())
    //     .catch(done);
    // });

    it('should set IndexedDB as provider and use it to store data', async () => {
      try {
        await setupOfflineProvider(Kinvey.StorageProvider.IndexedDB);
        await checkIndexedDB();
      } catch (err) {
        throw new Error(err);
      }
    });

    it('should set WebSQL as provider and use it to store data', async () => {
      try {
        await setupOfflineProvider(Kinvey.StorageProvider.WebSQL);
        await checkWebSQL();
      } catch (err) {
        throw new Error(err);
      }
    });

    it('should set LocalStorage as provider and use it to store data', async () => {
      try {
        await setupOfflineProvider(Kinvey.StorageProvider.LocalStorage);
        await checkLocalStorage();
      } catch (err) {
        throw new Error(err);
      }
    });

    it('should set SessionStorage as provider and use it to store data', async () => {
      try {
        await setupOfflineProvider(Kinvey.StorageProvider.SessionStorage);
        await checkSessionStorage();
      } catch (err) {
        throw new Error(err);
      }
    });
  });
});
