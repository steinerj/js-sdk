import { expect } from 'chai';
import _ from 'lodash';
import * as Kinvey from '__SDK__';
import * as utilities from '../utils';

const createdUserIds = [];
const collectionName = process.env.COLLECTION_NAME || 'TestData';
var networkStore;
var appCredentials;

const checkLocalStorageForSubscriptionKey = () => {
  var hasSubscriptionKey = false;
  for (var key in localStorage) {
    if (key.indexOf('sub') !== -1) {
      hasSubscriptionKey = true;
    }
  }
  return hasSubscriptionKey;
};

describe.only('Live-services', () => {
  networkStore = Kinvey.DataStore.collection(collectionName, Kinvey.DataStoreType.Network);

  var messageCreated;
  var messageUpdated;

  const entity1 = utilities.getEntity(utilities.randomString());
  const entity2 = utilities.getEntity(utilities.randomString());
  const entity3 = utilities.getEntity(utilities.randomString());

  before(() => {
    const initProperties = {
      appKey: process.env.APP_KEY,
      appSecret: process.env.APP_SECRET,
      masterSecret: process.env.MASTER_SECRET
    };
    appCredentials = Kinvey.init(utilities.setOfflineProvider(initProperties, process.env.OFFLINE_STORAGE));
  });

  before(() => {
    return utilities.cleanUpAppData(collectionName, createdUserIds)
      .then(() => Kinvey.User.signup())
      .then((user) => createdUserIds.push(user.data._id));
  });

  before(() => {
    return networkStore.save(entity1)
      .then(() => networkStore.save(entity2));
  });

  afterEach(() => {
    const activeUser = Kinvey.User.getActiveUser();
    if (activeUser) {
      return activeUser.unregisterFromLiveService();
    }
  });

  it('should register user for live services', (done) => {
    const activeUser = Kinvey.User.getActiveUser();
    activeUser.registerForLiveService()
      .then((res) => {
        expect(res).to.equal(true);
        if (Kinvey.StorageProvider.Memory === undefined && Kinvey.StorageProvider.SQLite === undefined) {
          expect(checkLocalStorageForSubscriptionKey()).to.equal(true);
        }
        done();
      })
      .catch(done);
  });

  it('should subscribe user and receive messages for created items', (done) => {
    utilities.promiseTimeout(1000)
      .then(() => {
        const activeUser = Kinvey.User.getActiveUser();
        return activeUser.registerForLiveService()
      })
      .then((res) => {
        expect(res).to.equal(true);
        if (Kinvey.StorageProvider.Memory === undefined && Kinvey.StorageProvider.SQLite === undefined) {
          expect(checkLocalStorageForSubscriptionKey()).to.equal(true);
        }
      })
      .then(() => {
        return utilities.promiseTimeout(1000);
      })
      .then(() => {
        console.log('--------111111');
        console.log(new Date());
        return networkStore.subscribe({
          onMessage: (m) => {
            console.log('--------onmesssage');
            console.log(new Date());
            messageCreated = m;
          },
          onStatus: (s) => {
            throw new Error('This should not happen');
          },
          onError: (e) => {
            throw new Error(err);
          }
        });
      })
      .then(() => {
        console.log('--------222222');
        console.log(new Date());
        return networkStore.save(entity3);
      })
      .then(() => {
        return utilities.promiseTimeout(4000);
      })
      .then(() => {
        console.log('--------33333');
        console.log(new Date());
        expect(utilities.deleteEntityMetadata(messageCreated)).to.deep.equal(entity3);
        done();
      })
      .catch(done);
  });

  it('should subscribe user and receive messages for updated items', (done) => {
    const updatedEntity = Object.assign({}, entity1)
    updatedEntity.textField = 'updatedField';

    utilities.promiseTimeout(1000)
      .then(() => {
        const activeUser = Kinvey.User.getActiveUser();
        return activeUser.registerForLiveService()
      })
      .then((res) => {
        expect(res).to.equal(true);
        if (Kinvey.StorageProvider.Memory === undefined && Kinvey.StorageProvider.SQLite === undefined) {
          expect(checkLocalStorageForSubscriptionKey()).to.equal(true);
        }
      })
      .then(() => {
        return utilities.promiseTimeout(1000);
      })
      .then(() => {
        return networkStore.subscribe({
          onMessage: (m) => {
            messageUpdated = m;
          },
          onStatus: (s) => {
            throw new Error('This should not happen');
          },
          onError: (e) => {
            throw new Error(err);
          }
        });
      })
      .then(() => {
        return networkStore.save(updatedEntity);
      })
      .then(() => {
        return utilities.promiseTimeout(4000);
      })
      .then(() => {
        expect(utilities.deleteEntityMetadata(messageUpdated)).to.deep.equal(updatedEntity);
        done();
      })
      .catch(done);
  });
});
