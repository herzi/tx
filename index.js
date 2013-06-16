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
        case 2: // executeSql(statement, ???)
            switch (typeof arguments[1]) {
            case 'function': // executeSql(statement, callback)
                return queries.push({
                    statement: arguments[0],
                    parameters: [],
                    callback: arguments[1]
                });
            default:
                throw new Error('FIXME: handle second argument of type ' + typeof arguments[1]);
            }
        default:
            throw new Error('FIXME: implement for ' + arguments.length + ' argument(s).');
        }
    };

    var checkEndOfTransaction = function () {
        if (queries.length < 1) {
            return client.query("COMMIT TRANSACTION", function (error, result) {
                if (error) {
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
                throw new Error('FIXME: handle error');
            }

            query.callback(null, resultSet);

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
            return finalCallback(exception);
        }

        checkEndOfTransaction();
    });
};

// FIXME: add unit tests here

/* vim:set sw=4 et: */
