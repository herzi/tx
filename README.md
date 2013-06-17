# API Reference

## Module `tx`

The `tx` module brings a simple API to use database transactions.

This API is inspired by the old [Web SQL](http://www.w3.org/TR/webdatabase/) API.

### queueTransaction(client, transactionCallback, resultCallback)

* `client`: a node-pg client (usually acquired by `pg.connect()`)
* `transactionCallback`: a callback to run the transaction. The signature is `transactionCallback(transaction)`. `transaction` is a transaction object used to execute SQL statements.
* `resultCallback`: a callback to be invoked directly after committing or revoking the transaction. The signature is `resultCallback(error)`. If `error` is not `null` it is the error that triggered the rollback.

Queue a transaction for execution.

## Transaction

### executeSql(statement, parameters, callback)

* `statement`: The SQL statement to be executed.
* `parameters` (optional): Parameters for the SQL query.
* `callback` (optional): A callback to be invoked directly after executing the SQL statement. The signature is `callback(error, resultSet)`. `error` will be set if there was a problem. If the error is `null`, `resultSet` will contain the result of your query.

Queue the execution of `statement` with `parameters`. Invoke `callback` after the execution. You can use the callback to execute more SQL statements.

# Example

```
var pg = require('pg');
var tx = require('tx');

var connectionInfo = require('./connection-info.json');

pg.connect(connectionInfo, function (error, client) {
    if (error) {
        throw error;
    }
    
    tx.queueTransaction(client, function (transaction) {
        transaction.executeSql("CREATE TABLE \"myTable\" " +
                               "(id SERIAL PRIMARY KEY, name CHAR(255) NOT NULL)");
        transaction.executeSql("INSERT INTO \"myTable\" (name) VALUES ('some name')");
        transaction.executeSql("INSERT INTO \"myTable\" (name) VALUES ($1)", ['other name']);
        transaction.executeSql("INSERT INTO \"myTable\" (name) VALUES ('another name') RETURNING id", function (error, resultSet) {
            if (!error) {
            	console.log('insert result: %j', resultSet);
            }
        });
        transaction.executeSql("INSERT INTO \"myTable\" (name) VALUES ($1) RETURNING id", ['yet another name'], function (error, result) {
        	if (!error) {
        		console.log('insert result: %j', resultSet);
        	}
        });
    }, function (error) {
        if (error) {
            // the transaction failed and was rolled back
            throw error;
        }
        
        // the transaction passed
    });
});
```