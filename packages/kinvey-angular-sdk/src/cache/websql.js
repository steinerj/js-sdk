"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.find = find;
exports.count = count;
exports.findById = findById;
exports.save = save;
exports.removeById = removeById;
exports.clear = clear;
exports.clearAll = clearAll;

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));

var _isString = _interopRequireDefault(require("lodash/isString"));

var _kinvey = _interopRequireDefault(require("../errors/kinvey"));

var MASTER_TABLE_NAME = 'sqlite_master';
var SIZE = 2 * 1024 * 1024; // Database size in bytes

function execute(dbName, tableName, sqlQueries) {
  var write = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
  var escapedTableName = "\"".concat(tableName, "\"");
  var isMaster = tableName === MASTER_TABLE_NAME;
  return new Promise(function (resolve, reject) {
    try {
      var db = window.openDatabase(dbName, 1, 'Kinvey WebSQL', SIZE);
      var writeTxn = write || typeof db.readTransaction !== 'function';
      db[writeTxn ? 'transaction' : 'readTransaction'](function (tx) {
        new Promise(function (resolve) {
          if (write && !isMaster) {
            tx.executeSql("CREATE TABLE IF NOT EXISTS ".concat(escapedTableName, " (key BLOB PRIMARY KEY NOT NULL, value BLOB NOT NULL)"), [], function () {
              resolve();
            });
          } else {
            resolve();
          }
        }).then(function () {
          return Promise.all(sqlQueries.map(function (_ref) {
            var _ref2 = (0, _slicedToArray2.default)(_ref, 2),
                sqlQuery = _ref2[0],
                _ref2$ = _ref2[1],
                parameters = _ref2$ === void 0 ? [] : _ref2$;

            return new Promise(function (resolve) {
              tx.executeSql(sqlQuery.replace('#{table}', escapedTableName), parameters, function (_, resultSet) {
                var response = {
                  rowCount: resultSet.rows.length || resultSet.rowsAffected,
                  result: []
                };

                if (resultSet.rows.length > 0) {
                  for (var i = 0, len = resultSet.rows.length; i < len; i += 1) {
                    var _resultSet$rows$item = resultSet.rows.item(i),
                        value = _resultSet$rows$item.value;

                    try {
                      var doc = isMaster ? value : JSON.parse(value);
                      response.result.push(doc);
                    } catch (error) {
                      response.result.push(value);
                    }
                  }
                }

                resolve(response);
              });
            });
          }));
        }).then(function () {
          var responses = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
          return responses.reduce(function (_ref3, response) {
            var _ref3$rowCount = _ref3.rowCount,
                rowCount = _ref3$rowCount === void 0 ? 0 : _ref3$rowCount,
                _ref3$result = _ref3.result,
                result = _ref3$result === void 0 ? [] : _ref3$result;
            return {
              rowCount: rowCount + response.rowCount,
              result: result.concat(response.result)
            };
          }, {
            rowCount: 0,
            result: []
          });
        }).then(resolve).catch(reject);
      }, function (error) {
        var errorMessage = (0, _isString.default)(error) ? error : error.message;

        if (errorMessage && errorMessage.indexOf('no such table') === -1) {
          resolve({
            rowCount: 0,
            result: []
          });
        } else {
          var sql = 'SELECT name AS value from #{table} WHERE type = ? AND name = ?';
          var parameters = ['table', tableName];
          execute(dbName, MASTER_TABLE_NAME, [[sql, parameters]]).then(function (response) {
            if (response.result.length === 0) {
              return resolve({
                rowCount: 0,
                result: []
              });
            }

            return reject(new _kinvey.default("Unable to open a transaction for the ".concat(tableName, " collection on the ").concat(dbName, " WebSQL database.")));
          }).catch(reject);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

function find(_x, _x2) {
  return _find.apply(this, arguments);
}

function _find() {
  _find = (0, _asyncToGenerator2.default)(
  /*#__PURE__*/
  _regenerator.default.mark(function _callee(dbName, tableName) {
    var response;
    return _regenerator.default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return execute(dbName, tableName, [['SELECT value FROM #{table}']]);

          case 2:
            response = _context.sent;
            return _context.abrupt("return", response.result);

          case 4:
          case "end":
            return _context.stop();
        }
      }
    }, _callee, this);
  }));
  return _find.apply(this, arguments);
}

function count(_x3, _x4) {
  return _count.apply(this, arguments);
}

function _count() {
  _count = (0, _asyncToGenerator2.default)(
  /*#__PURE__*/
  _regenerator.default.mark(function _callee2(dbName, tableName) {
    var response;
    return _regenerator.default.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.next = 2;
            return execute(dbName, tableName, [['SELECT COUNT(*) AS value FROM #{table}']]);

          case 2:
            response = _context2.sent;
            return _context2.abrupt("return", response.result.shift() || 0);

          case 4:
          case "end":
            return _context2.stop();
        }
      }
    }, _callee2, this);
  }));
  return _count.apply(this, arguments);
}

