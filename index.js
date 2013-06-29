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
            if (error) {
                return client.query("ROLLBACK TRANSACTION", function (internError, resultSet) {
                    if (internError) {
                        console.log('FIXME: document internError: ' + require('util').inspect(internError));
                    }

                    try {
                        if (query.callback) {
                            query.callback(error, null);
                        }
                        return finalCallback(error);
                    } catch (exception) {
                        return finalCallback(exception);
                    }
                });
            }

            if (typeof query.callback === 'function') {
                query.callback(null, resultSet);
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

/* vim:set sw=4 et: */
