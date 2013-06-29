#!/usr/bin/env node

var transactions = module.exports = {};

/**
 * transactions.createTransaction:
 * @client: a postgres client to use
 * @transactionCallback: a callback to invoked for the transaction
 * @finalCallback: the callback to indicate the result state of the transaction
 *
 * Create a transaction and get ready to execute it.
 */
transactions.queueTransaction = function queueTransaction (client, transactionCallback, finalCallback) {
    var queries = [];
    var transaction = {};

    transaction.executeSql = function executeSql () {
        switch (arguments.length) {
        case 1: // executeSql(statement)
            return queries.push({
                statement: arguments[0],
                parameters: [],
                callback: null
            });
        case 2:
            switch (typeof arguments[1]) {
            case 'function': // executeSql(statement, callback)
                return queries.push({
                    statement: arguments[0],
                    parameters: [],
                    callback: arguments[1]
                });
            case 'object': // executeSql(statement, parameters)
                return queries.push({
                    statement: arguments[0],
                    parameters: arguments[1],
                    callback: null
                });
                break;
            default:
                throw new Error('executeSql() does not accept a second argument of type ' + typeof arguments[1]);
            }
        case 3: // executeSql(statement, parameters, callback)
            return queries.push({
                statement: arguments[0],
                parameters: arguments[1],
                callback: arguments[2]
            });
        default:
            throw new Error('executeSql() cannot be invoked with ' + arguments.length + ' argument(s).');
        }
    };

    var checkEndOfTransaction = function () {
        if (queries.length < 1) {
            return client.query("COMMIT TRANSACTION", function (error, result) {
                if (error) {
                    console.log('FIXME: document internError: ' + require('util').inspect(error));
                    throw error;
                }

                if (finalCallback) {
                    finalCallback(null);
                }
            });
        }

        var query = queries.shift();

        client.query(query.statement, query.parameters, function (error, resultSet) {
            var rollback = function (callback) {
                client.query("ROLLBACK TRANSACTION", function (internError, resultSet) {
                    if (internError) {
                        console.log('FIXME: document internError: ' + require('util').inspect(internError));
                    }

                    callback();
                });
            };

            if (error) {
                return rollback(function () {
                    try {
                        if (query.callback) {
                            query.callback(error, null);
                        }
                        finalCallback(error);
                    } catch (exception) {
                        finalCallback(exception);
                    }
                });
            }

            if (typeof query.callback === 'function') {
                try {
                    query.callback(null, resultSet);
                } catch (exception) {
                    return rollback(function () {
                        finalCallback(exception);
                    });
                }
            }

            checkEndOfTransaction();
        });
    };

    client.query("BEGIN TRANSACTION", function (error, result) {
        if (error) {
            return finalCallback(error);
        }

        try {
            transactionCallback(transaction);
        } catch (exception) {
            transaction = null;
            queries = null;
            return finalCallback(exception);
        }

        checkEndOfTransaction();
    });
};

// FIXME: add unit tests here

/* FIXME: make sure this test works
 * var exception = new Error("this is a test exception " + Math.random());
 * tx.queueTransaction(client, function (transaction) {
 *     throw exception;
 * }, function (error) {
 *     if (error !== exception) {
 *         throw new Error('The test failed.');
 *     }
 * });
 */

/* FIXME: make sure this test works
 * var exception = new Error("this is a test exception " + Math.random());
 * tx.queueTransaction(client, function (transaction) {
 *     transaction.executeSql('SELECT now() as "date"', function (error, resultSet) {
 *         throw exception;
 *     });
 * }, function (error) {
 *     if (error !== exception) {
 *         throw new Error('The test failed.');
 *     }
 * });
 */

/* FIXME: make sure this test throws an exception
 * tx.queueTransaction(client, function (transaction) {
 *     process.nextTick(function () {
 *         transaction.executeSql('SELECT now() AS "date"');
 *     });
 * }, function (error) {
 *     if (error) throw error;
 * });
 */

/* vim:set sw=4 et: */
