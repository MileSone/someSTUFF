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


// let sampleData = {
//     metaData: [
//         { name: 'POOL_TYPE_ID' },
//         { name: 'POOL_NATURE' },
//         { name: 'TYPE' },
//         { name: 'FULL_NAME' },
//         { name: 'SHORT_NAME' },
//         { name: 'POOL_TYPE' },
//         { name: 'IS_ENABLE' },
//         { name: 'OUTPUT_SEQ' },
//         { name: 'ODDS_TYPE' },
//         { name: 'IS_EXOTIC' },
//         { name: 'REMARK' }
//     ],
//     rows: [
//         [
//             18,
//             null,
//             'Tournament',
//             'Champion',
//             'CHP',
//             'CHP',
//             1,
//             1,
//             'F',
//             0,
//             null
//         ],
//         [
//             5,
//             null,
//             'Match',
//             'Corner HiLo',
//             'CHLO',
//             'CHL',
//             1,
//             2,
//             'F',
//             0,
//             null
//         ]
//     ]
// }



const typeDefs = `
type Pool {
  POOL_TYPE_ID: Int,
  POOL_NATURE: String,
  TYPE: String,
  FULL_NAME: String,
  SHORT_NAME: String,
  POOL_TYPE: String,
  IS_ENABLE: Int,
  OUTPUT_SEQ: Int,
  ODDS_TYPE: String,
  IS_EXOTIC: Int,
  REMARK: String
}
type Query {
  pools: [Pool],
  pool(id: Int): Pool,
  poolN(fullname: String): Pool
}
input PoolEntry {
  POOL_NATURE: String,
  TYPE: String,
  FULL_NAME: String,
  SHORT_NAME: String,
  POOL_TYPE: String,
  IS_ENABLE: Int,
  OUTPUT_SEQ: Int,
  ODDS_TYPE: String,
  IS_EXOTIC: Int,
  REMARK: String
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
    // console.log("convertor");
    // console.log(jsonCoverter(result));
    return jsonCoverter(result);
}

async function getOnePoolByNameHelper(name) {
    let sql = 'SELECT * FROM POOL_TYPE_BACKUP b WHERE b.full_name = :name';
    let binds = [name];
    let conn = await oracledb.getConnection();
    let result = await conn.execute(sql, binds);
    await conn.close();
    return jsonCoverter(result)[0];
}

async function getOnePoolHelper(id) {
    let sql = 'SELECT * FROM POOL_TYPE_BACKUP b WHERE b.pool_type_id = :id';
    let binds = [id];
    let conn = await oracledb.getConnection();
    let result = await conn.execute(sql, binds);
    await conn.close();
    return jsonCoverter(result)[0];
}

async function createPoolHelper(input) {
    let sql = 'BEGIN SELECT pool_seq.nextval INTO :id FROM dual; END;';
    let conn = await oracledb.getConnection();
    let binds = {id: {dir: oracledb.BIND_OUT, type: oracledb.NUMBER}};
    let result = await conn.execute(sql, binds);
    const newPool = {
        POOL_TYPE_ID: result.outBinds.id,
        TYPE: input.TYPE,
        POOL_NATURE: input.POOL_NATURE,
        FULL_NAME: input.FULL_NAME,
        SHORT_NAME: input.SHORT_NAME,
        POOL_TYPE: input.POOL_TYPE,
        IS_ENABLE: input.IS_ENABLE,
        OUTPUT_SEQ: input.OUTPUT_SEQ,
        ODDS_TYPE: input.ODDS_TYPE,
        IS_EXOTIC: input.IS_EXOTIC,
        REMARK: input.REMARK
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
    let j = jsonCoverter(result.rows[0][0]);
    j.POOL_NATURE = input.POOL_NATURE;
    j.TYPE = input.TYPE;
    j.FULL_NAME = input.FULL_NAME;
    j.SHORT_NAME = input.SHORT_NAME;
    j.POOL_TYPE = input.POOL_TYPE;
    j.IS_ENABLE = input.IS_ENABLE;
    j.OUTPUT_SEQ = input.OUTPUT_SEQ;
    j.ODDS_TYPE = input.ODDS_TYPE;
    j.IS_EXOTIC = input.IS_EXOTIC;
    j.REMARK = input.REMARK;
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
    var result = await conn.execute(sql, binds);
    var result = jsonCoverter(result);
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
        },
        poolN(root, {fullname}, context, info) {
            return getOnePoolByNameHelper(fullname);
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
    rows = obj.rows;

    var newResult = [];
    rows.forEach(function (row, count) {
        var emptyObjString = '{';
        metaData.forEach(function (item, index) {
            var com = '';
            if (index !== 0) {
                com = ','
            }
            var newObjString = com + '"' + metaData[index].name + '":"' + rows[count][index] +'"';
            emptyObjString += newObjString;
            if (index == metaData.length - 1) {
                emptyObjString += '}';
                var newObj = JSON.parse(emptyObjString);
                newResult.push(newObj)
            }
        })
    })
    console.log(newResult.length);
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