function findById(_x5, _x6, _x7) {
  return _findById.apply(this, arguments);
}

function _findById() {
  _findById = (0, _asyncToGenerator2.default)(
  /*#__PURE__*/
  _regenerator.default.mark(function _callee3(dbName, tableName, id) {
    var response;
    return _regenerator.default.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            _context3.next = 2;
            return execute(dbName, tableName, [['SELECT value FROM #{table} WHERE key = ?', [id]]]);

          case 2:
            response = _context3.sent;
            return _context3.abrupt("return", response.result.shift());

          case 4:
          case "end":
            return _context3.stop();
        }
      }
    }, _callee3, this);
  }));
  return _findById.apply(this, arguments);
}

function save(_x8, _x9) {
  return _save.apply(this, arguments);
}

function _save() {
  _save = (0, _asyncToGenerator2.default)(
  /*#__PURE__*/
  _regenerator.default.mark(function _callee4(dbName, tableName) {
    var docs,
        sqlQueries,
        _args4 = arguments;
    return _regenerator.default.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            docs = _args4.length > 2 && _args4[2] !== undefined ? _args4[2] : [];
            sqlQueries = docs.map(function (doc) {
              return ['REPLACE INTO #{table} (key, value) VALUES (?, ?)', [doc._id, JSON.stringify(doc)]];
            });
            _context4.next = 4;
            return execute(dbName, tableName, sqlQueries, true);

          case 4:
            return _context4.abrupt("return", docs);

          case 5:
          case "end":
            return _context4.stop();
        }
      }
    }, _callee4, this);
  }));
  return _save.apply(this, arguments);
}

function removeById(_x10, _x11, _x12) {
  return _removeById.apply(this, arguments);
}

function _removeById() {
  _removeById = (0, _asyncToGenerator2.default)(
  /*#__PURE__*/
  _regenerator.default.mark(function _callee5(dbName, tableName, id) {
    var response;
    return _regenerator.default.wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            _context5.next = 2;
            return execute(dbName, tableName, [['DELETE FROM #{table} WHERE key = ?', [id]]], true);

          case 2:
            response = _context5.sent;
            return _context5.abrupt("return", response.rowCount);

          case 4:
          case "end":
            return _context5.stop();
        }
      }
    }, _callee5, this);
  }));
  return _removeById.apply(this, arguments);
}

function clear(_x13, _x14) {
  return _clear.apply(this, arguments);
}

function _clear() {
  _clear = (0, _asyncToGenerator2.default)(
  /*#__PURE__*/
  _regenerator.default.mark(function _callee6(dbName, tableName) {
    return _regenerator.default.wrap(function _callee6$(_context6) {
      while (1) {
        switch (_context6.prev = _context6.next) {
          case 0:
            _context6.next = 2;
            return execute(dbName, tableName, [['DROP TABLE IF EXISTS #{table}']], true);

          case 2:
            return _context6.abrupt("return", true);

          case 3:
          case "end":
            return _context6.stop();
        }
      }
    }, _callee6, this);
  }));
  return _clear.apply(this, arguments);
}

function clearAll(_x15) {
  return _clearAll.apply(this, arguments);
}

function _clearAll() {
  _clearAll = (0, _asyncToGenerator2.default)(
  /*#__PURE__*/
  _regenerator.default.mark(function _callee7(dbName) {
    var response, tables;
    return _regenerator.default.wrap(function _callee7$(_context7) {
      while (1) {
        switch (_context7.prev = _context7.next) {
          case 0:
            _context7.next = 2;
            return execute(dbName, MASTER_TABLE_NAME, [['SELECT name AS value FROM #{table} WHERE type = ? AND value NOT LIKE ?', ['table', '__Webkit%']]]);

          case 2:
            response = _context7.sent;
            tables = response.result;

            if (!(tables.length > 0)) {
              _context7.next = 7;
              break;
            }

            _context7.next = 7;
            return Promise.all(tables.map(function (tableName) {
              return execute(dbName, tableName, [['DROP TABLE IF EXISTS #{table}']], true);
            }));

          case 7:
            return _context7.abrupt("return", true);

          case 8:
          case "end":
            return _context7.stop();
        }
      }
    }, _callee7, this);
  }));
  return _clearAll.apply(this, arguments);
}