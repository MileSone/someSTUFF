/*

Christopher Jones, September 2020
https://blogs.oracle.com/opal/demo:-graphql-with-node-oracledb

Instructions:

    Install Node.js

    Install modules: npm install

    Review the node-oracledb installation requirements: https://oracle.github.io/node-oracledb/INSTALL.html
    You many need/want to add a call to init_oracle_client() to this file.

    Create the DB schema with setup.sql

    Set environment variables for the DB credentials

    Run this script: npm start

    Open a browser to http://localhost:3000/graphql

    In the GraphiQL pane try queries like:

      {
        blog(id: 2) {
          id
          title
          content
        }
      }

*/

const express = require('express');
const {graphqlHTTP} = require('express-graphql');
const graphqlTools = require('graphql-tools');
const oracledb = require("oracledb");
const dbConfig = require('./dbconfig.js');
const app = express();

var port = process.env.PORT || 3000;


oracledb.fetchAsString = [oracledb.CLOB];

const typeDefs = `
type Pool {
  pool_type_id: Int,
  pool_nature: String,
  type: String,
  full_name: String,
  short_name: String,
  pool_type: String,
  is_enable: Int,
  output_seq: Int,
  odds_type: String,
  is_exotic: Int,
  remark: String
}
type Query {
  pools: [Pool],
  pool(id: Int): Pool
}
input PoolEntry {
  pool_nature: String,
  type: String!,
  full_name: String!,
  short_name: String!,
  pool_type: String!,
  is_enable: Int!,
  output_seq: Int!,
  odds_type: String!,
  is_exotic: Int!,
  remark: String
}
type Mutation {
  createPool(input: PoolEntry): Pool!,
  updatePool(id: Int, input: PoolEntry): Pool!,
  deletePool(id: Int): Pool!
}`;

async function getAllPoolsHelper() {
    let sql = 'SELECT * FROM POOL_TYPE_BACKUP';
    let conn = await oracledb.getConnection();
    let result = await conn.execute(sql);
    await conn.close();
    console.log("convertor");
    console.log(jsonCoverter(result));
    return jsonCoverter(result);
}

async function getOnePoolHelper(id) {
    let sql = 'SELECT * FROM POOL_TYPE_BACKUP b WHERE b.pool_type_id = :id';
    let binds = [id];
    let conn = await oracledb.getConnection();
    let result = await conn.execute(sql, binds);
    await conn.close();
    return result.rows[0];
}

async function createPoolHelper(input) {
    let sql = 'BEGIN SELECT pool_seq.nextval INTO :id FROM dual; END;';
    let conn = await oracledb.getConnection();
    let binds = {id: {dir: oracledb.BIND_OUT, type: oracledb.NUMBER}};
    let result = await conn.execute(sql, binds);
    const newPool = {
        id: result.outBinds.id,
        type: input.type,
        pool_nature: input.pool_nature,
        full_name: input.full_name,
        short_name: input.short_name,
        pool_type: input.pool_type,
        is_enable: input.is_enable,
        output_seq: input.output_seq,
        odds_type: input.odds_type,
        is_exotic: input.is_exotic,
        remark: input.remark
    };
    const js = JSON.stringify(newPool);
    sql = 'INSERT INTO POOL_TYPE_BACKUP VALUES(:b)';
    binds = [js];
    result = await conn.execute(sql, binds, {autoCommit: true});
    await conn.close();
    return newPool;
}

async function updatePoolHelper(id, input) {
    let sql = 'SELECT * FROM POOL_TYPE_BACKUP b WHERE b.pool_type_id = :id';
    let binds = [id];
    let conn = await oracledb.getConnection();
    let result = await conn.execute(sql, binds);
    let j = JSON.parse(result.rows[0][0]);
    j.type = input.type;
    j.pool_nature = input.pool_nature;
    j.full_name = input.full_name;
    j.short_name = input.short_name;
    j.pool_type = input.pool_type;
    j.is_enable = input.is_enable;
    j.output_seq = input.output_seq;
    j.odds_type = input.odds_type;
    j.is_exotic = input.is_exotic;
    j.remark = input.remark;
    const js = JSON.stringify(j);
    sql = 'DELETE FROM POOL_TYPE_BACKUP b WHERE b.pool_type_id = :id';
    result = await conn.execute(sql, binds, {autoCommit: false});
    sql = 'INSERT INTO POOL_TYPE_BACKUP VALUES(:b)';
    binds = [js];
    result = await conn.execute(sql, binds, {autoCommit: true});
    await conn.close();
    return j;
}

async function deletePoolHelper(id) {
    let sql = 'SELECT * FROM POOL_TYPE_BACKUP b WHERE b.pool_type_id = :id';
    let binds = [id];
    let conn = await oracledb.getConnection();
    let result = await conn.execute(sql, binds);
    if (result.rows.length === 0)
        return null;
    let j = JSON.parse(result.rows[0][0]);
    sql = 'DELETE FROM POOL_TYPE_BACKUP b WHERE b.pool_type_id = :id';
    result = await conn.execute(sql, binds, {autoCommit: true});
    await conn.close();
    return j;
}

const resolvers = {
    Query: {
        pools(root, args, context, info) {
            return getAllPoolsHelper();
        },
        pool(root, {id}, context, info) {
            return getOnePoolHelper(id);
        }
    },
    Mutation: {
        createPool(root, {input}, context, info) {
            return createPoolHelper(input);
        },

        updatePool(root, {id, input}, context, info) {
            return updatePoolHelper(id, input);
        },

        deletePool(root, {id}, context, info) {
            return deletePoolHelper(id);
        }
    }
};

function jsonCoverter(obj) {
    var metaData, rows = [];
    metaData = obj.metaData;
    rows = obj.rows[0];


    rows.forEach(function (row, count) {
        var emptyObjString = '{';
        metaData.forEach(function (item, index) {
            var com = '';
            if (index !== 0) {
                com = ','
            }
            var newObjString = com + '"' + metaData[index].name + '":' + rows[index];
            emptyObjString += newObjString;
            if (index == metaData.length) {
                emptyObjString += '}';
            }
        })
        console.log(emptyObjString);
        var newObj = JSON.parse(emptyObjString);
        newResult.push(newObj)
    })


    return newResult;
}

// Build the schema with Type Definitions and Resolvers
const schema = graphqlTools.makeExecutableSchema({typeDefs, resolvers});

// Create a DB connection pool
async function startOracle() {
    try {
        await oracledb.createPool(dbConfig);
        console.log("Connection Pool created");
    } catch (err) {
        console.error(err);
    }
}

// Start the webserver
async function ws() {
    app.use('/graphql', graphqlHTTP({
        graphiql: true,
        schema
    }));

    app.listen(port, function () {
        console.log('Listening on http://localhost:' + port + '/graphql');
    });
}

// Do it
async function run() {
    await startOracle();
    await ws();
}

async function closePoolAndExit() {
    console.log("\nTerminating");
    try {
        await oracledb.getPool().close(0);
        console.log("Pool closed");
        process.exit(0);
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
}

process
    .once('SIGTERM', closePoolAndExit)
    .once('SIGINT', closePoolAndExit);
run();
