const express = require('express');
const app=express();
const http = require('http');
const oracledb = require('oracledb');
const server = http.createServer(app);
const socketIO = require('socket.io');
const io = socketIO(server);
const { Client } = require('oracledb');
var port = process.env.PORT || 3000;


let dbConfig = {
    user: 'system',
    password: 'Oracle123',
    connectString: "(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.17.0.2)(PORT=1521))(CONNECT_DATA=(SERVICE_NAME=SEPDB)(SERVER=DEDICATED)(SID=prod1)))",
    events: true  // CQN needs events mode
  }

 process
  .on('SIGTERM', function() {
    console.log("\nTerminating");
    process.exit(0);
  })
  .on('SIGINT', function() {
    console.log("\nTerminating");
    process.exit(0);
  });

async function myCallback(message) {

  let result;
  let newObj;
  let student;
  let conn;
  let sql;

  
  console.log("Message type:", message.type);
  if (message.type == oracledb.SUBSCR_EVENT_TYPE_DEREG) {
    clearInterval(interval);
    console.log("Deregistration has taken place...");
    return;
  }
  console.log("Message database name:", message.dbName);
  console.log("Message transaction id:", message.txId);
  
  for (let i = 0; i < message.tables.length; i++) {
    const table = message.tables[i];
    console.log("--> Table Name:", table.name);
    // Note table.operation and row.operation are masks of
    // oracledb.CQN_OPCODE_* values
    console.log("--> Table Operation:", table.operation);
    if (table.rows) {
      for (let j = 0; j < table.rows.length; j++) {
        const row = table.rows[j];
        //result.push(row.rowid)
        console.log("--> --> Row Rowid:", row.rowid);
        console.log("--> --> Row Operation:", row.operation);
         
        switch(row.operation)   {              

        case 2:                    //Insert Operation
          
          conn = await oracledb.getConnection();
          sql = `select json_object(GANUM,GALEN) from C##COURSE20.SNAKES_COUNT_1000 where rowid='`+row.rowid+`'`;
          result = await conn.execute(sql);
          await conn.close();

          student = {
            status: 'INSERTED'
        }
          console.log("Inserted");
          
          const rowInserted = JSON.parse(result.rows[0][0]);
      
          newObj = Object.assign(rowInserted, student);
          console.log(newObj);
          io.emit('message', JSON.stringify(newObj));

        break;

        case 4:              //Update Operation

          conn = await oracledb.getConnection();
          sql = "select json_object(GANUM,GALEN) from C##COURSE20.SNAKES_COUNT_1000 where rowid='"+row.rowid+"'";
          result = await conn.execute(sql);
          await conn.close();

          console.log("Updated");
        

          student = {
            status: 'UPDATED'
        }
          const rowUpdated= JSON.parse(result.rows[0][0]);
          newObj = Object.assign(rowUpdated, student);
          console.log(newObj);
          io.emit('message', JSON.stringify(newObj));

      break;


      case 8:
         
          conn = await oracledb.getConnection();       //Deletion using Oracle Flashback Query
          sql=`SELECT json_object(GANUM,GALEN) FROM C##COURSE20.SNAKES_COUNT_1000 AS OF TIMESTAMP(SYSDATE - INTERVAL '1' SECOND)  where rowid='`+row.rowid+`'`;
          result = await conn.execute(sql);
          await conn.close();

          console.log("Deleted");

          student = {
            status: 'DELETED'
        }
          
          const rowDeleted = JSON.parse(result.rows[0][0]);
          newObj = Object.assign(rowDeleted, student);
          console.log(result.rows);
          io.emit('message', JSON.stringify(newObj));

        break;
      }
        console.log(Array(61).join("-"));
      }
    }
    console.log(Array(61).join("="));
  }
  
  
}

  async function startOracle() {
    let conn;
  
    try {
      await oracledb.createPool(dbConfig);
  
      conn = await oracledb.getConnection();
      await conn.subscribe('mysub', {

        callback: myCallback,
        sql:      "SELECT * FROM C##COURSE20.SNAKES_COUNT_1000",  // the table to watch
        
        qos : oracledb.SUBSCR_QOS_ROWIDS,  // SUBSCR_QOS_ROWIDS: Return ROWIDs in the notification message
        groupingValue : 10,

        groupingType  : oracledb.SUBSCR_GROUPING_TYPE_SUMMARY
      });
      console.log("CQN subscription created");
    } catch (err) {
      console.error(err);
    } finally {
      if (conn) {
        try {
          await conn.close();
        } catch (err) {
          console.error(err);
        }
      }
    }
  }

  io.on('connection', (socket) => {
    console.log('A user has been connected');
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
    
  });
  
  
    app.get('/', function(req, res){
      res.sendFile(__dirname + '/index.html');
    });

    server.listen(3000, () => {
        console.log('Server running on port 3000');
      })
      

      async function run() {
        await startOracle();
        
      }
      
  run();