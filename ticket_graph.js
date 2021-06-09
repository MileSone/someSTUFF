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

let DBTABLE = 'F_FB_TICKET_ACP';

const typeDefs = `
type Ticket {  
FB_MONTH: Int, 
OLTP_ID: Int,
MSG_ORDER_NO: String,  
SELLING_DATE: String,        
SRC_TICKET_ID: Int,  
ACCT_ID : Int, 
ACCT_SCD_DATE: String,        
CUST_ID: String,   
FRONTEND_ID : Int, 
FRONTEND_SCD_DATE: String,         
SESSION_ID: String,  
CHANNEL_ID : String,   
ALLUP_FORMULA: String, 
IS_CTRL_ALLUP: Int,   
UNIT_BET : Float, 
INV: Float,
DIV: Float,
INV_REFUND: Float,
STAFF_NO: String, 
ACCT_TXN_NO: Int,   
SELLING_DTM: String,          
IS_TERMINATED: Int,   
IS_CANCELLED: Int,   
IS_CONCLUDED: String,   
TKT_CONCLUDED_DATE: String,        
IS_INTERCEPT: Int,   
IS_CROSS_SELLING: Int,   
IS_AUTO_ACCEPTED: Int,   
CREATE_META_JOB_ID: String,   
UPDATE_META_JOB_ID: String,   
CREATE_DATE: String,         
LAST_UPDATE_DATE: String 
}
type Query {
  ticketsInRange(range: Int): [Ticket],
  tickets(os: Int, rw: Int): [Ticket],
  ticket(id: Int): Ticket,
  ticketFilter(attribute: String,value: String,range: Int): [Ticket]
}`;


// input TicketEntry {
//     FB_MONTH: Int,
//         OLTP_ID: Int,
//         MSG_ORDER_NO: Int,
//         SELLING_DATE: String,
//         SRC_TICKET_ID: Int,
//         ACCT_ID : Int,
//         ACCT_SCD_DATE: String,
//         CUST_ID: Int,
//         FRONTEND_ID : Int,
//         FRONTEND_SCD_DATE: String,
//         SESSION_ID: Int,
//         CHANNEL_ID : Int,
//         ALLUP_FORMULA: String,
//         IS_CTRL_ALLUP: Int,
//         UNIT_BET : Float,
//         INV: Float,
//         DIV: Float,
//         INV_REFUND: Float,
//         STAFF_NO: String,
//         ACCT_TXN_NO: Int,
//         SELLING_DTM: String,
//         IS_TERMINATED: Int,
//         IS_CANCELLED: Int,
//         IS_CONCLUDED: Int,
//         TKT_CONCLUDED_DATE: String,
//         IS_INTERCEPT: Int,
//         IS_CROSS_SELLING: Int,
//         IS_AUTO_ACCEPTED: Int,
//         CREATE_META_JOB_ID: Int,
//         UPDATE_META_JOB_ID: Int,
//         CREATE_DATE: String,
//         LAST_UPDATE_DATE: String
// }
// type Mutation {
//     createTicketFuc(input: TicketEntry): Ticket,
//         updateTicketFuc(id: Int, input: TicketEntry): Ticket!,
//         deleteTicketFuc(id: Int): Ticket
// }

async function getAllTickets() {
    let sql = 'SELECT * FROM ' + DBTABLE;
    let conn = await oracledb.getConnection();
    let result = await conn.execute(sql);
    await conn.close();
    return jsonCoverter(result);
}

async function getTicketsByRange(range){
    let sql = 'SELECT * FROM ' + DBTABLE + ' where rownum <=' + range;
    let conn = await oracledb.getConnection();
    let result = await conn.execute(sql);
    await conn.close();
    return jsonCoverter(result);
}


async function getTicketByAttributeAndValueInRange(attr,value,range) {
    let sql = 'SELECT * FROM ' + DBTABLE + ' b WHERE b.'+ attr +' = :value AND ROWNUM <= ' + range;
    let binds = [value];
    let conn = await oracledb.getConnection();
    let result = await conn.execute(sql, binds);
    await conn.close();
    return jsonCoverter(result);
}

async function getTicketByID(id) {
    let sql = 'SELECT * FROM ' + DBTABLE + ' b WHERE b.src_ticket_id = :id';
    let binds = [id];
    let conn = await oracledb.getConnection();
    let result = await conn.execute(sql, binds);
    await conn.close();
    return jsonCoverter(result)[0];
}

async function createTicketHelper(input) {
    let sql = 'BEGIN SELECT Ticket_seq.nextval INTO :id FROM dual; END;';
    let conn = await oracledb.getConnection();
    let binds = {id: {dir: oracledb.BIND_OUT, type: oracledb.NUMBER}};
    let result = await conn.execute(sql, binds);
    const newTicket = {
        // Ticket_TYPE_ID: result.outBinds.id,
        // TYPE: input.TYPE,
        // Ticket_NATURE: input.Ticket_NATURE,
        // FULL_NAME: input.FULL_NAME,
        // SHORT_NAME: input.SHORT_NAME,
        // Ticket_TYPE: input.Ticket_TYPE,
        // IS_ENABLE: input.IS_ENABLE,
        // OUTPUT_SEQ: input.OUTPUT_SEQ,
        // ODDS_TYPE: input.ODDS_TYPE,
        // IS_EXOTIC: input.IS_EXOTIC,
        // REMARK: input.REMARK
    };
    const js = JSON.stringify(newTicket);
    sql = 'INSERT INTO '+ DBTABLE +' VALUES(:b)';
    binds = [js];
    result = await conn.execute(sql, binds, {autoCommit: true});
    await conn.close();
    return newTicket;
}

async function updateTicketHelper(id, input) {
    let sql = 'SELECT * FROM '+DBTABLE+' b WHERE b.Ticket_type_id = :id';
    let binds = [id];
    let conn = await oracledb.getConnection();
    let result = await conn.execute(sql, binds);
    let j = jsonCoverter(result.rows[0][0]);
    // j.Ticket_NATURE = input.Ticket_NATURE;
    // j.TYPE = input.TYPE;
    // j.FULL_NAME = input.FULL_NAME;
    // j.SHORT_NAME = input.SHORT_NAME;
    // j.Ticket_TYPE = input.Ticket_TYPE;
    // j.IS_ENABLE = input.IS_ENABLE;
    // j.OUTPUT_SEQ = input.OUTPUT_SEQ;
    // j.ODDS_TYPE = input.ODDS_TYPE;
    // j.IS_EXOTIC = input.IS_EXOTIC;
    // j.REMARK = input.REMARK;
    const js = JSON.stringify(j);
    sql = 'DELETE FROM '+DBTABLE+' b WHERE b.Ticket_type_id = :id';
    result = await conn.execute(sql, binds, {autoCommit: false});
    sql = 'INSERT INTO '+DBTABLE+' VALUES(:b)';
    binds = [js];
    result = await conn.execute(sql, binds, {autoCommit: true});
    await conn.close();
    return j;
}

async function deleteTicketHelper(id) {
    let sql = 'SELECT * FROM '+DBTABLE+' b WHERE b.Ticket_type_id = :id';
    let binds = [id];
    let conn = await oracledb.getConnection();
    var result = await conn.execute(sql, binds);
    var result = jsonCoverter(result);
    if (result.rows.length === 0)
        return null;
    let j = JSON.parse(result.rows[0][0]);
    sql = 'DELETE FROM '+DBTABLE+' b WHERE b.Ticket_type_id = :id';
    result = await conn.execute(sql, binds, {autoCommit: true});
    await conn.close();
    return j;
}

const resolvers = {
    Query: {
        // Tickets(root, args, context, info) {
        //     return getAllTickets();
        // },
        tickets(root, {os,rw}, context, info) {
            return getTicketsByOffset(os,rw)
        },
        ticketsInRange(root, {range}, context, info) {
            return getTicketsByRange(range)
        },
        ticket(root, {id}, context, info) {
            return getTicketByID(id);
        },
        ticketFilter(root, {attribute,value,range}, context, info) {
            return getTicketByAttributeAndValueInRange(attribute,value,range);
        }
    }
    // Mutation: {
    //     createTicketFuc(root, {input}, context, info) {
    //         return createTicketHelper(input);
    //     },
    //
    //     updateTicketFuc(root, {id, input}, context, info) {
    //         return updateTicketHelper(id, input);
    //     },
    //
    //     deleteTicketFuc(root, {id}, context, info) {
    //         return deleteTicketHelper(id);
    //     }
    // }
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
            var newObjString = com + '"' + metaData[index].name + '":"' + rows[count][index] + '"';
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

// Create a DB connection Ticket
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
